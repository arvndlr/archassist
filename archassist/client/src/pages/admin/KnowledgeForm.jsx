import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, errorText } from '../../lib/api.js';
import { useOptions } from '../../lib/useOptions.js';
import { ErrorBar, Field, Loading, Note, Page, PageHead, Split } from '../../components/ui.jsx';
import ChipInput from '../../components/ChipInput.jsx';

const EMPTY = {
  title: '', category: 'style', summary: '', content: '', tags: [], source: 'Bass, Clements & Kazman (2021)',
  qa: {}, complexity: 3, min_team: 1, project_types: [], structure: [], is_active: true,
};

function Row({ label, value, strong }) {
  return (
    <div className="flex justify-between border-t border-rule-soft py-3 first:border-t-2 first:border-rule">
      <span className="text-[13px]">{label}</span>
      <span className={`text-xs leading-snug font-extrabold ${strong ? 'text-accent' : ''}`}>{value}</span>
    </div>
  );
}

function QaChips({ qa, onChange, options }) {
  const [adding, setAdding] = useState(false);
  const remaining = options.quality_attributes.filter((q) => !(q.key in qa));
  return (
    <div className="flex flex-wrap gap-2">
      {options.quality_attributes.filter((q) => q.key in qa).map((q) => (
        <span key={q.key} className="chip-accent pr-1.5">
          {q.label}
          <select aria-label={`${q.label} rating`} value={qa[q.key]}
            onChange={(e) => onChange({ ...qa, [q.key]: Number(e.target.value) })}
            className="cursor-pointer border-0 bg-transparent p-0 text-xs font-extrabold text-tint-ink">
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
          </select>
          <button type="button" aria-label={`Remove ${q.label}`} className="cursor-pointer border-0 bg-transparent p-0 text-sm leading-none text-tint-ink/70 hover:text-accent"
            onClick={() => { const next = { ...qa }; delete next[q.key]; onChange(next); }}>×</button>
        </span>
      ))}
      {adding ? (
        <select autoFocus className="border-2 border-ink bg-field px-2 py-1 text-xs font-semibold" defaultValue=""
          onBlur={() => setAdding(false)}
          onChange={(e) => { if (e.target.value) onChange({ ...qa, [e.target.value]: 3 }); setAdding(false); }}>
          <option value="" disabled>Choose attribute…</option>
          {remaining.map((q) => <option key={q.key} value={q.key}>{q.label}</option>)}
        </select>
      ) : remaining.length > 0 && (
        <button type="button" className="chip-muted cursor-pointer hover:border-ink" onClick={() => setAdding(true)}>+ add attribute</button>
      )}
    </div>
  );
}

export default function KnowledgeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const options = useOptions();
  const [form, setForm] = useState(id ? null : EMPTY);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api(`/knowledge/${id}`).then((e) => {
      setForm({
        title: e.title, category: e.category, summary: e.summary, content: e.content, tags: e.tags, source: e.source ?? '',
        qa: e.attributes.qa ?? {}, complexity: e.attributes.complexity ?? 3, min_team: e.attributes.min_team ?? 1,
        project_types: e.attributes.project_types ?? [], structure: e.attributes.structure ?? [], is_active: e.is_active,
      });
      setMeta({ chunks: e.chunk_count, retrievals: e.retrievals_30d });
    }).catch((err) => setError(errorText(err)));
  }, [id]);

  if (!options || !form) return error ? <Page><ErrorBar>{error}</ErrorBar></Page> : <Loading />;

  const isStyle = form.category === 'style';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setStructure = (i, key, v) => setForm({ ...form, structure: form.structure.map((s, j) => (j === i ? { ...s, [key]: v } : s)) });

  const save = async (active) => {
    setBusy(true); setError('');
    const attributes = { qa: form.qa };
    if (isStyle) {
      Object.assign(attributes, {
        complexity: Number(form.complexity), min_team: Number(form.min_team), project_types: form.project_types,
        structure: form.structure.filter((s) => s.name.trim() && s.responsibility.trim()),
      });
    } else if (form.project_types.length) {
      attributes.project_types = form.project_types;
    }
    const body = {
      title: form.title, category: form.category, summary: form.summary, content: form.content, tags: form.tags,
      source: form.source || null, is_active: active, attributes,
    };
    try {
      await api(id ? `/knowledge/${id}` : '/knowledge', { method: id ? 'PUT' : 'POST', body });
      navigate('/admin/knowledge');
    } catch (err) { setError(errorText(err)); setBusy(false); window.scrollTo(0, 0); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${form.title}" from the knowledge base? Existing reports keep what they cited.`)) return;
    try { await api(`/knowledge/${id}`, { method: 'DELETE' }); navigate('/admin/knowledge'); } catch (err) { setError(errorText(err)); }
  };

  return (
    <Page>
      <PageHead kicker={id ? 'Knowledge base · Edit entry' : 'Knowledge base · New entry'} title={id ? form.title || 'Edit entry' : 'Add an entry'} />
      {error && <div className="mt-5"><ErrorBar>{error}</ErrorBar></div>}
      <Split
        left={<>
          <Field label="Name" className="mb-5"><input className="field text-[15px]" value={form.title} onChange={set('title')} /></Field>
          <div className="mb-5 grid gap-5 sm:grid-cols-2">
            <Field label="Type">
              <select className="field" value={form.category} onChange={set('category')}>
                <option value="style">Style</option><option value="pattern">Pattern</option>
                <option value="tactic">Tactic</option><option value="reference">Reference</option>
              </select>
            </Field>
            <Field label="Source"><input className="field" value={form.source} onChange={set('source')} /></Field>
          </div>
          <Field label="Summary" className="mb-5" hint="One or two sentences. Shown in reports and always part of the first retrieval chunk.">
            <textarea className="field resize-y leading-normal" rows={2} value={form.summary} onChange={set('summary')} />
          </Field>
          <Field label="Description" className="mb-5" hint="Separate paragraphs with a blank line — paragraphs are grouped into retrieval chunks.">
            <textarea className="field resize-y leading-normal" rows={9} value={form.content} onChange={set('content')} />
          </Field>
          <span className="field-label mb-2">Supported quality attributes {isStyle ? '(rating 1–5, used by the decision matrix)' : '(how much it improves each)'}</span>
          <div className="mb-5"><QaChips qa={form.qa} onChange={(qa) => setForm({ ...form, qa })} options={options} /></div>
          <span className="field-label mb-2">Tags</span>
          <ChipInput values={form.tags} onChange={(tags) => setForm({ ...form, tags })} addLabel="add tag" placeholder="e.g. real-time" />

          <div className="rule-top mt-7 pt-5">
            <span className="field-label mb-2">{isStyle ? 'Suitable project types' : 'Limit to project types (optional)'}</span>
            <div className="mb-5 flex flex-wrap gap-2">
              {options.project_types.map((t) => {
                const on = form.project_types.includes(t.key);
                return (
                  <button key={t.key} type="button" aria-pressed={on}
                    onClick={() => setForm({ ...form, project_types: on ? form.project_types.filter((x) => x !== t.key) : [...form.project_types, t.key] })}
                    className={`cursor-pointer border-2 border-ink px-3 py-2 text-xs font-semibold ${on ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-2'}`}>
                    {t.label}
                  </button>
                );
              })}
            </div>
            {isStyle && (
              <>
                <div className="mb-5 grid max-w-md grid-cols-2 gap-5">
                  <Field label="Complexity (1–5)"><input className="field" type="number" min={1} max={5} value={form.complexity} onChange={set('complexity')} /></Field>
                  <Field label="Min. team size"><input className="field" type="number" min={1} max={50} value={form.min_team} onChange={set('min_team')} /></Field>
                </div>
                <span className="field-label mb-2">High-level structure</span>
                {form.structure.map((s, i) => (
                  <div key={i} className="mb-2 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2">
                    <input className="field py-2" placeholder="Layer / component" value={s.name} onChange={(e) => setStructure(i, 'name', e.target.value)} />
                    <input className="field py-2" placeholder="Responsibility" value={s.responsibility} onChange={(e) => setStructure(i, 'responsibility', e.target.value)} />
                    <button type="button" aria-label="Remove component" className="cursor-pointer border-0 bg-transparent px-2 text-base text-muted-2 hover:text-accent"
                      onClick={() => setForm({ ...form, structure: form.structure.filter((_, j) => j !== i) })}>×</button>
                  </div>
                ))}
                <button type="button" className="chip-muted cursor-pointer hover:border-ink"
                  onClick={() => setForm({ ...form, structure: [...form.structure, { name: '', responsibility: '' }] })}>+ add component</button>
              </>
            )}
          </div>
        </>}
        right={<>
          <span className="field-label mb-3">Indexing</span>
          <div className="mb-4">
            <Row label="Embedding status" value="Re-index on save" strong />
            <Row label="Chunks" value={meta ? meta.chunks : '—'} />
            <Row label="Retrievals (30d)" value={meta ? meta.retrievals : '—'} />
            <Row label="Status" value={form.is_active ? 'Active' : 'Draft (not retrieved)'} />
          </div>
          <Note title="Retrieval note">
            Entries are chunked and embedded on save. Changes affect recommendations from the next analysis onward; existing
            reports keep the knowledge they cited. Drafts are stored but never retrieved.
          </Note>
        </>}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 pt-[22px]">
        <div className="flex gap-2.5">
          <button className="btn-outline" onClick={() => navigate('/admin/knowledge')}>Cancel</button>
          {id && <button className="btn-link px-3 font-normal text-muted-2 hover:text-accent" onClick={remove}>Delete entry</button>}
        </div>
        <div className="flex gap-2.5">
          <button className="btn-outline" disabled={busy} onClick={() => save(false)}>Save draft</button>
          <button className="btn-primary" disabled={busy} onClick={() => save(true)}>{busy ? 'Saving…' : 'Save & re-index'}</button>
        </div>
      </div>
    </Page>
  );
}
