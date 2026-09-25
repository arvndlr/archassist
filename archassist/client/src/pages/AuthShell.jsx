export default function AuthShell({ children }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex flex-col justify-between gap-12 border-b-2 border-ink p-8 md:border-r-2 md:border-b-0 md:p-14">
        <div className="flex shrink-0 items-baseline gap-2.5">
          <span className="text-xl leading-none font-extrabold tracking-[-.02em]">ARCHASSIST</span>
          <span className="text-[10px] leading-none tracking-[.14em] uppercase text-muted">v1.0 · decision support</span>
        </div>
        <div className="max-w-[560px]">
          <div className="kicker mb-5">Architecture decision support</div>
          <h1 className="display m-0 mb-5 text-[40px] leading-[1.04] md:text-[54px]">Pick the architecture your project actually needs.</h1>
          <p className="m-0 max-w-[46ch] text-ink-2">
            Archassist reads your project profile and quality attributes, retrieves matching architecture knowledge,
            and returns a recommendation with its reasoning. It does not generate source code.
          </p>
          <div className="mt-10 grid grid-cols-3 border-t-2 border-ink">
            {[
              ['01 Profile', 'Project + quality attributes'],
              ['02 Retrieve', 'RAG over knowledge base'],
              ['03 Recommend', 'LLM rationale + alternatives'],
            ].map(([t, d], i) => (
              <div key={t} className={`py-4 ${i === 0 ? 'pr-4' : i === 2 ? 'pl-4' : 'px-4'} ${i < 2 ? 'border-r-2 border-rule' : ''}`}>
                <div className="text-[13px] leading-snug font-extrabold">{t}</div>
                <div className="text-xs text-muted">{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[11px] text-muted-2">Academic software projects · Knowledge base of architecture styles, patterns and tactics</div>
      </div>
      <div className="flex flex-col justify-center bg-paper-2 p-8 md:p-14">
        <div className="mx-auto w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
