import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Btn, Field, Input, NumInput, Select, ResultBox, CopyBtn } from './bits';
import { downloadText } from './utils';

/**
 * Generator engine. def = {
 *   options: [{key,label,type,options,default,placeholder,min,max}],
 *   run(opts) -> string | string[]  // generated output
 * }
 */
export default function GenerateTool({ def }) {
  const init = useMemo(
    () => Object.fromEntries((def.options || []).map((o) => [o.key, o.default ?? (o.type === 'number' ? 1 : o.type === 'checkbox' ? false : '')])),
    [def]
  );
  const [opts, setOpts] = useState(init);
  const [out, setOut] = useState(null);

  const run = () => setOut(def.run(opts));
  const items = Array.isArray(out) ? out : out != null ? [out] : [];

  return (
    <div className="space-y-4">
      {def.options?.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {def.options.map((o) => (
            <Field key={o.key} label={o.label} hint={o.hint}>
              {o.type === 'select' ? (
                <Select value={opts[o.key]} onChange={(v) => setOpts({ ...opts, [o.key]: v })} options={o.options} />
              ) : o.type === 'number' ? (
                <NumInput value={opts[o.key]} onChange={(v) => setOpts({ ...opts, [o.key]: v })} min={o.min} max={o.max} />
              ) : o.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={!!opts[o.key]} onChange={(e) => setOpts({ ...opts, [o.key]: e.target.checked })} className="accent-rose-500 w-4 h-4" />
                  {o.hint || 'Enabled'}
                </label>
              ) : (
                <Input value={opts[o.key]} onChange={(e) => setOpts({ ...opts, [o.key]: e.target.value })} placeholder={o.placeholder} />
              )}
            </Field>
          ))}
        </div>
      )}

      <Btn onClick={run}>
        <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> {def.action || 'Generate'}</span>
      </Btn>

      {items.length > 0 && (
        <ResultBox label="Generated" copyText={items.join('\n')}>
          <ul className="space-y-1.5 max-h-72 overflow-y-auto">
            {items.map((it, i) => (
              <li key={i} className="text-sm font-mono text-slate-700 bg-white border border-slate-100 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2">
                <span className="break-all">{it}</span>
                <CopyBtn text={it} />
              </li>
            ))}
          </ul>
          <button onClick={() => downloadText(items.join('\n'), `${def.id || 'generated'}.txt`)} className="mt-2 text-[11px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer">
            Download .txt
          </button>
        </ResultBox>
      )}
    </div>
  );
}
