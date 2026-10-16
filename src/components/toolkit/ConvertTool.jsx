import { useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Field, NumInput, Select, ResultBox } from './bits';

/**
 * Unit converter engine. def = {
 *   units: { key: { label, toBase } },  // toBase: multiply value -> base unit
 *   defaultFrom, defaultTo, baseLabel, note
 * }
 */
// Non-linear converters that can't use a plain multiplier table.
const CUSTOM = {
  temperature: {
    units: {
      c: { label: 'Celsius (°C)' }, f: { label: 'Fahrenheit (°F)' }, k: { label: 'Kelvin (K)' },
    },
    toC: { c: (v) => v, f: (v) => (v - 32) * 5 / 9, k: (v) => v - 273.15 },
    fromC: { c: (v) => v, f: (v) => v * 9 / 5 + 32, k: (v) => v + 273.15 },
    run: (v, from, to) => CUSTOM.temperature.fromC[to](CUSTOM.temperature.toC[from](v)),
  },
  fuel: {
    units: {
      l100: { label: 'L/100km' }, mpgus: { label: 'MPG (US)' }, mpguk: { label: 'MPG (UK)' }, kml: { label: 'km/L' },
    },
    // base = L/100km; reciprocal units convert inversely
    run: (v, from, to) => {
      const toBase = { l100: (x) => x, mpgus: (x) => 235.214583 / x, mpguk: (x) => 282.480936 / x, kml: (x) => 100 / x };
      const fromBase = { l100: (x) => x, mpgus: (x) => 235.214583 / x, mpguk: (x) => 282.480936 / x, kml: (x) => 100 / x };
      return fromBase[to](toBase[from](v));
    },
  },
};

export default function ConvertTool({ def }) {
  const custom = def.custom ? CUSTOM[def.custom] : null;
  const units = custom ? custom.units : def.units;
  const unitKeys = Object.keys(units);
  const [from, setFrom] = useState(def.defaultFrom || unitKeys[0]);
  const [to, setTo] = useState(def.defaultTo || unitKeys[1] || unitKeys[0]);
  const [val, setVal] = useState('');

  const result = useMemo(() => {
    const n = parseFloat(val);
    if (isNaN(n)) return null;
    const out = custom
      ? custom.run(n, from, to)
      : (n * units[from].toBase) / units[to].toBase;
    return Math.abs(out) < 1e-4 || Math.abs(out) > 1e9
      ? out.toExponential(6)
      : +out.toFixed(8);
  }, [val, from, to, def, custom, units]);

  const swap = () => { setFrom(to); setTo(from); };

  return (
    <div className="space-y-4">
      <Field label="Value">
        <NumInput value={val} onChange={setVal} placeholder="Enter a value…" step="any" />
      </Field>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Field label="From">
          <Select value={from} onChange={setFrom} options={unitKeys.map((k) => ({ value: k, label: units[k].label }))} />
        </Field>
        <button onClick={swap} aria-label="Swap units" className="mb-1 p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-500 text-slate-500 transition cursor-pointer">
          <ArrowLeftRight className="w-4 h-4" />
        </button>
        <Field label="To">
          <Select value={to} onChange={setTo} options={unitKeys.map((k) => ({ value: k, label: units[k].label }))} />
        </Field>
      </div>

      {result != null && (
        <ResultBox label="Converted value" copyText={String(result)}>
          <div className="text-2xl font-black text-slate-800">
            {result} <span className="text-sm font-bold text-rose-500">{units[to].label}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {val} {units[from].label} = {result} {units[to].label}
          </p>
        </ResultBox>
      )}
      {def.note && <p className="text-[11px] text-slate-400">{def.note}</p>}
    </div>
  );
}
