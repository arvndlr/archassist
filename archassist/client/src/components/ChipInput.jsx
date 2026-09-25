import { useState } from 'react';

/** Editable list of tinted chips with an inline "+ add …" control. */
export default function ChipInput({ values, onChange, addLabel, placeholder }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');

  const commit = () => {
    const v = text.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setText('');
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <span key={v} className="chip-accent">
          {v}
          <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}
            className="cursor-pointer border-0 bg-transparent p-0 text-sm leading-none text-tint-ink/70 hover:text-accent">×</button>
        </span>
      ))}
      {adding ? (
        <input autoFocus value={text} placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { setText(''); setAdding(false); }
          }}
          className="min-w-44 border-2 border-ink bg-field px-2.5 py-1 text-xs font-semibold" />
      ) : (
        <button type="button" className="chip-muted cursor-pointer hover:border-ink" onClick={() => setAdding(true)}>+ {addLabel}</button>
      )}
    </div>
  );
}
