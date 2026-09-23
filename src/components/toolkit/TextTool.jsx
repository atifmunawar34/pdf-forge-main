import React, { useMemo, useState } from 'react';
import { Eraser } from 'lucide-react';
import { Btn, Field, Input, NumInput, Select, TextArea, ResultBox } from './bits';
import { downloadText } from './utils';

/**
 * Text-based tool engine. def = {
 *   inputLabel, placeholder, rows,
 *   options: [{key,label,type:'text'|'number'|'select'|'checkbox',options,default}],
 *   run(text, opts) -> string | { text?, stats?[{label,value}], html? }
 * }
 */
export default function TextTool({ def }) {
  const [text, setText] = useState('');
  const initOpts = useMemo(
    () => Object.fromEntries((def.options || []).map((o) => [o.key, o.default ?? (o.type === 'checkbox' ? false : '')])),
    [def]
  );
  const [opts, setOpts] = useState(initOpts);
  const [output, setOutput] = useState(null);

  const run = () => setOutput(def.run(text, opts));

  return (
    <div className="space-y-4">
      <Field label={def.inputLabel || 'Your text'}>
        <TextArea
          rows={def.rows || 6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={def.placeholder || 'Paste or type your text here…'}
        />
      </Field>

      {def.options?.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {def.options.map((o) => (
            <Field key={o.key} label={o.label}>
              {o.type === 'select' ? (
                <Select value={opts[o.key]} onChange={(v) => setOpts({ ...opts, [o.key]: v })} options={o.options} />
              ) : o.type === 'number' ? (
                <NumInput value={opts[o.key]} onChange={(v) => setOpts({ ...opts, [o.key]: v })} placeholder={o.placeholder} />
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

      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={run} disabled={!text.trim() && !def.allowEmpty}>{def.action || 'Run'}</Btn>
        <Btn variant="secondary" onClick={() => { setText(''); setOutput(null); }}>
          <span className="flex items-center gap-1.5"><Eraser className="w-3.5 h-3.5" /> Clear</span>
        </Btn>
      </div>

      {output != null && (
        typeof output === 'object' && !Array.isArray(output) ? (
          <div className="space-y-3">
            {output.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {output.stats.map((s) => (
                  <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-slate-800">{s.value}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {output.html && (
              <ResultBox label="Preview">
                <div className="text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: output.html }} />
              </ResultBox>
            )}
            {output.text != null && (
              <ResultBox label="Output" copyText={output.text}>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap break-words font-mono max-h-80 overflow-y-auto">{output.text}</pre>
                <div className="mt-2 flex gap-3">
                  <button onClick={() => downloadText(output.text, `${def.id || 'output'}.txt`)} className="text-[11px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer">Download .txt</button>
                </div>
              </ResultBox>
            )}
          </div>
        ) : (
          <ResultBox label="Output" copyText={output}>
            <pre className="text-sm text-slate-700 whitespace-pre-wrap break-words font-mono max-h-80 overflow-y-auto">{output}</pre>
          </ResultBox>
        )
      )}
    </div>
  );
}
