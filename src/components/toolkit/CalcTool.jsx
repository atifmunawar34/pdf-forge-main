import { useMemo, useState } from 'react';
import { Btn, Field, NumInput, Select } from './bits';

/**
 * Calculator engine. def = {
 *   fields: [{key,label,type:'number'|'select',options,default,placeholder,min,step}],
 *   compute(vals) -> [{label, value, hint?}]   // result cards
 * }
 */
export default function CalcTool({ def }) {
  const init = useMemo(
    () => Object.fromEntries(def.fields.map((f) => [f.key, f.default ?? ''])),
    [def]
  );
  const [vals, setVals] = useState(init);
  const [results, setResults] = useState(null);
  const [err, setErr] = useState('');

  const run = () => {
    try {
      setErr('');
      const out = def.compute(vals);
      setResults(out);
    } catch (e) {
      setErr(e.message || 'Check your inputs.');
      setResults(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${def.fields.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {def.fields.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint}>
            {f.type === 'select' ? (
              <Select value={vals[f.key]} onChange={(v) => setVals({ ...vals, [f.key]: v })} options={f.options} />
            ) : f.type === 'date' ? (
              <input type="date" value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            ) : (
              <NumInput value={vals[f.key]} onChange={(v) => setVals({ ...vals, [f.key]: v })} placeholder={f.placeholder} min={f.min} step={f.step} />
            )}
          </Field>
        ))}
      </div>

      <Btn onClick={run}>{def.action || 'Calculate'}</Btn>

      {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}

      {results && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {results.map((r) => (
            <div key={r.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
              <div className="text-lg font-black text-slate-800 break-all">{r.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">{r.label}</div>
              {r.hint && <div className="text-[10px] text-slate-400 mt-1">{r.hint}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
