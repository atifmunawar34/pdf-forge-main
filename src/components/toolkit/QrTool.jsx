import React, { useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import jsQR from 'jsqr';
import { Download, ScanLine } from 'lucide-react';
import { Btn, Field, Input, NumInput, ResultBox, FileDrop } from './bits';

/**
 * QR / barcode engine.
 * def.mode:
 *   'qr'      — fields -> payload -> QR png/svg (custom size/colors/margin)
 *   'scan'    — upload image -> decode QR (jsQR) or barcode (BarcodeDetector)
 *   'barcode' — value -> JsBarcode svg
 */
export default function QrTool({ def }) {
  const init = useMemo(
    () => Object.fromEntries((def.fields || []).map((f) => [f.key, f.default ?? ''])),
    [def]
  );
  const [vals, setVals] = useState(init);
  const [size, setSize] = useState(256);
  const [fg, setFg] = useState('#111827');
  const [bgc, setBgc] = useState('#ffffff');
  const [margin, setMargin] = useState(2);
  const [dataUrl, setDataUrl] = useState(null);
  const [svg, setSvg] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanErr, setScanErr] = useState('');
  const [err, setErr] = useState('');
  const canvasRef = useRef(null);

  const payload = useMemo(() => (def.build ? def.build(vals) : Object.values(vals).filter(Boolean).join('\n')), [vals, def]);

  const makeQr = async () => {
    if (!payload.trim()) return;
    try {
      setErr('');
      setDataUrl(await QRCode.toDataURL(payload, {
        width: Number(size) || 256, margin: Number(margin) || 2,
        color: { dark: fg, light: bgc },
      }));
    } catch (e) { setErr(e.message || 'Could not generate QR code.'); }
  };

  const makeBarcode = () => {
    if (!payload.trim()) return;
    try {
      setErr('');
      const el = document.createElement('canvas');
      JsBarcode(el, payload, {
        format: def.barcodeFormat || 'CODE128',
        width: 2, height: 90, displayValue: true, fontSize: 14, margin: 12,
        lineColor: fg, background: bgc,
      });
      setSvg(el.toDataURL('image/png'));
    } catch (e) { setErr(e.message || 'Invalid characters for this barcode type.'); }
  };

  const scanImage = async (files) => {
    const file = files?.[0];
    if (!file) return;
    setScanResult(null); setScanErr('');
    try {
      const bmp = await createImageBitmap(file);
      const c = document.createElement('canvas');
      c.width = bmp.width; c.height = bmp.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bmp, 0, 0);
      const img = ctx.getImageData(0, 0, c.width, c.height);
      // Try QR first
      const qr = jsQR(img.data, c.width, c.height);
      if (qr?.data) { setScanResult({ type: 'QR Code', data: qr.data }); return; }
      // Try 1D barcode via the native BarcodeDetector where available
      if ('BarcodeDetector' in window) {
        const det = new window.BarcodeDetector();
        const found = await det.detect(bmp);
        if (found?.length) { setScanResult({ type: found[0].format, data: found[0].rawValue }); return; }
      }
      setScanErr('No code found. Try a clearer, sharper image.');
    } catch { setScanErr('Could not read that image.'); }
  };

  if (def.mode === 'scan') {
    return (
      <div className="space-y-4">
        <FileDrop onFiles={scanImage} accept="image/*" initial={def.initialFiles} label="Drop a QR/barcode image here" hint="PNG, JPG or screenshot — decoded locally in your browser" />
        {scanErr && <p className="text-xs text-red-500 font-semibold">{scanErr}</p>}
        {scanResult && (
          <ResultBox label={`Detected ${scanResult.type}`} copyText={scanResult.data}>
            <p className="text-sm text-slate-700 break-all font-mono">{scanResult.data}</p>
          </ResultBox>
        )}
      </div>
    );
  }

  const isBarcode = def.mode === 'barcode';
  const out = isBarcode ? svg : dataUrl;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {(def.fields || [{ key: 'text', label: isBarcode ? 'Barcode value' : 'Content', placeholder: isBarcode ? 'e.g. 123456789012' : 'Text or URL…' }]).map((f) => (
          <Field key={f.key} label={f.label}>
            <Input value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} placeholder={f.placeholder} />
          </Field>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {!isBarcode && (
          <Field label="Size (px)"><NumInput value={size} onChange={setSize} min={64} max={1024} /></Field>
        )}
        <Field label="Foreground">
          <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 cursor-pointer bg-slate-50" />
        </Field>
        <Field label="Background">
          <input type="color" value={bgc} onChange={(e) => setBgc(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 cursor-pointer bg-slate-50" />
        </Field>
        {!isBarcode && (
          <Field label="Margin"><NumInput value={margin} onChange={setMargin} min={0} max={8} /></Field>
        )}
      </div>

      <Btn onClick={isBarcode ? makeBarcode : makeQr} disabled={!payload.trim()}>
        <span className="flex items-center gap-1.5"><ScanLine className="w-4 h-4" /> {def.action || 'Generate'}</span>
      </Btn>
      {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}

      {out && (
        <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <img src={out} alt={isBarcode ? 'Barcode' : 'QR code'} className="max-w-full rounded-lg shadow-sm bg-white p-2" />
          <Btn variant="secondary" onClick={() => {
            const a = document.createElement('a');
            a.href = out;
            a.download = `${def.id || 'code'}.png`;
            a.click();
          }}>
            <span className="flex items-center gap-1.5"><Download className="w-4 h-4" /> Download PNG</span>
          </Btn>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
