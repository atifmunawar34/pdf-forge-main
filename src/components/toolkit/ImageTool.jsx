import { useRef, useState } from 'react';
import { Btn, Field, FileDrop, Input, NumInput, Select, ResultBox, CopyBtn, DownloadBtn } from './bits';
import { fmtSize } from './utils';

const loadImg = (file) =>
  new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => res({ img, url });
    img.onerror = () => rej(new Error('Could not load that image.'));
    img.src = url;
  });

/**
 * Image tool engine — all client-side canvas ops.
 * def.op: compress | resize | rotate | convert | filter | grayscale | invert |
 *         watermark | base64 | metadata | strip-meta | split | merge | upscale |
 *         passport | colorpick
 * def.options: extra option fields (same shape as TextTool options)
 * def.fixed: fixed option values
 */
export default function ImageTool({ def }) {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [imgUrl, setImgUrl] = useState(null);
  const [out, setOut] = useState(null); // {dataUrl,blob,text,stats,extra}
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [opts, setOpts] = useState(() =>
    Object.fromEntries((def.options || []).map((o) => [o.key, o.default ?? '']))
  );
  const viewRef = useRef(null);
  const [picked, setPicked] = useState(null);

  const multi = def.op === 'merge';

  const pick = async (fl) => {
    setErr(''); setOut(null); setPicked(null);
    if (multi) { setFiles(fl); setFile(fl[0] || null); setImgUrl(fl[0] ? URL.createObjectURL(fl[0]) : null); return; }
    const f = fl?.[0];
    if (!f) return;
    setFile(f);
    setImgUrl(URL.createObjectURL(f));
  };

  const canvasOf = async (f, w, h) => {
    const { img } = await loadImg(f);
    const c = document.createElement('canvas');
    c.width = w ?? img.naturalWidth; c.height = h ?? img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return { c, ctx, img };
  };

  const toBlob = (c, type, q) =>
    new Promise((res) => c.toBlob(res, type, q));

  const finish = (blob, extra = {}) => {
    setOut({ blob, dataUrl: blob ? URL.createObjectURL(blob) : null, ...extra });
  };

  const run = async () => {
    setBusy(true); setErr(''); setOut(null); setPicked(null);
    try {
      const o = { ...def.fixed, ...opts };
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      const outMime = mimeMap[o.format || 'png'] || 'image/png';
      const q = Math.max(0.05, Math.min(1, parseFloat(o.quality ?? 0.85)));

      switch (def.op) {
        case 'compress': {
          const { c } = await canvasOf(file);
          const blob = await toBlob(c, outMime, q);
          finish(blob, { stats: [['Original', fmtSize(file.size)], ['Compressed', fmtSize(blob.size)], ['Saved', `${Math.max(0, Math.round((1 - blob.size / file.size) * 100))}%`]] });
          break;
        }
        case 'resize': {
          const { img } = await loadImg(file);
          const mode = o.mode || 'pixels';
          let w, h;
          if (mode === 'percent') { const p = parseFloat(o.percent || 50) / 100; w = Math.round(img.naturalWidth * p); h = Math.round(img.naturalHeight * p); }
          else {
            w = parseInt(o.width) || img.naturalWidth;
            h = o.keepRatio === 'yes' || o.keepRatio === true || !o.height
              ? Math.round(img.naturalHeight * (w / img.naturalWidth))
              : parseInt(o.height);
          }
          const { c } = await canvasOf(file, w, h);
          finish(await toBlob(c, outMime, q), { stats: [['New size', `${w} × ${h}px`]] });
          break;
        }
        case 'rotate': {
          const { img } = await loadImg(file);
          const deg = parseFloat(o.angle ?? 90);
          const rad = (deg * Math.PI) / 180;
          const swap = Math.abs(deg % 180) === 90;
          const c = document.createElement('canvas');
          c.width = swap ? img.naturalHeight : img.naturalWidth;
          c.height = swap ? img.naturalWidth : img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.translate(c.width / 2, c.height / 2);
          ctx.rotate(rad);
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
          finish(await toBlob(c, outMime, 1));
          break;
        }
        case 'convert': {
          const { c } = await canvasOf(file);
          finish(await toBlob(c, outMime, q));
          break;
        }
        case 'crop': {
          const { img } = await loadImg(file);
          const pct = Math.max(10, Math.min(100, parseFloat(o.size ?? 80))) / 100;
          const side = Math.min(img.naturalWidth, img.naturalHeight) * pct;
          const sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
          const c = document.createElement('canvas');
          c.width = Math.round(side); c.height = Math.round(side);
          c.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, c.width, c.height);
          finish(await toBlob(c, outMime, q), { stats: [['Cropped', `${c.width} × ${c.height}px`]] });
          break;
        }
        case 'filter': {
          const { img } = await loadImg(file);
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.filter = def.runOpts ? def.runOpts(o).filter : (def.filter || 'none');
          ctx.drawImage(img, 0, 0);
          finish(await toBlob(c, outMime, 1));
          break;
        }
        case 'watermark': {
          const { c, ctx } = await canvasOf(file);
          const txt = o.text || 'PDF Forge';
          const sizePx = Math.max(14, Math.round(c.width / 18));
          ctx.font = `bold ${sizePx}px sans-serif`;
          ctx.fillStyle = `rgba(255,255,255,${Math.min(1, parseFloat(o.opacity ?? 0.5))})`;
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = Math.max(2, sizePx / 14);
          const pos = o.position || 'bottom-right';
          const pad = sizePx;
          const tw = ctx.measureText(txt).width;
          const x = pos.includes('left') ? pad : pos.includes('center') ? (c.width - tw) / 2 : c.width - tw - pad;
          const y = pos.includes('top') ? pad + sizePx / 3 : pos.includes('center') ? c.height / 2 : c.height - pad;
          ctx.strokeText(txt, x, y);
          ctx.fillText(txt, x, y);
          finish(await toBlob(c, outMime, q));
          break;
        }
        case 'base64': {
          const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
          setOut({ text: dataUrl, stats: [['Length', `${dataUrl.length.toLocaleString()} chars`]] });
          break;
        }
        case 'from-base64': {
          const raw = (opts.data || '').trim().replace(/^data:[^,]*,/, '');
          const bin = atob(raw);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          finish(new Blob([bytes], { type: 'image/png' }));
          break;
        }
        case 'metadata': {
          const { img } = await loadImg(file);
          const rows = [
            ['Name', file.name], ['Type', file.type || 'unknown'], ['Size', fmtSize(file.size)],
            ['Dimensions', `${img.naturalWidth} × ${img.naturalHeight}px`],
            ['Last modified', new Date(file.lastModified).toLocaleString()],
            ['Megapixels', ((img.naturalWidth * img.naturalHeight) / 1e6).toFixed(1) + ' MP'],
          ];
          setOut({ stats: rows });
          break;
        }
        case 'strip-meta': {
          const { c } = await canvasOf(file); // re-encoding drops EXIF/metadata
          finish(await toBlob(c, outMime, q), { stats: [['Note', 'Re-encoded — EXIF/metadata removed']] });
          break;
        }
        case 'split': {
          const { img } = await loadImg(file);
          const cols = Math.max(1, parseInt(o.cols) || 2);
          const rows = Math.max(1, parseInt(o.rows) || 1);
          const cw = Math.floor(img.naturalWidth / cols), ch = Math.floor(img.naturalHeight / rows);
          const pieces = [];
          for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
            const c = document.createElement('canvas');
            c.width = cw; c.height = ch;
            c.getContext('2d').drawImage(img, col * cw, r * ch, cw, ch, 0, 0, cw, ch);
            pieces.push(await toBlob(c, outMime, q));
          }
          // bundle into zip via JSZip (already a dep)
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          pieces.forEach((b, i) => zip.file(`piece-${String(i + 1).padStart(2, '0')}.${o.format || 'png'}`, b));
          finish(await zip.generateAsync({ type: 'blob' }), { stats: [['Pieces', String(pieces.length)]], zipName: 'image-pieces.zip' });
          break;
        }
        case 'merge': {
          if (files.length < 2) throw new Error('Choose at least 2 images to merge.');
          const imgs = await Promise.all(files.map((f) => loadImg(f)));
          const dir = o.direction || 'horizontal';
          const w = dir === 'horizontal' ? imgs.reduce((s, { img }) => s + img.naturalWidth, 0) : Math.max(...imgs.map((i) => i.img.naturalWidth));
          const h = dir === 'horizontal' ? Math.max(...imgs.map((i) => i.img.naturalHeight)) : imgs.reduce((s, { img }) => s + img.naturalHeight, 0);
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
          let off = 0;
          for (const { img } of imgs) {
            ctx.drawImage(img, dir === 'horizontal' ? off : 0, dir === 'horizontal' ? 0 : off);
            off += dir === 'horizontal' ? img.naturalWidth : img.naturalHeight;
          }
          finish(await toBlob(c, outMime, q));
          break;
        }
        case 'upscale': {
          const { img } = await loadImg(file);
          const scale = parseFloat(o.scale || 2);
          const c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * scale);
          c.height = Math.round(img.naturalHeight * scale);
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, c.width, c.height);
          finish(await toBlob(c, outMime, q), { stats: [['New size', `${c.width} × ${c.height}px`]] });
          break;
        }
        case 'passport': {
          const { img } = await loadImg(file);
          // passport photo: 35×45mm @300dpi ≈ 413×531px — center-crop to ratio
          const ratio = 413 / 531;
          let sw = img.naturalWidth, sh = img.naturalHeight;
          if (sw / sh > ratio) sw = sh * ratio; else sh = sw / ratio;
          const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
          const one = document.createElement('canvas');
          one.width = 413; one.height = 531;
          one.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, 413, 531);
          if ((o.copies || 6) > 1) {
            // 4×6" sheet @300dpi = 1200×1800
            const sheet = document.createElement('canvas');
            sheet.width = 1200; sheet.height = 1800;
            const ctx = sheet.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1200, 1800);
            const n = Math.min(parseInt(o.copies) || 6, 8);
            for (let i = 0; i < n; i++) ctx.drawImage(one, 60 + (i % 2) * (413 + 240), 60 + Math.floor(i / 2) * (531 + 80));
            finish(await toBlob(sheet, 'image/jpeg', 0.92), { stats: [['Layout', `${n} photos on 4×6" sheet`]] });
          } else finish(await toBlob(one, 'image/jpeg', 0.95), { stats: [['Size', '413 × 531px (35×45mm @300dpi)']] });
          break;
        }
        case 'bgremove': {
          // chroma-key background removal — sample the top-left pixel, drop similar colors
          const { c, ctx } = await canvasOf(file);
          const tol = Math.max(0, Math.min(255, parseInt(o.tolerance ?? 32)));
          const data = ctx.getImageData(0, 0, c.width, c.height);
          const px = data.data;
          const [br, bg, bb] = [px[0], px[1], px[2]];
          for (let i = 0; i < px.length; i += 4) {
            const d = Math.abs(px[i] - br) + Math.abs(px[i + 1] - bg) + Math.abs(px[i + 2] - bb);
            if (d <= tol * 3) px[i + 3] = 0;
          }
          ctx.putImageData(data, 0, 0);
          finish(await toBlob(c, 'image/png', 1), { stats: [['Background color', `#${[br, bg, bb].map((v) => v.toString(16).padStart(2, '0')).join('')}`], ['Note', 'Works best on solid backgrounds']] });
          break;
        }
        case 'colorpick': {
          // interactive — render preview, click picks color
          await loadImg(file); // validates the image decodes
          setOut({ previewOnly: true });
          viewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          break;
        }
        default:
          throw new Error('Unknown operation');
      }
    } catch (e) {
      setErr(e.message || 'Could not process that image.');
    } finally {
      setBusy(false);
    }
  };

  const pickColor = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * el.naturalWidth;
    const y = ((e.clientY - rect.top) / rect.height) * el.naturalHeight;
    const c = document.createElement('canvas');
    c.width = 1; c.height = 1;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(el, Math.floor(x), Math.floor(y), 1, 1, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    setPicked('#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''));
  };

  const needFile = def.op !== 'from-base64';
  const canRun = needFile ? (multi ? files.length >= 2 : !!file) : !!opts.data;

  return (
    <div className="space-y-4">
      {needFile && (
        <FileDrop
          onFiles={pick}
          accept="image/*"
          multiple={multi}
          initial={def.initialFiles}
          label={multi ? 'Drop images here or browse' : 'Drop an image here or browse'}
          hint={multi ? 'Select 2+ images to combine' : 'Processed locally — never uploaded'}
        />
      )}

      {file && !multi && (
        <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
          <span className="font-bold text-slate-700 truncate">{file.name}</span>
          <span className="shrink-0">{fmtSize(file.size)}</span>
        </div>
      )}
      {multi && files.length > 0 && (
        <p className="text-xs text-slate-500 font-semibold">{files.length} images selected</p>
      )}

      {def.op === 'from-base64' && (
        <Field label="Base64 string">
          <textarea
            rows={5}
            value={opts.data || ''}
            onChange={(e) => setOpts({ ...opts, data: e.target.value })}
            placeholder="Paste base64 or a data URL…"
            className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </Field>
      )}

      {def.options?.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {def.options.map((o) => (
            <Field key={o.key} label={o.label} hint={o.hint}>
              {o.type === 'select' ? (
                <Select value={opts[o.key]} onChange={(v) => setOpts({ ...opts, [o.key]: v })} options={o.options} />
              ) : o.type === 'number' ? (
                <NumInput value={opts[o.key]} onChange={(v) => setOpts({ ...opts, [o.key]: v })} min={o.min} max={o.max} step={o.step} placeholder={o.placeholder} />
              ) : (
                <Input value={opts[o.key]} onChange={(e) => setOpts({ ...opts, [o.key]: e.target.value })} placeholder={o.placeholder} />
              )}
            </Field>
          ))}
        </div>
      )}

      <Btn onClick={run} disabled={!canRun || busy}>{busy ? 'Working…' : def.action || 'Process'}</Btn>
      {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}

      {out?.previewOnly && imgUrl && (
        <ResultBox label="Click the image to pick a color">
          <img ref={viewRef} src={imgUrl} alt="Pick a color" onClick={pickColor} className="max-h-80 rounded-xl cursor-crosshair border border-slate-200" />
          {picked && (
            <div className="mt-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-slate-200" style={{ background: picked }} />
              <span className="font-mono font-bold text-slate-700">{picked}</span>
              <CopyBtn text={picked} />
            </div>
          )}
        </ResultBox>
      )}

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

      {out?.text && (
        <ResultBox label="Base64 output" copyText={out.text}>
          <p className="font-mono text-[11px] text-slate-500 break-all max-h-32 overflow-y-auto">{out.text.slice(0, 500)}…</p>
          <DownloadBtn text={out.text} filename="image.txt" label="Download .txt" variant="ghost" className="mt-2" />
        </ResultBox>
      )}

      {out?.dataUrl && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
          <img src={out.dataUrl} alt="Result" className="max-h-80 mx-auto rounded-xl shadow-sm" />
          <DownloadBtn
            blob={out.blob}
            filename={out.zipName || `${def.id || 'image'}.${opts.format || 'png'}`}
            className="justify-center"
          />
        </div>
      )}
    </div>
  );
}
