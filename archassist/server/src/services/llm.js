// Process 3 — LLM-based recommendation.
// Pluggable providers:
//   * anthropic: Claude reasons over the profile, decision matrix and retrieved knowledge.
//   * offline:   deterministic report built from the decision matrix (no API key needed;
//                also used as an automatic fallback if the LLM call fails).
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { QUALITY_ATTRIBUTES } from '../lib/domain.js';

const QA_LABEL_ALL = QUALITY_ATTRIBUTES.map((q) => [q.key, q.label]);

export const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    recommended_architecture: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the recommended architecture style (may combine a style with key patterns, e.g. "Layered architecture with MVC").' },
        entry_id: { type: ['integer', 'null'], description: 'Knowledge base entry id of the primary style, if it exists in the context.' },
        summary: { type: 'string', description: 'Two to three sentence plain-language summary of the recommendation.' },
      },
      required: ['name', 'summary'],
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    rationale: { type: 'string', description: 'Why this architecture fits the project: tie it to the project characteristics, team, and top quality attributes. 1–3 paragraphs.' },
    quality_attribute_analysis: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          attribute: { type: 'string' },
          priority: { type: 'integer' },
          support: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
          explanation: { type: 'string' },
          tactics: { type: 'array', items: { type: 'string' }, description: 'Architectural tactics that help achieve this attribute.' },
        },
        required: ['attribute', 'support', 'explanation', 'tactics'],
      },
    },
    high_level_structure: {
      type: 'array',
      description: 'Main layers / components / services of the recommended architecture and their responsibilities. Descriptive only — no source code.',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, responsibility: { type: 'string' } },
        required: ['name', 'responsibility'],
      },
    },
    recommended_patterns: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, purpose: { type: 'string' } },
        required: ['name', 'purpose'],
      },
    },
    alternatives: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          reason_not_selected: { type: 'string' },
          when_to_reconsider: { type: 'string' },
        },
        required: ['name', 'reason_not_selected'],
      },
    },
    tradeoffs_and_risks: { type: 'array', items: { type: 'string' } },
    implementation_guidance: {
      type: 'array',
      items: { type: 'string' },
      description: 'Practical, non-code next steps (e.g. which diagrams to draw, how to split work among the team, technology categories to consider).',
    },
    references: {
      type: 'array',
      items: {
        type: 'object',
        properties: { entry_id: { type: 'integer' }, title: { type: 'string' } },
        required: ['entry_id', 'title'],
      },
      description: 'Knowledge base entries that support this recommendation.',
    },
  },
  required: ['recommended_architecture', 'confidence', 'rationale', 'quality_attribute_analysis',
    'high_level_structure', 'alternatives', 'tradeoffs_and_risks', 'implementation_guidance', 'references'],
};

const SYSTEM_PROMPT = `You are Archassist, a software architecture decision-support assistant for academic (student) software projects.

Your task: recommend the most appropriate software architecture for the student's project and justify it.

Rules:
- Ground your recommendation in the provided KNOWLEDGE BASE CONTEXT and DECISION MATRIX. Prefer styles, patterns, and tactics that appear in the context and cite them in "references" by their entry id.
- The decision matrix is a quantitative aid, not a verdict. You may choose a different candidate if the project details justify it, but explain why.
- Be realistic about student teams: consider team size, experience, and timeline. Avoid recommending complexity the team cannot deliver.
- Address every quality attribute the student prioritised (priority > 0).
- Do NOT write or include application source code, code snippets, configuration files, or pseudo-code. Describe structure and decisions in prose only.
- Write clearly for a student audience. Be specific to this project; avoid generic filler.
- In all prose fields, refer to knowledge entries by name, never by entry number; entry ids belong only in "entry_id" and "references".
- Keep it focused: rationale up to 3 short paragraphs, 3–4 alternatives, 3–6 risks, 3–6 next steps.
- Respond only by calling the submit_recommendation tool, and always fill every required field (including "references").`;

function formatContext(profile, matrix, retrieved) {
  const qa = profile.ranked_quality_attributes.map((q) => `- ${q.label}: ${q.priority}/5`).join('\n') || '- (none prioritised)';
  const candidates = matrix.candidates.slice(0, 6).map((c, i) =>
    `${i + 1}. [entry ${c.entry_id}] ${c.name} — score ${c.score}/100 (quality fit ${c.components.quality_fit}, complexity ${c.complexity} vs team capacity ${c.team_capacity}, type adj ${c.components.project_type_adjustment})`,
  ).join('\n');
  const knowledge = retrieved.entries.map((e) =>
    `### [entry ${e.id}] ${e.title} (${e.category}, relevance ${e.relevance})\n${e.summary}\n${e.chunks.map((c) => c.content).join('\n')}`,
  ).join('\n\n');

  return `PROJECT PROFILE
${profile.summary}

Quality attribute priorities (student-defined):
${qa}

Signals inferred from the description: ${profile.signals.join('; ') || 'none'}
Analyst notes: ${profile.derived_notes.join(' ') || 'none'}

DECISION MATRIX (top candidates)
Method: ${matrix.method}
${candidates}

KNOWLEDGE BASE CONTEXT (retrieved)
${knowledge}`;
}

function projectDetails(project) {
  return `PROJECT DETAILS (as submitted)
Title: ${project.title}
Type: ${project.project_type}
Domain: ${project.domain ?? '-'}
Description: ${project.description}
Functional requirements:
${(project.functional_requirements ?? []).map((r) => `- ${r}`).join('\n') || '- (none listed)'}
Expected users: ${project.expected_users}
Team: ${project.team_size} members, ${project.team_experience}; timeline ${project.timeline_weeks} weeks
Deployment: ${project.deployment}
Constraints: ${project.constraints || '-'}
Technology preferences: ${project.tech_preferences || '-'}`;
}

/**
 * Make sure an LLM report always has every field the UI relies on, even if the
 * model skipped an optional-looking one. Unknown/invalid references are dropped.
 */
export function normalizeReport(raw, retrieved) {
  const r = { ...raw };
  const arr = (v) => (Array.isArray(v) ? v : []);
  const known = new Map(retrieved.entries.map((e) => [e.id, e.title]));
  r.recommended_architecture = { name: 'Unnamed architecture', summary: '', ...(r.recommended_architecture ?? {}) };
  if (!known.has(r.recommended_architecture.entry_id)) r.recommended_architecture.entry_id = null;
  r.confidence = ['high', 'medium', 'low'].includes(r.confidence) ? r.confidence : 'medium';
  r.rationale = typeof r.rationale === 'string' ? r.rationale : '';
  for (const k of ['quality_attribute_analysis', 'high_level_structure', 'recommended_patterns', 'alternatives',
    'tradeoffs_and_risks', 'implementation_guidance']) r[k] = arr(r[k]);
  r.quality_attribute_analysis = r.quality_attribute_analysis.map((q) => ({ tactics: [], support: 'moderate', explanation: '', ...q, tactics: arr(q.tactics) }));
  r.references = arr(r.references).filter((ref) => known.has(ref.entry_id));
  if (r.references.length === 0) {
    r.references = retrieved.entries.slice(0, 6).map((e) => ({ entry_id: e.id, title: e.title }));
  }
  return r;
}

async function anthropicRecommend({ project, profile, matrix, retrieved }) {
  const client = new Anthropic({ apiKey: config.llm.anthropicApiKey });
  const response = await client.messages.create({
    model: config.llm.anthropicModel,
    max_tokens: config.llm.maxTokens,
    system: SYSTEM_PROMPT,
    tools: [{
      name: 'submit_recommendation',
      description: 'Submit the final architecture recommendation report.',
      input_schema: REPORT_SCHEMA,
    }],
    tool_choice: { type: 'tool', name: 'submit_recommendation' },
    messages: [{
      role: 'user',
      content: `${projectDetails(project)}\n\n${formatContext(profile, matrix, retrieved)}\n\nRecommend an architecture for this project.`,
    }],
  });
  if (response.stop_reason === 'max_tokens') {
    throw new Error(`LLM output was cut off at ${config.llm.maxTokens} tokens; raise LLM_MAX_TOKENS`);
  }
  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('LLM did not return a structured recommendation');
  return { report: normalizeReport(toolUse.input, retrieved), model: response.model, usage: response.usage };
}

// ---------------------------------------------------------------------------
// Offline provider (deterministic, template-based)
// ---------------------------------------------------------------------------
function supportLevel(rating) {
  if (rating >= 4) return 'strong';
  if (rating >= 3) return 'moderate';
  return 'weak';
}

function offlineRecommend({ profile, matrix, retrieved }) {
  const [top, ...rest] = matrix.candidates;
  if (!top) throw new Error('The knowledge base has no architecture styles to recommend from.');
  const styleEntry = retrieved.entries.find((e) => e.id === top.entry_id);
  const structure = styleEntry?.attributes?.structure ?? [];
  const tactics = retrieved.entries.filter((e) => e.category === 'tactic');
  const patterns = retrieved.entries.filter((e) => e.category === 'pattern');
  const gap = top.score - (rest[0]?.score ?? 0);

  const qaAnalysis = profile.ranked_quality_attributes.map((q) => {
    const rating = top.breakdown.find((b) => b.attribute === q.key)?.rating ?? 3;
    const related = [...tactics, ...patterns]
      .map((t) => ({ title: t.title, r: t.attributes?.qa?.[q.key] ?? 0 }))
      .filter((t) => t.r >= 3)
      .sort((a, b) => b.r - a.r)
      .map((t) => t.title);
    return {
      attribute: q.label,
      priority: q.priority,
      support: supportLevel(rating),
      explanation: `${top.name} is rated ${rating}/5 for ${q.label.toLowerCase()} in the knowledge base.`,
      tactics: related.slice(0, 3),
    };
  });

  return {
    report: {
      recommended_architecture: { name: top.name, entry_id: top.entry_id, summary: top.summary },
      confidence: gap >= 8 ? 'high' : gap >= 3 ? 'medium' : 'low',
      rationale:
        `${top.name} scored highest in the decision matrix (${top.score}/100). ` +
        `Its quality-attribute fit is ${top.components.quality_fit}/100 against your priorities ` +
        `(${profile.ranked_quality_attributes.slice(0, 3).map((q) => q.label).join(', ') || 'none specified'}), ` +
        `and its complexity (${top.complexity}/5) ${top.complexity <= top.team_capacity ? 'is within' : 'exceeds'} ` +
        `the estimated capacity of your team (${top.team_capacity}/5).` +
        (profile.derived_notes.length ? `\n\nNotes from the analysis: ${profile.derived_notes.join(' ')}` : '') +
        '\n\nThis report was generated in offline mode from the decision matrix. Configure an LLM provider for a richer, project-specific rationale.',
      quality_attribute_analysis: qaAnalysis,
      high_level_structure: structure,
      recommended_patterns: patterns
        .map((p) => {
          const qaMatch = Math.max(0, ...profile.ranked_quality_attributes.slice(0, 3)
            .map((q) => (p.attributes?.qa?.[q.key] ?? 0) >= 4 ? 1 : 0));
          return { p, score: p.relevance + 0.3 * qaMatch };
        })
        .filter((x) => x.score >= 0.75)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ p }) => ({ name: p.title, purpose: p.summary })),
      alternatives: rest.slice(0, 3).map((c) => {
        // Attributes where this alternative beats the recommendation.
        const better = c.breakdown
          .map((b) => ({ ...b, diff: b.rating - (top.breakdown.find((t) => t.attribute === b.attribute)?.rating ?? 3) }))
          .filter((b) => b.diff > 0)
          .sort((a, b) => b.diff - a.diff);
        const unrated = QA_LABEL_ALL.filter(([k]) => (c.qa?.[k] ?? 0) > (top.qa?.[k] ?? 0) && !c.breakdown.some((b) => b.attribute === k));
        const levers = better.length ? better.map((b) => b.label.toLowerCase()) : unrated.map(([, l]) => l.toLowerCase());
        return {
          name: c.name,
          reason_not_selected: `Scored ${c.score}/100 vs ${top.score} (quality fit ${c.components.quality_fit}, complexity ${c.complexity}/5${c.complexity > top.team_capacity ? ', above your team\'s capacity' : ''}).`,
          when_to_reconsider: levers.length
            ? `${levers.slice(0, 2).join(' or ').replace(/^./, (ch) => ch.toUpperCase())} becomes a higher priority than it is now.`
            : c.complexity > top.complexity ? 'The team grows or gains experience with this style.' : 'Your priorities change substantially.',
        };
      }),
      tradeoffs_and_risks: [
        ...top.breakdown.filter((b) => b.rating <= 3 && b.weight >= 3)
          .map((b) => `${b.label} (priority ${b.weight}/5) is only ${b.rating <= 2 ? 'weakly' : 'moderately'} supported by ${top.name} (${b.rating}/5); apply the tactics listed above.`),
        ...(top.complexity > top.team_capacity
          ? [`The style's complexity (${top.complexity}/5) exceeds the estimated team capacity (${top.team_capacity}/5); plan extra time for learning and integration.`]
          : []),
        ...profile.derived_notes,
      ],
      implementation_guidance: [
        'Draw a component or layer diagram of the recommended structure and validate it with your adviser.',
        'Map each functional requirement to the component responsible for it.',
        'Record key architecture decisions (ADRs) with their rationale and trade-offs.',
      ],
      references: retrieved.entries.slice(0, 6).map((e) => ({ entry_id: e.id, title: e.title })),
    },
    model: 'decision-matrix-v1',
  };
}

export function activeProvider() {
  const p = config.llm.provider;
  if (p === 'anthropic' || (p === 'auto' && config.llm.anthropicApiKey)) return 'anthropic';
  return 'offline';
}

export async function generateRecommendation(input) {
  const provider = activeProvider();
  if (provider === 'anthropic') {
    try {
      const out = await anthropicRecommend(input);
      return { ...out, provider: 'anthropic' };
    } catch (err) {
      console.error('LLM recommendation failed, falling back to offline mode:', err.message);
      const out = offlineRecommend(input);
      return { ...out, provider: 'offline', fallback_error: err.message };
    }
  }
  return { ...offlineRecommend(input), provider: 'offline' };
}

