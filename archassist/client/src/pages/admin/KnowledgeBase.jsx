import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorText } from '../../lib/api.js';
import { useOptions, labelOf } from '../../lib/useOptions.js';
import { fmtDate } from '../../lib/format.js';
import { ErrorBar, Loading, Page, PageHead } from '../../components/ui.jsx';

const COLS = 'grid-cols-[minmax(0,1.9fr)_130px_minmax(0,1.5fr)_110px_80px]';
const TYPES = [['', 'All'], ['style', 'Styles'], ['pattern', 'Patterns'], ['tactic', 'Tactics'], ['reference', 'References']];

/** The attributes an entry supports best, e.g. "Maintainability, Security". */
function topAttributes(entry, options) {
  const qa = entry.attributes?.qa ?? {};
  const sorted = Object.entries(qa).sort((a, b) => b[1] - a[1]);
  const best = sorted.filter(([, v]) => v >= 4).slice(0, 3);
  return (best.length ? best : sorted.slice(0, 2)).map(([k]) => labelOf(options?.quality_attributes, k)).join(', ') || '—';
}

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const options = useOptions();
  const [entries, setEntries] = useState(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api('/knowledge').then(setEntries).catch((e) => setError(errorText(e))); }, []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (entries ?? []).filter((e) => (!type || e.category === type) && (!needle ||
      `${e.title} ${e.category} ${e.summary} ${e.tags.join(' ')} ${topAttributes(e, options)}`.toLowerCase().includes(needle)));
  }, [entries, q, type, options]);

  if (!entries) return error ? <Page><ErrorBar>{error}</ErrorBar></Page> : <Loading />;
  const cell = 'border-b border-rule-soft py-[15px]';

  return (
    <Page>
      <PageHead kicker="Knowledge base · D1" title={`${entries.length} entries`}
        actions={<>
          <input className="field w-full py-[11px] text-[13px] sm:w-[280px]" placeholder="Search styles, patterns, tactics"
            value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search knowledge base" />
          <Link to="/admin/knowledge/new" className="btn-primary px-4 py-3 no-underline">New entry</Link>
        </>} />
      <div className="flex flex-wrap gap-x-5 gap-y-2 py-3.5" role="tablist">
        {TYPES.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={type === k} onClick={() => setType(k)}
            className={`cursor-pointer border-0 border-b-2 bg-transparent px-0 pb-1 text-xs tracking-[.08em] uppercase ${
              type === k ? 'border-accent font-extrabold text-ink' : 'border-transparent font-semibold text-muted hover:text-ink'}`}>
            {label} <span className="text-muted-2">{k ? entries.filter((e) => e.category === k).length : entries.length}</span>
          </button>
        ))}
      </div>
      {error && <ErrorBar>{error}</ErrorBar>}
      <div className="overflow-x-auto">
        <div className={`grid min-w-[760px] border-y-2 border-ink ${COLS}`}>
          {['Entry', 'Type', 'Attributes', 'Updated', 'Edit'].map((h, i) => (
            <div key={h} className={`th border-b-2 border-rule py-2.5 ${i === 0 ? 'pr-3.5' : i === 4 ? 'pl-3.5' : 'px-3.5'}`}>{h}</div>
          ))}
          {rows.map((e) => [
            <div key={`${e.id}a`} className={`${cell} pr-3.5`}>
              <div className="mb-0.5 text-[15px] leading-tight font-extrabold">
                {e.title}{!e.is_active && <span className="ml-2 align-middle text-[10px] font-semibold tracking-[.08em] uppercase text-accent">Draft</span>}
              </div>
              <div className="text-xs text-muted-2">{e.chunk_count} chunks · {e.retrievals_30d} retrievals (30d)</div>
            </div>,
            <div key={`${e.id}b`} className={`${cell} px-3.5`}><span className="tag">{e.category}</span></div>,
            <div key={`${e.id}c`} className={`${cell} px-3.5 text-[13px] text-ink-2`}>{topAttributes(e, options)}</div>,
            <div key={`${e.id}d`} className={`${cell} px-3.5 text-[13px] text-muted`}>{fmtDate(e.updated_at)}</div>,
            <div key={`${e.id}e`} className={`${cell} pl-3.5`}><button className="btn-link" onClick={() => navigate(`/admin/knowledge/${e.id}`)}>Edit</button></div>,
          ])}
        </div>
      </div>
      <div className="pt-[18px] text-xs text-muted-2">
        Showing {rows.length} of {entries.length} entries{q || type ? ' · filtered' : ''}
      </div>
    </Page>
  );
}
