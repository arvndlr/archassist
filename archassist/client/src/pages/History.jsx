import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorText } from '../lib/api.js';
import { useOptions, labelOf } from '../lib/useOptions.js';
import { timeAgo } from '../lib/format.js';
import { ErrorBar, Loading, Page, PageHead } from '../components/ui.jsx';

const COLS = 'grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_110px_130px_120px]';

export default function History() {
  const navigate = useNavigate();
  const options = useOptions();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/projects').then(setProjects).catch((e) => setError(errorText(e))); }, []);

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.title}" and all of its reports?`)) return;
    try {
      await api(`/projects/${p.id}`, { method: 'DELETE' });
      setProjects((list) => list.filter((x) => x.id !== p.id));
    } catch (e) { setError(errorText(e)); }
  };

  if (!projects) return error ? <Page><ErrorBar>{error}</ErrorBar></Page> : <Loading />;

  const cell = 'border-b border-rule-soft py-4';
  return (
    <Page>
      <PageHead kicker="Saved work" title="Your analyses"
        actions={<Link to="/projects/new" className="btn-primary no-underline">New analysis</Link>} />
      {error && <div className="mt-4"><ErrorBar>{error}</ErrorBar></div>}
      {projects.length === 0 ? (
        <div className="border-b-2 border-ink py-16 text-center">
          <div className="mb-2 text-lg font-extrabold">No analyses yet</div>
          <p className="m-0 mb-6 text-[13px] text-muted">Describe your project and its quality attributes to get your first recommendation.</p>
          <Link to="/projects/new" className="btn-primary no-underline">Start an analysis →</Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className={`grid min-w-[760px] border-b-2 border-ink ${COLS}`}>
            {['Project', 'Recommended', 'Confidence', 'Run', 'Report'].map((h, i) => (
              <div key={h} className={`th border-b-2 border-rule py-2.5 ${i === 0 ? 'pr-3.5' : i === 4 ? 'pl-3.5' : 'px-3.5'}`}>{h}</div>
            ))}
            {projects.map((p) => [
              <div key={`${p.id}a`} className={`${cell} pr-3.5`}>
                <div className="mb-0.5 text-[15px] leading-tight font-extrabold">{p.title}</div>
                <div className="text-xs text-muted-2">{p.domain || labelOf(options?.project_types, p.project_type)}</div>
              </div>,
              <div key={`${p.id}b`} className={`${cell} px-3.5 text-sm`}>{p.latest_architecture ?? <span className="text-muted-2">Not run yet</span>}</div>,
              <div key={`${p.id}c`} className={`${cell} px-3.5 text-sm leading-tight font-extrabold`}>
                {p.latest_fit != null ? `${p.latest_fit}%` : '—'}
                {p.latest_confidence && <div className="mt-1 text-[10px] font-semibold tracking-[.08em] uppercase text-muted-2">{p.latest_confidence}</div>}
              </div>,
              <div key={`${p.id}d`} className={`${cell} px-3.5 text-[13px] text-muted`}>{timeAgo(p.latest_recommendation_at ?? p.updated_at)}</div>,
              <div key={`${p.id}e`} className={`${cell} flex flex-wrap items-start gap-x-3 gap-y-1 pl-3.5`}>
                {p.latest_recommendation_id
                  ? <button className="btn-link" onClick={() => navigate(`/reports/${p.latest_recommendation_id}`)}>Open</button>
                  : <button className="btn-link" onClick={() => navigate(`/projects/${p.id}/edit`)}>Continue</button>}
                <button className="btn-link font-normal text-muted-2 hover:text-accent" onClick={() => remove(p)}>Delete</button>
              </div>,
            ])}
          </div>
        </div>
      )}
    </Page>
  );
}
