import React, { useMemo, useState } from 'react';
import { Btn, CopyBtn, Field, Input, NumInput, ResultBox } from './bits';

import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, contrastRatio } from './colorMath';

const Picker = ({ val, set, label }) => (
  <Field label={label}>
    <div className="flex gap-2">
      <input type="color" value={val} onChange={(e) => set(e.target.value)} className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer bg-slate-50" />
      <Input value={val} onChange={(e) => set(e.target.value)} className="font-mono" />
    </div>
  </Field>
);

const Swatch = ({ hex, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="w-full h-14 rounded-xl border border-slate-200 shadow-sm" style={{ background: hex }} />
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-mono font-bold text-slate-500">{label || hex}</span>
      <CopyBtn text={hex} />
    </div>
  </div>
);

/**
 * Color tool engine. def.mode: 'convert' | 'palette' | 'shades' | 'tints' | 'contrast' | 'mixer' | 'random'
 * def.in/out for single-direction converters: 'hex'|'rgb'|'hsl'
 */
export default function ColorTool({ def }) {
  const [color, setColor] = useState('#f43f5e');
  const [color2, setColor2] = useState('#1e293b');
  const [text, setText] = useState('');
  const [ratio, setRatio] = useState(0.5);
  const [count, setCount] = useState(8);

  const rgb = hexToRgb(color) || { r: 0, g: 0, b: 0 };
  const rgb2 = hexToRgb(color2) || { r: 0, g: 0, b: 0 };
  const hsl = rgbToHsl(rgb);

  // parse input text for convert mode (hex / rgb() / hsl())
  const parsedInput = useMemo(() => {
    const t = text.trim();
    let m = t.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) return hexToRgb(m[1]);
    m = t.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    m = t.match(/hsla?\(\s*([\d.]+)[\s,°]+([\d.]+)%?[\s,]+([\d.]+)%?/i);
    if (m) return hslToRgb({ h: +m[1], s: +m[2], l: +m[3] });
    return null;
  }, [text]);

  const harmonies = useMemo(() => {
    const base = rgbToHsl(rgb);
    const H = (d) => rgbToHex(hslToRgb({ h: (base.h + d + 360) % 360, s: base.s, l: base.l }));
    return [
      { name: 'Complementary', colors: [color, H(180)] },
      { name: 'Analogous', colors: [H(-30), color, H(30)] },
      { name: 'Triadic', colors: [color, H(120), H(240)] },
      { name: 'Split-complementary', colors: [color, H(150), H(210)] },
      { name: 'Square', colors: [color, H(90), H(180), H(270)] },
    ];
  }, [color]); // eslint-disable-line react-hooks/exhaustive-deps

  const shades = useMemo(() =>
    Array.from({ length: count }, (_, i) => {
      const l = 5 + (90 * i) / Math.max(1, count - 1);
      return rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l }));
    }), [color, count]); // eslint-disable-line react-hooks/exhaustive-deps

  const tints = useMemo(() =>
    Array.from({ length: count }, (_, i) => {
      const f = (i + 1) / (count + 1);
      return rgbToHex({ r: rgb.r + (255 - rgb.r) * f, g: rgb.g + (255 - rgb.g) * f, b: rgb.b + (255 - rgb.b) * f });
    }), [color, count]); // eslint-disable-line react-hooks/exhaustive-deps

  const mixed = useMemo(() =>
    rgbToHex({ r: rgb.r + (rgb2.r - rgb.r) * ratio, g: rgb.g + (rgb2.g - rgb.g) * ratio, b: rgb.b + (rgb2.b - rgb.b) * ratio }),
    [color, color2, ratio]); // eslint-disable-line react-hooks/exhaustive-deps

  const randomColor = () => setColor('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));

  const cr = contrastRatio(rgb, rgb2);
  const grade = cr >= 7 ? 'AAA' : cr >= 4.5 ? 'AA' : cr >= 3 ? 'AA Large' : 'Fail';

  switch (def.mode) {
    case 'convert': {
      const rgbOut = parsedInput || rgb;
      const hslOut = rgbToHsl(rgbOut);
      return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Picker val={color} set={setColor} label="Pick a color" />
            <Field label="…or paste a color (hex / rgb() / hsl())">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="#f43f5e or rgb(244,63,94)" className="font-mono" />
            </Field>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['HEX', rgbToHex(rgbOut)],
              ['RGB', `rgb(${rgbOut.r}, ${rgbOut.g}, ${rgbOut.b})`],
              ['HSL', `hsl(${hslOut.h}, ${hslOut.s}%, ${hslOut.l}%)`],
              ['CSS var', `--color: ${rgbToHex(rgbOut)};`],
            ].map(([k, v]) => (
              <ResultBox key={k} label={k} copyText={v}>
                <p className="font-mono text-sm font-bold text-slate-700 break-all">{v}</p>
              </ResultBox>
            ))}
          </div>
          <div className="h-20 rounded-2xl border border-slate-200 shadow-inner" style={{ background: rgbToHex(rgbOut) }} />
        </div>
      );
    }
    case 'palette':
      return (
        <div className="space-y-5">
          <Picker val={color} set={setColor} label="Base color" />
          {harmonies.map((h) => (
            <div key={h.name}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{h.name}</p>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${h.colors.length},1fr)` }}>
                {h.colors.map((c, i) => <Swatch key={i} hex={c} />)}
              </div>
            </div>
          ))}
        </div>
      );
    case 'shades':
    case 'tints': {
      const list = def.mode === 'shades' ? shades : tints;
      return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Picker val={color} set={setColor} label="Base color" />
            <Field label={`Number of ${def.mode}`}><NumInput value={count} onChange={setCount} min={3} max={20} /></Field>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {list.map((c, i) => <Swatch key={i} hex={c} />)}
          </div>
        </div>
      );
    }
    case 'contrast':
      return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Picker val={color} set={setColor} label="Foreground" />
            <Picker val={color2} set={setColor2} label="Background" />
          </div>
          <div className="rounded-2xl border border-slate-200 p-8 text-center" style={{ background: color2 }}>
            <p className="text-xl font-black" style={{ color }}>The quick brown fox jumps</p>
            <p className="text-sm mt-1" style={{ color }}>Small text sample — AaBbCc 123</p>
          </div>
          <ResultBox label="Contrast ratio" copyText={`${cr.toFixed(2)}:1`}>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-slate-800">{cr.toFixed(2)}:1</span>
              <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${cr >= 4.5 ? 'bg-emerald-100 text-emerald-700' : cr >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                WCAG {grade}
              </span>
            </div>
          </ResultBox>
        </div>
      );
    case 'mixer':
      return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Picker val={color} set={setColor} label="Color A" />
            <Picker val={color2} set={setColor2} label="Color B" />
          </div>
          <Field label={`Mix ratio — ${Math.round(ratio * 100)}% B`}>
            <input type="range" min="0" max="1" step="0.01" value={ratio} onChange={(e) => setRatio(+e.target.value)} className="w-full accent-rose-500" />
          </Field>
          <ResultBox label="Mixed color" copyText={mixed}>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl border border-slate-200" style={{ background: mixed }} />
              <span className="font-mono text-lg font-bold text-slate-700">{mixed}</span>
            </div>
          </ResultBox>
        </div>
      );
    case 'random':
    default:
      return (
        <div className="space-y-4 text-center">
          <div className="h-32 rounded-2xl border border-slate-200 shadow-inner" style={{ background: color }} />
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-xl font-black text-slate-800">{color}</span>
            <CopyBtn text={color} />
          </div>
          <Btn onClick={randomColor}>Random Color</Btn>
        </div>
      );
  }
}
