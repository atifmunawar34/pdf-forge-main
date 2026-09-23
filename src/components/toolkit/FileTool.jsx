import React, { useState } from 'react';
import JSZip from 'jszip';
import { Download } from 'lucide-react';
import { Btn, Field, FileDrop, Input, ResultBox } from './bits';
import { download, fmtSize } from './utils';

const sha256 = async (buf) => {
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * File tool engine — client-side, JSZip + Web Crypto.
 * def.op: zip | unzip | merge | split | rename | metadata | hash | mime | size | dupes | folder
 */
export default function FileTool({ def }) {
  const [files, setFiles] = useState([]);
  const [text, setText] = useState('');
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const multi = ['zip', 'merge', 'dupes', 'folder', 'rename-batch'].includes(def.op);

  const run = async () => {
    setBusy(true); setErr(''); setOut(null);
    try {
      switch (def.op) {
        case 'zip': {
          const zip = new JSZip();
          files.forEach((f) => zip.file(f.name, f));
          const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
          setOut({ blob, name: 'archive.zip', stats: [['Files', files.length], ['ZIP size', fmtSize(blob.size)]] });
          break;
        }
        case 'unzip': {
          const zip = await JSZip.loadAsync(files[0]);
          const rows = [];
          for (const [name, entry] of Object.entries(zip.files)) {
            if (!entry.dir) rows.push([name, fmtSize(entry._data?.uncompressedSize)]);
          }
          setOut({ rows: [['File', 'Size'], ...rows], stats: [['Entries', rows.length]] });
          break;
        }
        case 'merge': {
          const blob = new Blob(files, { type: files[0]?.type || 'application/octet-stream' });
          setOut({ blob, name: `merged${files[0]?.name.match(/\.[^.]+$/)?.[0] || '.bin'}`, stats: [['Files merged', files.length], ['Total', fmtSize(blob.size)]] });
          break;
        }
        case 'split': {
          const mb = Math.max(1, parseInt(text) || 10);
          const f = files[0];
          const partSize = mb * 1048576;
          const parts = Math.ceil(f.size / partSize);
          const zip = new JSZip();
          for (let i = 0; i < parts; i++) {
            zip.file(`${f.name}.part${String(i + 1).padStart(3, '0')}`, f.slice(i * partSize, (i + 1) * partSize));
          }
          const blob = await zip.generateAsync({ type: 'blob' });
          setOut({ blob, name: 'split-parts.zip', stats: [['Parts', parts], ['Part size', `${mb} MB`]] });
          break;
        }
        case 'rename': {
          const f = files[0];
          const newName = text.trim() || f.name;
          const ext = f.name.match(/\.[^.]+$/)?.[0] || '';
          const finalName = newName.includes('.') ? newName : newName + ext;
          setOut({ blob: f, name: finalName, stats: [['Renamed to', finalName]] });
          break;
        }
        case 'rename-batch': {
          const zip = new JSZip();
          files.forEach((f, i) => {
            const ext = f.name.match(/\.[^.]+$/)?.[0] || '';
            const base = text.trim() || 'file';
            zip.file(`${base}-${String(i + 1).padStart(3, '0')}${ext}`, f);
          });
          const blob = await zip.generateAsync({ type: 'blob' });
          setOut({ blob, name: 'renamed-files.zip', stats: [['Renamed', files.length]] });
          break;
        }
        case 'metadata': {
          const f = files[0];
          setOut({
            stats: [
              ['Name', f.name], ['Size', fmtSize(f.size)], ['MIME type', f.type || 'unknown'],
              ['Extension', f.name.match(/\.[^.]+$/)?.[0] || '(none)'],
              ['Modified', new Date(f.lastModified).toLocaleString()],
            ],
          });
          break;
        }
        case 'hash': {
          const h = await sha256(await files[0].arrayBuffer());
          setOut({ text: h, stats: [['Algorithm', 'SHA-256'], ['File', files[0].name]] });
          break;
        }
        case 'mime': {
          const f = files[0];
          const head = new Uint8Array(await f.slice(0, 16).arrayBuffer());
          const hex = [...head].map((b) => b.toString(16).padStart(2, '0')).join(' ');
          const sig = hex.startsWith('89 50 4e 47') ? 'PNG image' : hex.startsWith('ff d8') ? 'JPEG image' : hex.startsWith('25 50 44 46') ? 'PDF document' : hex.startsWith('50 4b') ? 'ZIP/Office package' : hex.startsWith('1f 8b') ? 'GZIP archive' : 'Unknown signature';
          setOut({ stats: [['Declared type', f.type || 'unknown'], ['Magic bytes', sig], ['Hex signature', hex]] });
          break;
        }
        case 'size': {
          const total = files.reduce((s, f) => s + f.size, 0);
          setOut({
            stats: [['Files', files.length], ['Total', fmtSize(total)], ['Average', fmtSize(total / files.length)]],
            rows: [['File', 'Size'], ...files.map((f) => [f.name, fmtSize(f.size)])],
          });
          break;
        }
        case 'dupes': {
          const groups = {};
          for (const f of files) {
            const h = `${f.size}:${await sha256(await f.arrayBuffer())}`;
            (groups[h] = groups[h] || []).push(f.name);
          }
          const dupeGroups = Object.values(groups).filter((g) => g.length > 1);
          setOut({
            stats: [['Files', files.length], ['Duplicate groups', dupeGroups.length], ['Duplicate files', dupeGroups.reduce((s, g) => s + g.length, 0)]],
            text: dupeGroups.length ? dupeGroups.map((g, i) => `Group ${i + 1}:\n${g.map((n) => '  ' + n).join('\n')}`).join('\n\n') : 'No duplicates found.',
          });
          break;
        }
        case 'folder': {
          const total = files.reduce((s, f) => s + f.size, 0);
          const byExt = {};
          files.forEach((f) => { const e = f.name.match(/\.[^.]+$/)?.[0]?.toLowerCase() || '(none)'; byExt[e] = (byExt[e] || 0) + f.size; });
          setOut({
            stats: [['Files', files.length], ['Total size', fmtSize(total)]],
            rows: [['Type', 'Size'], ...Object.entries(byExt).sort((a, b) => b[1] - a[1]).map(([e, s]) => [e, fmtSize(s)])],
          });
          break;
        }
        default:
          throw new Error('Unknown operation');
      }
    } catch (e) {
      setErr(e.message || 'Could not process those files.');
    } finally {
      setBusy(false);
    }
  };

  const inputLabel = { split: 'Part size (MB)', rename: 'New filename', 'rename-batch': 'Name pattern (e.g. photo)' }[def.op];

  return (
    <div className="space-y-4">
      <FileDrop
        onFiles={setFiles}
        multiple={multi}
        initial={def.initialFiles}
        directory={def.op === 'folder'}
        label={def.op === 'folder' ? 'Choose a folder' : multi ? 'Drop files here or browse' : 'Drop a file here or browse'}
        hint="All processing happens locally — files never leave your device"
      />
      {files.length > 0 && (
        <p className="text-xs font-semibold text-slate-500">
          {files.length} file{files.length > 1 ? 's' : ''} selected · {fmtSize(files.reduce((s, f) => s + f.size, 0))}
        </p>
      )}

      {inputLabel && (
        <Field label={inputLabel}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={inputLabel} />
        </Field>
      )}

      <Btn onClick={run} disabled={!files.length || busy}>{busy ? 'Working…' : def.action || 'Run'}</Btn>
      {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}

      {out?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {out.stats.map(([l, v]) => (
            <div key={l} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="text-sm font-black text-slate-800 break-all">{v}</div>
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
                  <td className="py-1.5 text-right font-mono">{b ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResultBox>
      )}

      {out?.text && (
        <ResultBox label="Output" copyText={out.text}>
          <pre className="font-mono text-xs text-slate-600 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{out.text}</pre>
        </ResultBox>
      )}

      {out?.blob && (
        <Btn onClick={() => download(out.blob, out.name)}>
          <span className="flex items-center gap-1.5"><Download className="w-4 h-4" /> Download {out.name}</span>
        </Btn>
      )}
    </div>
  );
}
