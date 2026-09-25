import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorText } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { WEIGHT_LABELS, fmtDate } from '../lib/format.js';
import { Bar, ErrorBar, Loading, Meter, Page, PageHead } from '../components/ui.jsx';

const CONFIDENCE_NOTE = {
  high: 'Strong agreement between the retrieved knowledge and your weighted attributes, with a clear margin over the runner-up.',
  medium: 'Good fit, but the runner-up is close. Read the alternatives before committing.',
  low: 'Several styles fit almost equally well. Treat this as a shortlist and decide with your adviser.',
};

function splitSentences(text) {
  return text
    .split(/\n\s*\n/)
    .flatMap((p) => (p.length > 320 ? p.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [p] : [p]))
    .map((s) => s.trim())
    .filter(Boolean);
}

function Eyebrow({ children, className = '' }) {
  return <div className={`eyebrow mb-3 ${className}`}>{children}</div>;
}

export default function Report() {
  const { id } = useParams();
  const { user } = useAuth();
  const [rec, setRec] = useState(null);
  const [error, setError] = useState('');
  const [trace, setTrace] = useState(false);

  useEffect(() => { api(`/recommendations/${id}`).then(setRec).catch((e) => setError(errorText(e))); }, [id]);

  if (error) return <Page><ErrorBar>{error}</ErrorBar></Page>;
  if (!rec) return <Loading label="Loading report" />;

  const r = rec.report;
  const candidates = rec.decision_matrix.candidates;
  const chosen = candidates.find((c) => c.entry_id === r.recommended_architecture.entry_id) ?? candidates[0];
  const fit = Math.round(chosen?.score ?? 0);
  const scoreOf = (name) => {
    const n = name.toLowerCase();
    const c = candidates.find((x) => x.name.toLowerCase() === n)
      ?? candidates.find((x) => x.name.toLowerCase().startsWith(n.split(' (')[0]) || n.startsWith(x.name.toLowerCase().split(' (')[0]));
    return c ? `${Math.round(c.score)}%` : '—';
  };
  const drivers = rec.profile.ranked_quality_attributes;
  const isOwner = user.role !== 'admin';

  return (
    <Page>
      <PageHead
        kicker={`Recommendation report · ${fmtDate(rec.created_at)}`}
        title={rec.project_title}
        actions={<>
          <button className="btn-outline px-4 py-3" onClick={() => window.print()}>Export PDF</button>
          {isOwner && <Link to="/history" className="btn-primary px-4 py-3 no-underline">Saved to history</Link>}
        </>}
      />

      <div className="grid border-b-2 border-ink md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="py-7 md:border-r-2 md:border-rule md:pr-8">
          <Eyebrow className="mb-2.5">Recommended architecture</Eyebrow>
          <h2 className="display m-0 mb-1 text-[36px] leading-[1.02] tracking-[-.03em] text-accent md:text-[44px]">{r.recommended_architecture.name}</h2>
          <div className="mb-6 text-sm text-ink-2">{r.recommended_architecture.summary}</div>

          <Eyebrow className="mb-2.5">Rationale</Eyebrow>
          {splitSentences(r.rationale).map((t) => (
            <div key={t.slice(0, 60)} className="rule-top-soft grid grid-cols-[18px_minmax(0,1fr)] gap-3 py-2.5">
              <span className="text-[13px] leading-relaxed font-extrabold text-accent">—</span>
              <div className="text-sm leading-normal">{t}</div>
            </div>
          ))}

          {r.tradeoffs_and_risks.length > 0 && (
            <div className="rule-top mt-[26px] pt-5">
              <Eyebrow>Watch out for</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {r.tradeoffs_and_risks.map((k) => (
                  <span key={k} className="border border-rule bg-paper-2 px-[11px] py-[7px] text-xs leading-snug font-semibold text-ink-2">{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t-2 border-rule py-7 md:border-t-0 md:pl-8">
          <Eyebrow className="mb-2">Confidence</Eyebrow>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="display text-[56px] leading-none tracking-[-.03em]">{fit}</span>
            <span className="text-xl leading-none font-extrabold text-muted-2">%</span>
            <span className="ml-auto text-[11px] font-extrabold tracking-[.08em] uppercase text-muted-2">{r.confidence} certainty</span>
          </div>
          <div className="mb-2"><Meter pct={fit} /></div>
          <div className="mb-[26px] text-xs text-muted">
            Decision-matrix fit against your weighted attributes. {CONFIDENCE_NOTE[r.confidence]}
          </div>

          <Eyebrow>Drivers of this choice</Eyebrow>
          {drivers.map((d) => (
            <div key={d.key} className="rule-top-soft py-[9px]">
              <div className="mb-[5px] flex items-baseline justify-between gap-3">
                <span className="text-[13px] leading-tight font-semibold">{d.label}</span>
                <span className="text-[11px] leading-none font-extrabold tracking-[.06em] uppercase text-muted-2">{WEIGHT_LABELS[d.priority]}</span>
              </div>
              <Bar pct={d.priority * 20} />
            </div>
          ))}

          <div className="rule-top mt-[26px] pt-[18px]">
            <Eyebrow className="mb-2.5">Retrieved sources</Eyebrow>
            {r.references.map((ref) => {
              const e = rec.retrieved.entries.find((x) => x.id === ref.entry_id);
              return (
                <div key={ref.entry_id} className="flex justify-between gap-3 border-t border-rule-soft py-[7px] text-xs text-ink-2">
                  <span>{ref.title}</span>
                  {e && <span className="shrink-0 uppercase tracking-[.06em] text-muted-2">{e.category}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alternatives */}
      <div className="pt-[30px]">
        <Eyebrow className="mb-3.5">Alternatives considered</Eyebrow>
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-[minmax(0,1.4fr)_90px_minmax(0,1.6fr)_minmax(0,1.4fr)] border-y-2 border-ink">
            {['Architecture', 'Fit', 'Why not chosen', 'Reconsider if'].map((h, i) => (
              <div key={h} className={`th border-b-2 border-rule py-2.5 ${i === 0 ? 'pr-3.5' : i === 3 ? 'pl-3.5' : 'px-3.5'}`}>{h}</div>
            ))}
            {r.alternatives.map((a) => [
              <div key={`${a.name}-n`} className="border-b border-rule-soft py-3.5 pr-3.5 text-[15px] leading-tight font-extrabold">{a.name}</div>,
              <div key={`${a.name}-f`} className="border-b border-rule-soft p-3.5 text-[15px] leading-tight font-extrabold text-muted-2">{scoreOf(a.name)}</div>,
              <div key={`${a.name}-g`} className="border-b border-rule-soft p-3.5 text-[13px] leading-normal">{a.reason_not_selected}</div>,
              <div key={`${a.name}-c`} className="border-b border-rule-soft py-3.5 pl-3.5 text-[13px] leading-normal text-muted">{a.when_to_reconsider || '—'}</div>,
            ])}
          </div>
        </div>
      </div>

      {/* Quality attribute analysis + structure */}
      <div className="mt-[30px] grid border-y-2 border-ink md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="py-7 md:border-r-2 md:border-rule md:pr-8">
          <Eyebrow className="mb-3.5">How each attribute is met</Eyebrow>
          {r.quality_attribute_analysis.map((q) => (
            <div key={q.attribute} className="rule-top-soft py-3">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-[15px] leading-tight font-extrabold">{q.attribute}</span>
                <span className={`px-2 py-1 text-[10px] leading-tight font-semibold tracking-[.08em] uppercase ${
                  q.support === 'strong' ? 'bg-ink text-paper' : q.support === 'moderate' ? 'bg-tint text-tint-ink' : 'border border-accent text-accent'}`}>
                  {q.support} support
                </span>
              </div>
              <div className="text-[13px] text-ink-2">{q.explanation}</div>
              {q.tactics?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {q.tactics.map((t) => <span key={t} className="chip-muted py-1 text-[11px]">{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="border-t-2 border-rule py-7 md:border-t-0 md:pl-8">
          <Eyebrow className="mb-3.5">High-level structure</Eyebrow>
          {r.high_level_structure.map((c, i) => (
            <div key={c.name} className="rule-top-soft grid grid-cols-[28px_minmax(0,1fr)] gap-2 py-2.5">
              <span className="text-[13px] font-extrabold text-accent">{String(i + 1).padStart(2, '0')}</span>
              <div><div className="text-sm font-extrabold">{c.name}</div><div className="text-[13px] text-muted">{c.responsibility}</div></div>
            </div>
          ))}
          {r.recommended_patterns?.length > 0 && (
            <>
              <Eyebrow className="mt-6 mb-3.5">Supporting patterns</Eyebrow>
              {r.recommended_patterns.map((p) => (
                <div key={p.name} className="rule-top-soft py-2.5">
                  <div className="text-sm font-extrabold">{p.name}</div><div className="text-[13px] text-muted">{p.purpose}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Next steps */}
      <div className="border-b-2 border-ink py-7">
        <Eyebrow className="mb-3.5">Next steps</Eyebrow>
        <ol className="m-0 grid list-none gap-x-8 p-0 md:grid-cols-2">
          {r.implementation_guidance.map((t, i) => (
            <li key={t} className="rule-top-soft grid grid-cols-[28px_minmax(0,1fr)] gap-2 py-2.5 text-sm">
              <span className="font-extrabold text-accent">{String(i + 1).padStart(2, '0')}</span><span>{t}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Pipeline trace */}
      <div className="no-print border-b-2 border-ink">
        <button onClick={() => setTrace(!trace)} aria-expanded={trace}
          className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent py-4 text-left">
          <span className="eyebrow">How this recommendation was made</span>
          <span className="text-lg font-extrabold">{trace ? '−' : '+'}</span>
        </button>
        {trace && (
          <div className="grid gap-8 pb-7 text-[13px] md:grid-cols-3">
            <div>
              <div className="mb-2 text-sm font-extrabold">01 Input processing</div>
              <p className="m-0 mb-2 text-muted">{rec.profile.summary}</p>
              {rec.profile.signals.length > 0 && <p className="m-0 text-ink-2"><b>Signals:</b> {rec.profile.signals.join(', ')}</p>}
              {rec.profile.derived_notes.map((n) => <p key={n} className="m-0 mt-1 text-muted">— {n}</p>)}
            </div>
            <div>
              <div className="mb-2 text-sm font-extrabold">02 Knowledge retrieval</div>
              <p className="m-0 mb-2 text-muted">Hybrid vector + full-text search, fused with reciprocal rank fusion · {rec.retrieved.chunk_count} candidate chunks · {rec.retrieved.embedding_model}</p>
              {rec.retrieved.entries.map((e) => (
                <div key={e.id} className="flex justify-between gap-3 border-t border-rule-soft py-1.5">
                  <span>{e.title}</span>
                  <span className="shrink-0 text-muted-2">{e.added_by ? (e.added_by.startsWith('quality') ? 'attribute match' : 'matrix') : e.relevance}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-2 text-sm font-extrabold">03 Recommendation</div>
              <p className="m-0 mb-3 text-muted">Provider: {rec.provider}{rec.model ? ` (${rec.model})` : ''} · {rec.duration_ms} ms</p>
              {rec.error && <p className="m-0 mb-3 text-accent">The LLM call failed ({rec.error}); this report was produced in offline mode.</p>}
              <div className="mb-2 text-sm font-extrabold">Decision matrix</div>
              {candidates.slice(0, 6).map((c) => (
                <div key={c.entry_id} className="py-1">
                  <div className="mb-1 flex justify-between"><span className={c === chosen ? 'font-extrabold' : ''}>{c.name}</span><span className="text-muted-2">{Math.round(c.score)}</span></div>
                  <Bar pct={c.score} tone={c === chosen ? 'accent' : 'ink'} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isOwner && (
        <div className="no-print flex flex-wrap gap-2.5 pt-[22px]">
          <Link to={`/projects/${rec.project_id}/edit?step=qa`} className="btn-outline no-underline">Adjust attributes &amp; re-run</Link>
          <Link to="/projects/new" className="btn px-[18px] font-semibold text-muted underline underline-offset-4 hover:text-accent">Start a new analysis</Link>
        </div>
      )}
      <p className="mt-8 text-[11px] text-muted-2">Archassist provides architecture decision support only — it does not generate source code. Validate the recommendation with your adviser.</p>
    </Page>
  );
}
