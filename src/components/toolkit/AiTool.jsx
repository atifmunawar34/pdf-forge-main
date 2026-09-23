import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Btn, Field, TextArea, ResultBox } from './bits';
import { downloadText } from './utils';

const API = (import.meta.env.VITE_API_BASE_URL || '') + '/api/ai';

/**
 * AI tool engine — calls the backend /api/ai proxy so keys stay server-side.
 * def = { inputLabel, placeholder, prompt: (text, opts) -> string, rows }
 * If no provider is configured on the server, shows a clear "not configured" state.
 */
export default function AiTool({ def }) {
  const [text, setText] = useState('');
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [offline, setOffline] = useState(false);

  const run = async () => {
    if (!text.trim()) return;
    setBusy(true); setErr(''); setOut(null); setOffline(false);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: def.id, prompt: def.prompt(text) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503 || data.offline) {
        setOffline(true);
        // local extractive fallback for summarizer-like tools
        if (def.localFallback) setOut(def.localFallback(text));
        else setErr(data.error || 'AI provider is not configured on this server yet.');
      } else if (!res.ok) {
        setErr(data.error || 'AI request failed. Please try again.');
      } else {
        setOut(data.result || '');
      }
    } catch {
      setErr('AI service unreachable — check the backend is running.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Field label={def.inputLabel || 'Your text'}>
        <TextArea rows={def.rows || 6} value={text} onChange={(e) => setText(e.target.value)} placeholder={def.placeholder || 'Paste your text here…'} />
      </Field>

      <Btn onClick={run} disabled={!text.trim() || busy}>
        <span className="flex items-center gap-1.5">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? 'Working…' : def.action || 'Generate'}
        </span>
      </Btn>

      {offline && (
        <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3.5 py-2.5">
          AI provider not configured on the server — showing a local basic result. Add an API key to the backend to enable full AI output.
        </div>
      )}
      {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}

      {out && (
        <ResultBox label="AI output" copyText={out}>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">{out}</p>
          <button onClick={() => downloadText(out, `${def.id || 'ai-output'}.txt`)} className="mt-2 text-[11px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer">Download .txt</button>
        </ResultBox>
      )}
    </div>
  );
}
