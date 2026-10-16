import { useRef, useState } from 'react';
import { Mic, Square, Volume2, StopCircle } from 'lucide-react';
import { Btn, Field, Select, TextArea, ResultBox, DownloadBtn } from './bits';

/** Speech tools — def.mode: 'stt' (speech→text) | 'tts' (text→speech) */
export default function SpeechTool({ def }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState('1');
  const [err, setErr] = useState('');
  const recRef = useRef(null);

  const startStt = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setErr('Speech recognition is not supported in this browser — try Chrome or Edge.'); return; }
    setErr('');
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let t = '';
      for (const r of e.results) t += r[0].transcript;
      setText(t);
    };
    rec.onerror = (e) => { setErr(e.error === 'not-allowed' ? 'Microphone access denied.' : `Recognition error: ${e.error}`); setListening(false); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopStt = () => { recRef.current?.stop(); setListening(false); };

  const speak = () => {
    if (!('speechSynthesis' in window)) { setErr('Text-to-speech is not supported in this browser.'); return; }
    setErr('');
    const u = new SpeechSynthesisUtterance(text);
    u.rate = parseFloat(rate) || 1;
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const stopTts = () => { window.speechSynthesis.cancel(); setSpeaking(false); };

  if (def.mode === 'tts') {
    return (
      <div className="space-y-4">
        <Field label="Text to speak">
          <TextArea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste text to read aloud…" />
        </Field>
        <Field label="Speed">
          <Select value={rate} onChange={setRate} options={[{ value: '0.5', label: '0.5× slow' }, { value: '1', label: '1× normal' }, { value: '1.5', label: '1.5× fast' }, { value: '2', label: '2× faster' }]} />
        </Field>
        <div className="flex gap-2">
          <Btn onClick={speak} disabled={!text.trim() || speaking}>
            <span className="flex items-center gap-1.5"><Volume2 className="w-4 h-4" /> Speak</span>
          </Btn>
          {speaking && <Btn variant="secondary" onClick={stopTts}><span className="flex items-center gap-1.5"><StopCircle className="w-4 h-4" /> Stop</span></Btn>}
        </div>
        {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {!listening ? (
          <Btn onClick={startStt}><span className="flex items-center gap-1.5"><Mic className="w-4 h-4" /> Start Dictating</span></Btn>
        ) : (
          <Btn onClick={stopStt}><span className="flex items-center gap-1.5"><Square className="w-4 h-4" /> Stop</span></Btn>
        )}
      </div>
      {listening && (
        <p className="text-xs font-semibold text-rose-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Listening… speak now
        </p>
      )}
      {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}
      {text && (
        <ResultBox label="Transcript" copyText={text}>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{text}</p>
          <DownloadBtn text={text} filename="transcript.txt" label="Download .txt" variant="ghost" className="mt-2" />
        </ResultBox>
      )}
    </div>
  );
}
