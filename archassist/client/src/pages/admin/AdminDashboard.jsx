import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../../lib/api.js';
import { timeAgo } from '../../lib/format.js';
import { ErrorBar, Loading, Page, PageHead } from '../../components/ui.jsx';

function Stat({ label, value, note, accent, className }) {
  return (
    <div className={`py-6 ${className}`}>
      <div className="mb-2.5 text-[11px] leading-none tracking-[.1em] uppercase text-muted">{label}</div>
      <div className={`display text-[40px] leading-none tracking-[-.03em] ${accent ? 'text-accent' : ''}`}>{value}</div>
      <div className="mt-2.5 text-xs text-muted">{note}</div>
    </div>
  );
}

function activityText(a) {
  switch (a.kind) {
    case 'recommendation': return <>{a.actor} ran “{a.subject}” → <b className="font-semibold">{a.detail}</b></>;
    case 'kb_created': return <>New entry “{a.subject}” added — {a.detail} chunks indexed</>;
    default: return <>Entry “{a.subject}” updated — re-indexed {a.detail} chunks</>;
  }
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([api('/admin/overview'), api('/health')])
    .then(([d, h]) => { setData(d); setHealth(h); }).catch((e) => setError(errorText(e)));
  useEffect(() => { load(); }, []);

  const reindex = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await api('/knowledge/reindex', { method: 'POST' });
      setMsg(`Re-indexed ${r.entries} entries into ${r.chunks} chunks.`);
      await load();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  if (!data) return error ? <Page><ErrorBar>{error}</ErrorBar></Page> : <Loading />;
  const delta = data.recommendations_30d - data.recommendations_prev_30d;
  const max = Math.max(1, ...data.most_retrieved.map((m) => m.count));

  return (
    <Page>
      <PageHead kicker="Admin · last 30 days" title="System health" />
      {error && <div className="mt-4"><ErrorBar>{error}</ErrorBar></div>}
      <div className="grid grid-cols-2 border-b-2 border-ink md:grid-cols-4">
        <Stat label="Recommendations" value={data.recommendations_30d}
          note={`${delta >= 0 ? '+' : ''}${delta} vs previous 30 days`} className="border-r-2 border-rule pr-5" />
        <Stat label="Avg confidence" value={data.avg_confidence != null ? `${data.avg_confidence}%` : '—'}
          note="Target ≥ 75%" className="px-5 md:border-r-2 md:border-rule" />
        <Stat label="KB entries" value={data.knowledge.entries}
          note={`${data.kb_edited_this_month} edited this month`} className="border-t-2 border-r-2 border-rule pr-5 md:border-t-0 md:px-5" />
        <Stat label="Empty retrievals" value={data.empty_retrievals} accent={data.empty_retrievals > 0}
          note="Knowledge gaps to fill" className="border-t-2 border-rule pl-5 md:border-t-0" />
      </div>

      <div className="grid border-b-2 border-ink md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="py-7 md:border-r-2 md:border-rule md:pr-8">
          <div className="eyebrow mb-[18px]">Most retrieved entries</div>
          {data.most_retrieved.every((m) => m.count === 0) && <p className="m-0 text-[13px] text-muted-2">No retrievals in the last 30 days.</p>}
          <div className="flex flex-col gap-3.5">
            {data.most_retrieved.filter((m) => m.count > 0).map((m, i) => (
              <div key={m.id}>
                <div className="mb-[5px] flex justify-between text-[13px]">
                  <Link to={`/admin/knowledge/${m.id}`} className="font-semibold text-ink no-underline hover:text-accent">{m.title}</Link>
                  <span className="text-muted">{m.count}</span>
                </div>
                <div className="h-3.5 bg-paper-2"><div className={`h-full ${i < 2 ? 'bg-accent' : 'bg-ink'}`} style={{ width: `${(m.count / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-xs text-muted">
            {data.students} students · {data.projects} projects · LLM: <b>{health.llm_provider}</b> ({health.llm_model}) · Embeddings: {health.embedding_model}
            {data.knowledge.stale_chunks > 0 && <span className="text-accent"> · {data.knowledge.stale_chunks} stale chunks — re-index</span>}
          </div>
        </div>
        <div className="border-t-2 border-rule py-7 md:border-t-0 md:pl-8">
          <div className="eyebrow mb-3.5">Recent activity</div>
          {data.activity.map((a) => (
            <div key={`${a.kind}-${a.ref}-${a.at}`} className="rule-top-soft py-[11px]">
              <div className="text-[13px] leading-snug">{activityText(a)}</div>
              <div className="mt-0.5 text-[11px] text-muted-2">{timeAgo(a.at)}</div>
            </div>
          ))}
          <Link to="/admin/knowledge" className="btn-outline mt-5 w-full justify-start no-underline">Open knowledge base →</Link>
          <button className="btn-outline mt-2.5 w-full justify-start" onClick={reindex} disabled={busy}>{busy ? 'Re-indexing…' : 'Re-index all entries'}</button>
          {msg && <div className="mt-2.5 text-xs font-semibold text-tint-ink">{msg}</div>}
        </div>
      </div>
    </Page>
  );
}
