import { useMemo, useState } from 'react';
import {
  ArrowLeft, Download, Printer, Plus, Trash2, Eye, Loader2, RotateCcw, FileText,
} from 'lucide-react';
import { initValues, sampleValues, mergeWithSample, calcTotals, money } from '../utils/templateValues';
import { generateTemplatePdf, downloadPdf, printPdf } from '../utils/templatePdf';
import { trackTemplate } from '../utils/templatesApi';
import TemplateDoc from './TemplateDoc';

const inputCls =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition';

const Lbl = ({ children, required }) => (
  <label className="block text-[10px] font-bold text-slate-500 mb-1">
    {children}{required && <span className="text-rose-500"> *</span>}
  </label>
);

// one field control (all schema types)
function FieldControl({ fd, value, onChange }) {
  const common = { value: value ?? '', onChange: (e) => onChange(e.target.value) };
  switch (fd.type) {
    case 'longtext':
    case 'address':
      return <textarea {...common} rows={fd.type === 'address' ? 2 : 4} placeholder={fd.placeholder || fd.label} className={inputCls} />;
    case 'number':
    case 'currency':
      return <input {...common} type="number" step="any" placeholder={fd.placeholder || '0'} className={inputCls} />;
    case 'date':
      return <input {...common} type="date" className={inputCls} />;
    case 'email':
      return <input {...common} type="email" placeholder="name@example.com" className={inputCls} />;
    case 'phone':
      return <input {...common} type="tel" placeholder="+1 555 000 0000" className={inputCls} />;
    case 'select':
      return (
        <select {...common} className={`${inputCls} cursor-pointer`}>
          <option value="">— select —</option>
          {(fd.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer py-1">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="accent-rose-500 w-4 h-4" />
          {fd.label}
        </label>
      );
    case 'image':
      return (
        <div className="flex items-center gap-2">
          {value && <img src={value} alt="" className="h-8 w-8 object-contain border border-slate-200 rounded" />}
          <label className="flex-1 text-center text-[10px] font-bold text-rose-500 hover:text-rose-600 border border-dashed border-slate-300 rounded-xl py-2 cursor-pointer">
            {value ? 'Change image' : 'Upload image'}
            <input
              type="file" accept="image/png,image/jpeg" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = () => onChange(r.result);
                r.readAsDataURL(f);
              }}
            />
          </label>
        </div>
      );
    default:
      return <input {...common} type="text" placeholder={fd.placeholder || fd.label} className={inputCls} />;
  }
}

export default function TemplateEditor({ tpl, onBack }) {
  const [values, setValues] = useState(() => initValues(tpl));
  const [busy, setBusy] = useState('');
  const [previewPdf, setPreviewPdf] = useState(null); // blob url
  const [showPreview, setShowPreview] = useState(true);
  const totals = useMemo(() => calcTotals(tpl, values), [tpl, values]);
  // preview shows real input merged over demo content so it always looks complete
  const previewValues = useMemo(() => mergeWithSample(tpl, values), [tpl, values]);

  const setField = (sKey, fKey, val) =>
    setValues((v) => ({ ...v, [sKey]: { ...v[sKey], [fKey]: val } }));

  const setRow = (sKey, idx, fKey, val) =>
    setValues((v) => ({
      ...v,
      [sKey]: v[sKey].map((r, i) => (i === idx ? { ...r, [fKey]: val } : r)),
    }));

  const addRow = (s) =>
    setValues((v) => ({
      ...v,
      [s.key]: [...(v[s.key] || []), Object.fromEntries(s.fields.map((fd) => [fd.key, fd.default ?? '']))],
    }));

  const removeRow = (sKey, idx) =>
    setValues((v) => ({ ...v, [sKey]: v[sKey].filter((_, i) => i !== idx) }));

  const doGenerate = async (action) => {
    setBusy(action);
    try {
      const bytes = await generateTemplatePdf(tpl, values);
      if (action === 'download') {
        downloadPdf(bytes, `${tpl.slug}.pdf`);
      } else if (action === 'print') {
        printPdf(bytes);
      } else {
        if (previewPdf) URL.revokeObjectURL(previewPdf);
        setPreviewPdf(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })));
      }
      trackTemplate(tpl.id, action === 'download' ? 'download' : 'use');
    } catch (e) {
      alert(`Could not generate PDF: ${e.message}`);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* top bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-20">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer shrink-0">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="min-w-0 text-center">
          <h1 className="text-sm font-black text-slate-900 truncate">{tpl.name}</h1>
          <p className="text-[10px] text-slate-400">{tpl.categoryName} · fill fields → generate PDF</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer lg:hidden"
            title="Toggle preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setValues(sampleValues(tpl))}
            title="Fill with sample data"
            className="hidden sm:flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-slate-500 hover:text-rose-600 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Sample
          </button>
          <button
            onClick={() => doGenerate('print')}
            disabled={!!busy}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={() => doGenerate('download')}
            disabled={!!busy}
            className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            {busy === 'download' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download PDF
          </button>
        </div>
      </div>

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* form */}
        <div className={`w-full lg:w-[440px] shrink-0 overflow-y-auto p-4 sm:p-6 space-y-5 ${showPreview ? 'hidden lg:block' : ''}`}>
          {(tpl.sections || []).map((s) => {
            if (s.type === 'signature') {
              return (
                <div key={s.key} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <h3 className="text-xs font-black text-slate-800 mb-1">{s.title}</h3>
                  <p className="text-[10px] text-slate-400">
                    {(s.parties || []).join(' · ')} — signature lines are added to the PDF automatically.
                  </p>
                </div>
              );
            }
            if (s.type === 'group') {
              const rows = values[s.key] || [];
              return (
                <div key={s.key} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-black text-slate-800">{s.title}</h3>
                  {rows.map((row, i) => (
                    <div key={i} className="border border-slate-100 rounded-xl p-3 space-y-2.5 bg-slate-50/60 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400">#{i + 1}</span>
                        {rows.length > (s.min ?? 1) && (
                          <button
                            onClick={() => removeRow(s.key, i)}
                            className="p-1 text-slate-300 hover:text-rose-500 rounded cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {s.fields.map((fd) => (
                          <div key={fd.key} className={fd.span === 2 ? 'col-span-2' : ''}>
                            {fd.type !== 'checkbox' && <Lbl required={fd.required}>{fd.label}</Lbl>}
                            <FieldControl fd={fd} value={row[fd.key]} onChange={(val) => setRow(s.key, i, fd.key, val)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => addRow(s)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-rose-500 hover:text-rose-600 border border-dashed border-rose-300 rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> {s.addLabel || 'Add row'}
                  </button>

                  {/* live totals for money tables */}
                  {s.key === 'items' && totals && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Subtotal</span><span className="font-bold">{money(totals.subtotal)}</span>
                      </div>
                      {totals.tax > 0 && (
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Tax</span><span className="font-bold">{money(totals.tax)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-black text-slate-800">
                        <span>Total</span><span>{money(totals.total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            // fields section
            return (
              <div key={s.key} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-black text-slate-800">{s.title}</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {s.fields.map((fd) => (
                    <div key={fd.key} className={fd.span === 2 || ['longtext', 'address', 'image'].includes(fd.type) ? 'col-span-2' : ''}>
                      {fd.type !== 'checkbox' && <Lbl required={fd.required}>{fd.label}</Lbl>}
                      <FieldControl fd={fd} value={values[s.key]?.[fd.key]} onChange={(val) => setField(s.key, fd.key, val)} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {tpl.disclaimer && (
            <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-relaxed">
              {tpl.disclaimer}
            </p>
          )}
        </div>

        {/* live preview */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-8 ${showPreview ? '' : 'hidden lg:block'}`}>
          <div className="max-w-[680px] mx-auto space-y-4">
            {previewPdf ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Generated PDF preview
                  </p>
                  <button
                    onClick={() => { URL.revokeObjectURL(previewPdf); setPreviewPdf(null); }}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                  >
                    Back to live preview
                  </button>
                </div>
                <iframe src={previewPdf} title="PDF preview" className="w-full h-[75vh] bg-white border border-slate-200 rounded-xl shadow" />
              </div>
            ) : (
              <>
                <TemplateDoc tpl={tpl} values={previewValues} />
                <button
                  onClick={() => doGenerate('preview')}
                  disabled={!!busy}
                  className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-2xl transition disabled:opacity-50 cursor-pointer"
                >
                  {busy === 'preview' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  Generate & Preview PDF
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
