// Process 1 — Input processing / Analyze project profile.
// Turns the student's raw project details and quality attributes into a
// structured, normalized profile plus a retrieval query for the RAG step.
import { QA_KEYS, QA_LABEL, PROJECT_TYPES } from '../lib/domain.js';

// Keyword signals found in free text -> inferred characteristics.
const SIGNALS = [
  { re: /\breal[-\s]?time|live (update|tracking|feed)|websocket|streaming\b/i, signal: 'Real-time updates', qa: ['performance'], hints: ['event-driven', 'publish-subscribe'] },
  { re: /\bnotif(y|ication)s?|alerts?\b/i, signal: 'Notifications / alerts', qa: [], hints: ['event-driven', 'publish-subscribe'] },
  { re: /\bpayment|gcash|paymaya|billing|transaction|e-?wallet\b/i, signal: 'Handles payments or transactions', qa: ['security', 'availability'], hints: ['security tactics'] },
  { re: /\b(personal|sensitive|medical|health|student) (data|records|information)|privacy|data privacy act\b/i, signal: 'Stores sensitive personal data', qa: ['security'], hints: ['authentication', 'encryption'] },
  { re: /\blogin|role[s]?|admin|authenticat|authoriz\b/i, signal: 'Multiple user roles / authentication', qa: ['security'], hints: ['role-based access control'] },
  { re: /\bsensor|arduino|esp32|raspberry|microcontroller|iot|rfid|gps\b/i, signal: 'Hardware / IoT devices', qa: ['interoperability'], hints: ['iot layered architecture', 'publish-subscribe'] },
  { re: /\bmachine learning|\bml\b|\bai\b|predict|classif|recommend|chatbot|llm|nlp|computer vision\b/i, signal: 'AI / ML component', qa: ['performance'], hints: ['pipe-and-filter', 'model serving'] },
  { re: /\bapi|integrat|third[-\s]?party|external system|sms|email\b/i, signal: 'Integrates with external services', qa: ['interoperability'], hints: ['api gateway', 'adapter'] },
  { re: /\boffline|no internet|poor connectivity|rural\b/i, signal: 'Must work with limited connectivity', qa: ['availability'], hints: ['local-first', 'caching'] },
  { re: /\breport|dashboard|analytic|chart|statistic\b/i, signal: 'Reporting / analytics', qa: ['performance'], hints: ['cqrs', 'read models'] },
  { re: /\bplugin|extension|modular|add[-\s]?on|customi[sz]\b/i, signal: 'Needs extensibility', qa: ['maintainability'], hints: ['microkernel'] },
  { re: /\bupload|file|image|video|document\b/i, signal: 'File or media handling', qa: ['performance'], hints: ['object storage'] },
  { re: /\bmobile|android|ios|flutter|react native\b/i, signal: 'Mobile client', qa: [], hints: ['mvvm', 'backend for frontend'] },
  { re: /\bthousands|many users|high traffic|nationwide|campus-wide|concurrent\b/i, signal: 'High concurrency expected', qa: ['scalability', 'performance'], hints: ['load balancing', 'caching'] },
];

function scaleFromUsers(expectedUsers) {
  return { small: 1, medium: 2, large: 3 }[expectedUsers] ?? 1;
}

export function analyzeProject(project) {
  const text = [project.title, project.description, project.domain, ...(project.functional_requirements ?? []),
    project.constraints, project.tech_preferences].filter(Boolean).join('\n');

  // Explicit quality attribute priorities (0–5) from the student.
  const qa = Object.fromEntries(QA_KEYS.map((k) => [k, 0]));
  for (const row of project.quality_attributes ?? []) {
    if (row.attribute in qa) qa[row.attribute] = row.priority;
  }

  // Inferred signals from free text.
  const signals = [];
  const hints = new Set();
  const inferredQa = new Set();
  for (const s of SIGNALS) {
    if (s.re.test(text)) {
      signals.push(s.signal);
      s.hints.forEach((h) => hints.add(h));
      s.qa.forEach((q) => inferredQa.add(q));
    }
  }

  // Context-derived adjustments (explained, never silently override the student).
  const derived = [];
  const scale = scaleFromUsers(project.expected_users);
  if (scale === 3 && qa.scalability < 3) derived.push('Large expected user base: scalability should be considered even though it was ranked low.');
  if (project.team_experience === 'beginner' && qa.simplicity < 3) derived.push('Beginner team: development simplicity matters for delivering on time.');
  if (project.timeline_weeks <= 12 && qa.simplicity < 3) derived.push(`Short timeline (${project.timeline_weeks} weeks): favour architectures with low setup overhead.`);
  for (const q of inferredQa) {
    if (qa[q] === 0) derived.push(`${QA_LABEL[q]} was not rated, but the description suggests it is relevant.`);
  }

  // Effective weights used for scoring: student priority, with a floor for inferred needs.
  const weights = { ...qa };
  for (const q of inferredQa) weights[q] = Math.max(weights[q], 2);
  if (scale === 3) weights.scalability = Math.max(weights.scalability, 3);
  if (project.team_experience === 'beginner' || project.timeline_weeks <= 12) weights.simplicity = Math.max(weights.simplicity, 3);

  const rankedQa = Object.entries(qa)
    .filter(([, p]) => p > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, priority]) => ({ key, label: QA_LABEL[key], priority }));

  const projectTypeLabel = PROJECT_TYPES.find((t) => t.key === project.project_type)?.label ?? project.project_type;

  const summary =
    `${projectTypeLabel} "${project.title}"${project.domain ? ` in the ${project.domain} domain` : ''}, ` +
    `built by ${project.team_experience === "intermediate" ? "an" : "a"} ${project.team_experience} team of ${project.team_size} over ${project.timeline_weeks} weeks, ` +
    `for ${project.expected_users} scale, deployed ${project.deployment}. ` +
    (rankedQa.length ? `Top quality attributes: ${rankedQa.slice(0, 4).map((q) => `${q.label} (${q.priority}/5)`).join(', ')}.` : 'No quality attributes prioritised.');

  // Query text for retrieval: emphasise priorities and signals.
  const retrievalQuery = [
    `${projectTypeLabel} architecture for ${project.title}.`,
    project.description,
    (project.functional_requirements ?? []).join('. '),
    rankedQa.map((q) => `${q.label} `.repeat(Math.max(1, Math.ceil(q.priority / 2)))).join(' '),
    signals.join('. '),
    [...hints].join(', '),
    `team ${project.team_experience}`,
    project.deployment,
  ].filter(Boolean).join('\n');

  return {
    summary,
    project_type: project.project_type,
    project_type_label: projectTypeLabel,
    scale,
    team: { size: project.team_size, experience: project.team_experience, timeline_weeks: project.timeline_weeks },
    deployment: project.deployment,
    quality_attributes: qa,
    ranked_quality_attributes: rankedQa,
    weights,
    signals,
    hints: [...hints],
    derived_notes: derived,
    retrieval_query: retrievalQuery,
  };
}
