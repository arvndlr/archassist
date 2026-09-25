// Shared building blocks for the Archassist design language:
// square corners, 2px ink rules, uppercase kickers, red accent.

export function PageHead({ kicker, title, aside, actions, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b-2 border-ink pb-[18px] ${className}`}>
      <div>
        {kicker && <div className="kicker mb-2.5">{kicker}</div>}
        <h1 className="display m-0 text-[38px] leading-[1.06]">{title}</h1>
      </div>
      {aside && <div className="max-w-[34ch] text-xs text-muted">{aside}</div>}
      {actions && <div className="no-print flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/** Two-column split with the 2px rules used across the design (main + side). */
export function Split({ left, right, ratio = 'main', className = '' }) {
  const cols = ratio === 'main' ? 'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : 'md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]';
  return (
    <div className={`grid border-b-2 border-ink ${cols} ${className}`}>
      <div className="py-7 md:border-r-2 md:border-rule md:pr-8">{left}</div>
      <div className="border-t-2 border-rule py-7 md:border-t-0 md:pl-8">{right}</div>
    </div>
  );
}

export function Page({ children, narrow }) {
  return (
    <div className="flex-1 px-4 pt-9 pb-16 md:px-7">
      <div className={`mx-auto w-full ${narrow ? 'max-w-3xl' : 'max-w-[1180px]'}`}>{children}</div>
    </div>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] text-muted-2">{hint}</span>}
    </label>
  );
}

export function Note({ title, children }) {
  return (
    <div className="rule-top pt-[18px]">
      <div className="mb-2 text-sm font-extrabold">{title}</div>
      <p className="m-0 text-[13px] text-muted">{children}</p>
    </div>
  );
}

export function ErrorBar({ children }) {
  if (!children) return null;
  return <div role="alert" className="border-2 border-accent bg-tint px-4 py-3 text-[13px] font-semibold text-tint-ink">{children}</div>;
}

export function Loading({ label = 'Loading' }) {
  return <div className="px-4 py-24 text-center text-[11px] tracking-[.14em] uppercase text-muted-2 animate-pulse-num">{label}…</div>;
}

export function Bar({ pct, tone = 'ink', height = 'h-1' }) {
  const color = tone === 'accent' ? 'bg-accent' : 'bg-ink';
  return (
    <div className={`${height} bg-paper-2`}>
      <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

/** Thick framed progress bar (confidence, analysis progress). */
export function Meter({ pct }) {
  return (
    <div className="h-1.5 overflow-hidden border-2 border-ink bg-paper-2">
      <div className="h-full bg-accent transition-[width] duration-400 ease-linear" style={{ width: `${pct}%` }} />
    </div>
  );
}
