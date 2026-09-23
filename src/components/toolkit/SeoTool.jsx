import React, { useMemo, useState } from 'react';
import { Btn, Field, Input, TextArea, ResultBox } from './bits';
import { downloadText } from './utils';

/**
 * SEO tool engine. def = {
 *   fields: [{key,label,placeholder,type:'text'|'textarea'}],
 *   mode: 'generate' — build(vals) -> code string (meta tags, schema, robots.txt, sitemap)
 *         'analyze'  — analyze(html) -> {stats, rows, text} (runs on pasted HTML/text)
 *         'preview'  — SERP preview from title/desc/url fields
 * }
 */
export default function SeoTool({ def }) {
  const init = useMemo(
    () => Object.fromEntries((def.fields || []).map((f) => [f.key, ''])),
    [def]
  );
  const [vals, setVals] = useState(init);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState('');

  const run = () => {
    try {
      setErr('');
      if (def.mode === 'analyze') setOut(def.analyze(vals.input ?? vals[def.fields?.[0]?.key] ?? '', vals));
      else setOut({ text: def.build(vals) });
    } catch (e) { setErr(e.message || 'Could not process that input.'); }
  };

  const title = vals.title || 'Page Title';
  const desc = vals.description || vals.desc || 'Your page description appears here in search results…';
  const url = vals.url || 'https://example.com/page';

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {(def.fields || []).map((f) => (
          <Field key={f.key} label={f.label}>
            {f.type === 'textarea' ? (
              <TextArea rows={f.rows || 5} value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} placeholder={f.placeholder} className="font-mono text-xs" />
            ) : (
              <Input value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} placeholder={f.placeholder} />
            )}
          </Field>
        ))}
      </div>

      <Btn onClick={run}>{def.action || 'Generate'}</Btn>
      {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}

      {def.mode === 'preview' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Google SERP preview</p>
          <p className="text-xs text-emerald-700 truncate">{url}</p>
          <p className="text-lg text-blue-700 font-medium leading-snug hover:underline cursor-pointer">{title.slice(0, 60)}{title.length > 60 ? '…' : ''}</p>
          <p className="text-sm text-slate-600 leading-snug">{desc.slice(0, 158)}{desc.length > 158 ? '…' : ''}</p>
          <p className="mt-2 text-[10px] text-slate-400">{title.length}/60 chars · {desc.length}/158 chars</p>
        </div>
      )}

      {out?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {out.stats.map(([l, v]) => (
            <div key={l} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="text-base font-black text-slate-800 break-all">{v}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      )}

      {out?.rows && (
        <ResultBox label="Details">
          <table className="w-full text-xs">
            <tbody>
              {out.rows.map(([a, b], i) => (
                <tr key={i} className={i === 0 ? 'font-bold text-slate-500' : 'text-slate-700 border-t border-slate-100'}>
                  <td className="py-1.5 pr-4 break-all">{a}</td>
                  <td className="py-1.5 text-right">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResultBox>
      )}

      {out?.text != null && (
        <ResultBox label="Output" copyText={out.text}>
          <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap break-all max-h-80 overflow-y-auto">{out.text}</pre>
          <button onClick={() => downloadText(out.text, def.filename || 'output.txt', def.mime || 'text/plain')} className="mt-2 text-[11px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer">
            Download {def.filename || 'output.txt'}
          </button>
        </ResultBox>
      )}
    </div>
  );
}
