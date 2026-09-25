import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, errorText } from '../lib/api.js';
import { useOptions } from '../lib/useOptions.js';
import { WEIGHT_LABELS, timeAgo } from '../lib/format.js';
import { ErrorBar, Field, Loading, Meter, Note, Page, PageHead, Split } from '../components/ui.jsx';
import ChipInput from '../components/ChipInput.jsx';

const DRAFT_KEY = 'archassist_draft_v1';
const DOMAINS = ['Health / clinic management', 'Education / LMS', 'E-commerce', 'Civic / government', 'Agriculture',
  'Finance / cooperative', 'Transportation / logistics', 'Tourism / hospitality', 'Research / thesis tool'];

const EMPTY = {
  title: '', description: '', domain: '', project_type: 'web', requirements: [],
  expected_users: 'small', team_size: 4, team_experience: 'beginner', timeline_weeks: 16, deployment: 'cloud',
  constraints: [], tech_preferences: '', qa: { security: 4, maintainability: 4, simplicity: 3 },
};

const STEPS = [
  { name: 'Input processing', detail: 'Normalising project characteristics, requirements and quality attributes into a structured query.' },
  { name: 'Knowledge retrieval (RAG)', detail: 'Querying the knowledge base for styles, patterns and tactics matching the query.' },
  { name: 'LLM recommendation', detail: 'Reasoning over retrieved context and the project profile; selecting and justifying an architecture.' },
];

const readDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { return null; } };
const writeDraft = (d) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* storage unavailable */ } };
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ } };

function toPayload(form) {
  return {
    title: form.title.trim(), description: form.description.trim(), domain: form.domain.trim() || null,
    project_type: form.project_type, functional_requirements: form.requirements,
    expected_users: form.expected_users, team_size: Number(form.team_size), team_experience: form.team_experience,
    timeline_weeks: Number(form.timeline_weeks), deployment: form.deployment,
    constraints: form.constraints.join('\n') || null, tech_preferences: form.tech_preferences.trim() || null,
    quality_attributes: Object.entries(form.qa).map(([attribute, priority]) => ({ attribute, priority })),
  };
}

function fromProject(p) {
  return {
    ...EMPTY, title: p.title, description: p.description, domain: p.domain ?? '', project_type: p.project_type,
    requirements: p.functional_requirements, expected_users: p.expected_users, team_size: p.team_size,
    team_experience: p.team_experience, timeline_weeks: p.timeline_weeks, deployment: p.deployment,
    constraints: (p.constraints ?? '').split('\n').map((c) => c.trim()).filter(Boolean),
    tech_preferences: p.tech_preferences ?? '',
    qa: Object.fromEntries(p.quality_attributes.filter((q) => q.priority > 0).map((q) => [q.attribute, q.priority])),
  };
}

// ---------------------------------------------------------------------------
// Step 1 — project profile
// ---------------------------------------------------------------------------
function ProfileStep({ form, setForm, options, onNext, savedAt, error }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <Page>
      <PageHead kicker="Step 1 of 3 · Project profile" title="Describe the project"
        aside="Everything here is structured into the query that drives retrieval." />
      {error && <div className="mt-5"><ErrorBar>{error}</ErrorBar></div>}
      <Split
        left={<>
          <Field label="Project title" className="mb-5">
            <input className="field text-[15px]" value={form.title} onChange={set('title')} placeholder="e.g. Campus clinic records system" />
          </Field>
          <div className="mb-5 grid gap-5 sm:grid-cols-2">
            <Field label="Domain">
              <input className="field" list="domains" value={form.domain} onChange={set('domain')} placeholder="Choose or type a domain" />
              <datalist id="domains">{DOMAINS.map((d) => <option key={d} value={d} />)}</datalist>
            </Field>
            <Field label="Delivery target">
              <select className="field" value={form.project_type} onChange={set('project_type')}>
                {options.project_types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Functional summary" className="mb-5"
            hint="Plain prose is fine — Archassist normalises it into a structured query. Mention roles, real-time needs, payments, devices, offline use…">
            <textarea className="field resize-y leading-normal" rows={5} value={form.description} onChange={set('description')}
              placeholder="What the system does, who uses it, and anything unusual about it." />
          </Field>
          <div className="mb-5 grid gap-5 sm:grid-cols-3">
            <Field label="Expected users">
              <select className="field" value={form.expected_users} onChange={set('expected_users')}>
                {options.expected_users.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Team size">
              <input className="field" type="number" min={1} max={50} value={form.team_size} onChange={set('team_size')} />
            </Field>
            <Field label="Timeline (weeks)">
              <input className="field" type="number" min={1} max={104} value={form.timeline_weeks} onChange={set('timeline_weeks')} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Team experience">
              <select className="field" value={form.team_experience} onChange={set('team_experience')}>
                {options.team_experience.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Deployment">
              <select className="field" value={form.deployment} onChange={set('deployment')}>
                {options.deployment.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Tech preferences">
              <input className="field" value={form.tech_preferences} onChange={set('tech_preferences')} placeholder="e.g. React, Laravel" />
            </Field>
          </div>
        </>}
        right={<>
          <span className="field-label mb-3">Known constraints</span>
          <div className="mb-6">
            <ChipInput values={form.constraints} onChange={(constraints) => setForm({ ...form, constraints })}
              addLabel="add constraint" placeholder="e.g. Single VPS host" />
          </div>
          <span className="field-label mb-3">Key requirements</span>
          <div className="mb-[26px]">
            <ChipInput values={form.requirements} onChange={(requirements) => setForm({ ...form, requirements })}
              addLabel="add requirement" placeholder="e.g. Appointment booking" />
          </div>
          <Note title="Why this matters">
            Team size, timeline and hosting constraints are weighed against every candidate style. A four-person,
            one-semester project is rarely served by a distributed architecture.
          </Note>
        </>}
      />
      <div className="flex items-center justify-between gap-4 pt-[22px]">
        <span className="text-xs text-muted-2">{savedAt ? `Draft saved ${timeAgo(savedAt).toLowerCase()}` : ''}</span>
        <button className="btn-primary px-5 py-3.5 text-sm" onClick={onNext}>Define quality attributes <span>→</span></button>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — quality attributes
// ---------------------------------------------------------------------------
function QualityStep({ form, setForm, options, onBack, onRun, error }) {
  const picked = options.quality_attributes.filter((q) => form.qa[q.key]);
  const available = options.quality_attributes.filter((q) => !form.qa[q.key]);
  const setQa = (key, value) => {
    const qa = { ...form.qa };
    if (value == null) delete qa[key]; else qa[key] = value;
    setForm({ ...form, qa });
  };

  return (
    <Page>
      <PageHead kicker="Step 2 of 3 · Quality attributes" title="What must hold true?"
        aside="Pick the attributes that matter, then set how hard each one presses on the design." />
      {error && <div className="mt-5"><ErrorBar>{error}</ErrorBar></div>}
      <Split ratio="side"
        left={<>
          <span className="field-label mb-3.5">Available attributes</span>
          <div className="flex flex-wrap gap-2">
            {available.map((q) => (
              <button key={q.key} type="button" onClick={() => setQa(q.key, 3)} title={q.description}
                className="inline-flex cursor-pointer items-center gap-2 border-2 border-ink bg-transparent px-3 py-[9px] text-[13px] leading-tight font-semibold text-ink hover:bg-ink hover:text-paper">
                {q.label} <span className="text-muted-2">+</span>
              </button>
            ))}
            {available.length === 0 && <span className="text-[13px] text-muted-2">All attributes selected.</span>}
          </div>
          <div className="mt-[26px]">
            <Note title="Scoring">
              Weights are relative, not absolute. Marking everything critical tells the recommender nothing — three to five
              drivers is the useful range.
            </Note>
          </div>
        </>}
        right={<>
          <div className="mb-3.5 flex items-baseline justify-between">
            <span className="eyebrow">Selected · {picked.length}</span>
            <span className="text-[11px] text-muted-2">drag the slider to weight</span>
          </div>
          {picked.map((q) => {
            const v = form.qa[q.key];
            return (
              <div key={q.key} className="rule-top py-3.5">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px] leading-tight font-extrabold">{q.label}</span>
                    <span className="bg-tint px-2 py-1 text-[10px] leading-tight font-semibold tracking-[.08em] uppercase text-tint-ink">{WEIGHT_LABELS[v]}</span>
                  </div>
                  <button type="button" aria-label={`Remove ${q.label}`} onClick={() => setQa(q.key, null)}
                    className="cursor-pointer border-0 bg-transparent p-1 text-base leading-none text-muted-2 hover:text-accent">×</button>
                </div>
                <div className="flex items-center gap-3.5">
                  <input type="range" min={1} max={5} step={1} value={v} aria-label={`${q.label} weight`}
                    onChange={(e) => setQa(q.key, Number(e.target.value))} className="h-[22px] flex-1" />
                  <span className="w-[34px] text-right text-[13px] leading-none font-extrabold">{v}/5</span>
                </div>
                <div className="mt-1.5 text-xs text-muted">{q.description}</div>
              </div>
            );
          })}
          {picked.length === 0 && (
            <div className="rule-top py-7 text-[13px] text-muted-2">Nothing selected yet — add at least one attribute from the left.</div>
          )}
        </>}
      />
      <div className="flex items-center justify-between gap-4 pt-[22px]">
        <button className="btn-outline px-5 py-3.5 text-sm" onClick={onBack}>← Back to profile</button>
        <button className="btn-primary px-5 py-3.5 text-sm" onClick={onRun} disabled={picked.length === 0}>Run analysis <span>→</span></button>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — analysing (runs the pipeline on the server)
// ---------------------------------------------------------------------------
function AnalyzingStep({ title, step, ticker }) {
  const progress = step >= 4 ? 100 : 8 + (step - 1) * 30;
  const num = 'flex h-11 w-11 shrink-0 items-center justify-center text-[15px] leading-none font-extrabold';
  return (
    <div className="flex flex-1 items-center px-4 pt-10 pb-20 md:px-7">
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="kicker mb-3">Step 3 of 3 · Analysing</div>
        <h1 className="display m-0 mb-1.5 text-[40px] leading-[1.06]">{title}</h1>
        <p className="m-0 mb-[30px] text-muted">Structuring the profile, retrieving architecture knowledge, reasoning over the result.</p>
        <div className="mb-7"><Meter pct={progress} /></div>
        {STEPS.map((s, i) => {
          const n = i + 1;
          const state = step > n ? 'done' : step === n ? 'running' : 'queued';
          return (
            <div key={s.name} className="rule-top grid grid-cols-[44px_minmax(0,1fr)] items-start gap-5 py-[18px] sm:grid-cols-[44px_minmax(0,1fr)_120px]">
              <span className={`${num} ${state === 'done' ? 'bg-accent text-white' : state === 'running' ? 'animate-pulse-num bg-ink text-paper' : 'border-2 border-rule text-muted-2'}`}>0{n}</span>
              <div>
                <div className="mb-0.5 text-[17px] leading-tight font-extrabold">{s.name}</div>
                <div className="text-[13px] text-muted">{s.detail}</div>
              </div>
              <span className={`col-start-2 text-[11px] leading-tight font-extrabold tracking-[.08em] uppercase sm:col-start-3 ${
                state === 'done' ? 'text-accent' : state === 'running' ? 'text-ink' : 'text-muted-2'}`}>
                {state === 'done' ? 'Done' : state === 'running' ? 'Running' : 'Queued'}
              </span>
            </div>
          );
        })}
        <div className="border-t-2 border-ink pt-4 text-xs text-muted-2" aria-live="polite">{ticker}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function ProjectForm() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const options = useOptions();
  const [form, setFormState] = useState(() => (id ? null : readDraft()?.form ?? EMPTY));
  const [savedAt, setSavedAt] = useState(() => (id ? null : readDraft()?.savedAt ?? null));
  const [error, setError] = useState('');
  const [run, setRun] = useState(null); // { step, ticker } while analysing
  const timer = useRef(null);
  const stage = params.get('step') === 'qa' ? 'qa' : 'profile';

  useEffect(() => {
    if (!id) return;
    api(`/projects/${id}`).then((p) => setFormState(fromProject(p))).catch((e) => setError(errorText(e)));
  }, [id]);
  useEffect(() => () => clearInterval(timer.current), []);

  const setForm = (next) => {
    setFormState(next);
    if (!id) {
      const now = new Date().toISOString();
      writeDraft({ form: next, savedAt: now });
      setSavedAt(now);
    }
  };
  const go = (s) => { setError(''); setParams(s === 'qa' ? { step: 'qa' } : {}); window.scrollTo(0, 0); };

  const toQa = () => {
    if (form.title.trim().length < 3) return setError('Give the project a title (at least 3 characters).');
    if (form.description.trim().length < 20) return setError('Describe what the system does in at least 20 characters.');
    go('qa');
  };

  const runAnalysis = async () => {
    const weighted = Object.keys(form.qa).length;
    setError('');
    setRun({ step: 1, ticker: `Building structured query from ${weighted} weighted quality attribute${weighted === 1 ? '' : 's'}…` });
    window.scrollTo(0, 0);
    const started = Date.now();
    timer.current = setInterval(() => setRun((r) => (r && r.step < 3 ? {
      step: r.step + 1,
      ticker: r.step + 1 === 2 ? 'Searching styles, patterns and tactics (vector + full-text)…' : 'Scoring candidates and drafting rationale… the LLM step can take up to a minute.',
    } : r)), 900);
    try {
      const payload = toPayload(form);
      const project = id
        ? await api(`/projects/${id}`, { method: 'PUT', body: payload })
        : await api('/projects', { method: 'POST', body: payload });
      const rec = await api(`/projects/${project.id}/recommend`, { method: 'POST' });
      const styles = rec.retrieved.entries.filter((e) => e.category === 'style').length;
      // Let the three stages play out briefly even when the server is fast.
      await new Promise((r) => setTimeout(r, Math.max(0, 2400 - (Date.now() - started))));
      clearInterval(timer.current);
      setRun({ step: 4, ticker: `Retrieved ${rec.retrieved.chunk_count} knowledge chunks across ${styles} candidate styles. Opening report…` });
      if (!id) clearDraft();
      setTimeout(() => navigate(`/reports/${rec.id}`), 500);
    } catch (e) {
      clearInterval(timer.current);
      setRun(null);
      setError(errorText(e));
    }
  };

  if (!options || !form) return error ? <Page><ErrorBar>{error}</ErrorBar></Page> : <Loading />;
  if (run) return <AnalyzingStep title={form.title} step={run.step} ticker={run.ticker} />;
  if (stage === 'qa') return <QualityStep form={form} setForm={setForm} options={options} error={error} onBack={() => go('profile')} onRun={runAnalysis} />;
  return <ProfileStep form={form} setForm={setForm} options={options} error={error} onNext={toQa} savedAt={savedAt} />;
}
