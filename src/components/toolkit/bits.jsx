import React, { useEffect, useState, useRef } from 'react';
import { Copy, Check, UploadCloud } from 'lucide-react';

/* Shared UI primitives for the toolkit engines (components only — helpers live in utils.js) */

export const Btn = ({ children, onClick, variant = 'primary', className = '', disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`pf-press px-4 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
      variant === 'primary'
        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm'
        : variant === 'ghost'
          ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
    } ${className}`}
  >
    {children}
  </button>
);

export const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="block text-xs font-bold text-slate-600 mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-[10px] text-slate-400 mt-1">{hint}</span>}
  </label>
);

export const Input = (props) => (
  <input
    {...props}
    className={`w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition ${props.className || ''}`}
  />
);

export const NumInput = ({ value, onChange, ...rest }) => (
  <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
);

export const Select = ({ value, onChange, options, className = '' }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition cursor-pointer ${className}`}
  >
    {options.map((o) => (
      <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
    ))}
  </select>
);

export const TextArea = (props) => (
  <textarea
    {...props}
    className={`w-full text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition resize-y ${props.className || ''}`}
  />
);

export const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(typeof text === 'function' ? text() : text); } catch { /* clipboard unavailable */ }
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-500 transition cursor-pointer"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

export const ResultBox = ({ label = 'Result', children, copyText }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {copyText != null && <CopyBtn text={copyText} />}
    </div>
    {children}
  </div>
);

export const FileDrop = ({ onFiles, accept, multiple = false, directory = false, label, hint, initial }) => {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const dirProps = directory ? { webkitdirectory: '', directory: '' } : {};
  // assistant attachments — auto-load files handed over from chat
  useEffect(() => { if (initial?.length) onFiles([...initial]); }, []);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onFiles([...e.dataTransfer.files]);
      }}
      onClick={() => inputRef.current?.click()}
      className={`group border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        drag ? 'border-rose-500 bg-rose-50/60' : 'border-slate-200 hover:border-rose-400 bg-slate-50/50 hover:bg-rose-50/30'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple || directory}
        accept={accept}
        {...dirProps}
        className="hidden"
        onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }}
      />
      <UploadCloud className={`w-9 h-9 mx-auto transition-transform duration-200 ${drag ? 'text-rose-500 -translate-y-0.5 scale-105' : 'text-slate-400 group-hover:-translate-y-0.5'}`} />
      <p className="mt-2 text-sm font-medium text-slate-700">{label || 'Drop a file here or browse'}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
};
