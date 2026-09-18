import { calcTotals, money } from '../utils/templateValues';

// HTML "paper" preview of a template + values (mirrors the PDF layouts).
const sec = (tpl, key) => (tpl.sections || []).find((s) => s.key === key);

const ACCENT_HEX = {
  rose: '#f43f5e', navy: '#1a2b54', teal: '#0f766e', gold: '#a8843a',
  emerald: '#047857', slate: '#2d3a4d', charcoal: '#20242b', blue: '#2456b8',
  violet: '#7c3aed', indigo: '#4338ca', crimson: '#be123c', orange: '#ea580c',
  sky: '#0284c7', plum: '#86198f', olive: '#4d7c0f',
};
const accentHex = (tpl) => ACCENT_HEX[tpl.accent] || ACCENT_HEX.rose;

const Label = ({ children }) => (
  <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">{children}</div>
);

const FieldPairs = ({ s, vals }) => (
  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
    {(s.fields || []).filter((f) => f.type !== 'image').map((f) => {
      const v = vals?.[f.key];
      const str = f.type === 'checkbox' ? (v ? 'Yes' : 'No')
        : f.type === 'currency' ? (v === '' || v == null ? '—' : money(v))
        : (v === '' || v == null || v === false ? '—' : String(v));
      return (
        <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
          <Label>{f.label}</Label>
          <div className="text-[11px] text-slate-800 whitespace-pre-line">{str}</div>
        </div>
      );
    })}
  </div>
);

const Tbl = ({ s, rows, accent = ACCENT_HEX.rose, theme = 'modern' }) => {
  const hasQP = s.fields.some((f) => f.key === 'qty') && s.fields.some((f) => f.key === 'price');
  const cols = hasQP ? [...s.fields, { key: '_amt', label: 'Amount' }] : s.fields;
  const hdrStyle =
    theme === 'modern' ? { background: accent }
    : theme === 'bold' ? { background: '#1e293b' }
    : theme === 'classic' ? { background: '#e9e9ef' }
    : { borderTop: '2px solid #1e293b', borderBottom: '1px solid #1e293b' };
  const hdrText = theme === 'classic' || theme === 'elegant' ? 'text-slate-700' : 'text-white';
  return (
    <table className="w-full text-[10px]">
      <thead>
        <tr style={hdrStyle}>
          {cols.map((c) => (
            <th key={c.key} className={`text-left px-1.5 py-1 text-[8px] font-bold uppercase tracking-wide ${hdrText}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(rows || []).map((r, i) => (
          <tr key={i} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50' : ''}`}>
            {cols.map((c) => (
              <td key={c.key} className="px-1.5 py-1 text-slate-700 align-top">
                {c.key === '_amt' ? money((parseFloat(r.qty) || 1) * (parseFloat(r.price ?? r.amount) || 0))
                  : c.type === 'checkbox' ? (r[c.key] ? '☑' : '☐')
                  : c.type === 'currency' ? money(r[c.key])
                  : String(r[c.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Doc title band — rendered per theme + variant so templates look different.
const DocTitleBand = ({ title, sub, theme = 'modern', accent = ACCENT_HEX.rose, variant }) => {
  if (theme === 'bold') {
    return variant === 'block' ? (
      <div className="mb-3 -mx-7 -mt-7 px-7 pt-3 pb-4 bg-slate-800 border-t-[5px]" style={{ borderColor: accent }}>
        <div className="text-[19px] font-black text-white">{title.toUpperCase()}</div>
        {sub && <div className="text-[8.5px] text-white/70 mt-0.5">{sub}</div>}
      </div>
    ) : (
      <div className="mb-3 -mx-7 -mt-7 px-7 pt-2.5 pb-3 flex items-center justify-between bg-slate-800 border-t-4" style={{ borderColor: accent }}>
        <div className="text-[15px] font-black text-white">{title.toUpperCase()}</div>
        <div className="text-[8px] text-white/70">{sub}</div>
      </div>
    );
  }
  if (theme === 'classic') {
    return variant === 'left' ? (
      <div className="mb-3">
        <div className="flex items-baseline justify-between">
          <div className="text-[16px] font-bold uppercase text-slate-900">{title}</div>
          {sub && <div className="text-[9px] italic text-slate-500">{sub}</div>}
        </div>
        <div className="border-t border-slate-700 mt-1.5" />
      </div>
    ) : (
      <div className="mb-3 text-center">
        <div className="text-[16px] font-bold uppercase text-slate-900">{title}</div>
        {sub && <div className="text-[9px] italic text-slate-500">{sub}</div>}
        <div className="border-t-2 border-slate-800 mt-1.5" />
        <div className="border-t border-slate-400 mt-[2px]" />
      </div>
    );
  }
  if (theme === 'elegant') {
    return variant === 'center' ? (
      <div className="mb-3 text-center">
        <div className="border-t border-slate-800" />
        <div className="text-[15px] font-bold uppercase text-slate-900 mt-2">{title}</div>
        {sub && <div className="text-[9px] italic text-slate-500 mt-0.5">{sub}</div>}
        <div className="border-t border-slate-800 mt-2" />
      </div>
    ) : (
      <div className="mb-3 text-center">
        <div className="text-[13px] font-bold uppercase tracking-[0.25em] text-slate-900">{title}</div>
        <div className="w-16 h-px mx-auto my-1.5" style={{ background: accent }} />
        {sub && <div className="text-[8.5px] italic text-slate-500">{sub}</div>}
      </div>
    );
  }
  // modern
  if (variant === 'rail') {
    return (
      <div className="mb-3 -mx-7 -mt-7 pl-0 flex items-stretch">
        <div className="w-3.5 shrink-0" style={{ background: accent }} />
        <div className="flex-1 px-5 py-2 flex items-center justify-between border-b-2" style={{ borderColor: accent }}>
          <div className="text-[15px] font-black" style={{ color: accent }}>{title.toUpperCase()}</div>
          <div className="text-[8px] text-slate-400">{sub}</div>
        </div>
      </div>
    );
  }
  if (variant === 'boxed') {
    return (
      <div className="mb-3 border-t-4 border pt-2 pb-2.5 text-center" style={{ borderColor: accent }}>
        <div className="text-[15px] font-black text-slate-900">{title.toUpperCase()}</div>
        {sub && <div className="text-[8px] text-slate-400">{sub}</div>}
      </div>
    );
  }
  return (
    <div className="mb-3 -mx-7 -mt-7 px-7 py-2.5 flex items-center justify-between" style={{ background: accent }}>
      <div className="text-[15px] font-black text-white">{title.toUpperCase()}</div>
      <div className="text-[8px] text-white/80">{sub}</div>
    </div>
  );
};

const Sig = ({ s }) => (
  <div className="flex gap-8 mt-8">
    {(s.parties || []).map((p, i) => (
      <div key={i} className="flex-1">
        <div className="border-b border-slate-400 h-6" />
        <div className="text-[8px] text-slate-500 mt-0.5">{p}</div>
        <div className="text-[8px] text-slate-400 mt-1.5">Date: ____________</div>
      </div>
    ))}
  </div>
);

const SectionTitle = ({ children, accent = ACCENT_HEX.rose, theme = 'modern' }) => {
  if (theme === 'classic') {
    return (
      <div className="mt-4 mb-1.5 text-center">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-800">{children}</div>
        <div className="border-t border-slate-800 mt-1" />
        <div className="border-t border-slate-400 mt-[1px]" />
      </div>
    );
  }
  if (theme === 'elegant') {
    return (
      <div className="mt-4 mb-1.5 flex items-center gap-2">
        <span className="w-[3px] h-3 inline-block" style={{ background: accent }} />
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-800">{children}</div>
      </div>
    );
  }
  if (theme === 'bold') {
    return (
      <div className="mt-4 mb-1.5">
        <span className="inline-block bg-slate-800 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5">{children}</span>
      </div>
    );
  }
  return (
    <div className="mt-4 mb-1.5">
      <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: accent }}>{children}</div>
      <div className="h-px mt-0.5" style={{ background: `${accent}55` }} />
    </div>
  );
};

const ACCENT_BG = {
  slate: 'bg-slate-800', navy: 'bg-[#1a2b54]', teal: 'bg-teal-700',
  gold: 'bg-[#a8843a]', emerald: 'bg-emerald-700', charcoal: 'bg-[#20242b]', rose: 'bg-rose-600',
  blue: 'bg-[#2456b8]',
};
const ACCENT_TX = {
  slate: 'text-slate-700', navy: 'text-[#1a2b54]', teal: 'text-teal-700',
  gold: 'text-[#a8843a]', emerald: 'text-emerald-700', charcoal: 'text-[#20242b]', rose: 'text-rose-600',
  blue: 'text-[#2456b8]',
};
const listItems = (str) => String(str || '').split(/[,\n;•]+/).map((s) => s.trim()).filter(Boolean);

const MTitle = ({ tx, children }) => (
  <div className={`text-[9px] font-black uppercase tracking-wider ${tx} mt-3.5 pb-0.5 border-b border-slate-200`}>{children}</div>
);

// Top-band CV preview: accent bar, photo+name header, sidebar | main columns
function TopbandDoc({ tpl, v }) {
  const pv = v.profile || {};
  const bg = ACCENT_BG[tpl.accent] || ACCENT_BG.blue;
  const tx = ACCENT_TX[tpl.accent] || ACCENT_TX.blue;
  return (
    <div className="bg-white shadow-lg border border-slate-200 rounded-sm w-full min-h-[500px] text-left select-none">
      <div className={`h-2 ${bg}`} />
      {/* header: photo + name */}
      <div className="flex items-center gap-4 px-5 pt-4 pb-2">
        <div className="w-16 h-[74px] shrink-0 bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
          {pv.photo ? (
            <img src={pv.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[9px] text-slate-300 font-bold">PHOTO</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[18px] font-black text-slate-900 leading-tight truncate">{pv.name || 'Your Name'}</div>
          <div className={`text-[11px] font-semibold ${tx}`}>{pv.title}</div>
        </div>
      </div>
      {/* body: sidebar | main */}
      <div className="flex items-stretch">
        <div className={`w-[29%] shrink-0 ${bg} text-white px-3.5 py-3 ml-3 mb-3 flex flex-col`}>
          {[pv.phone, pv.email, pv.location, pv.website].some(Boolean) && (
            <>
              <ST>Contact</ST>
              {[pv.phone, pv.email, pv.location, pv.website].filter(Boolean).map((c, i) => (
                <div key={i} className="text-[7.5px] text-white/85 break-words leading-relaxed">{c}</div>
              ))}
            </>
          )}
          {(v.education || []).length > 0 && (
            <>
              <ST>Education</ST>
              {(v.education || []).map((r, i) => (
                <div key={i} className="mb-2">
                  <div className="text-[7.5px] font-bold text-white">{[r.start, r.end].filter(Boolean).join(' - ')}</div>
                  <div className="text-[7.5px] font-bold text-white uppercase">{r.school}</div>
                  {r.degree && <div className="text-[7.5px] text-white/85">• {r.degree}</div>}
                  {r.gpa && <div className="text-[7.5px] text-white/85">• {r.gpa}</div>}
                </div>
              ))}
            </>
          )}
          {v.skills?.skills && (
            <>
              <ST>Skills</ST>
              {listItems(v.skills.skills).map((s, i) => (
                <div key={i} className="text-[7.5px] text-white/85 leading-relaxed">• {s}</div>
              ))}
            </>
          )}
          {v.extra?.languages && (
            <>
              <ST>Languages</ST>
              {listItems(v.extra.languages).map((s, i) => (
                <div key={i} className="text-[7.5px] text-white/85 leading-relaxed">• {s}</div>
              ))}
            </>
          )}
        </div>
        <div className="flex-1 px-4 py-2 overflow-hidden">
          {v.summary?.summary && (
            <>
              <MTitle tx={tx}>Profile</MTitle>
              <div className="text-[8.5px] text-slate-700 whitespace-pre-line leading-snug mt-1">{v.summary.summary}</div>
            </>
          )}
          {(v.experience || []).length > 0 && (
            <>
              <MTitle tx={tx}>Work Experience</MTitle>
              <div className="space-y-2.5 mt-1.5">
                {(v.experience || []).map((r, i) => (
                  <div key={i} className="relative pl-3">
                    <div className={`absolute left-0 top-1 w-1 h-1 ${bg}`} />
                    <div className="flex justify-between items-baseline gap-2">
                      <div className="text-[10.5px] font-bold text-slate-800">{r.company}</div>
                      <div className={`text-[7.5px] font-bold ${tx} whitespace-nowrap`}>{[r.start, r.end].filter(Boolean).join(' - ')}</div>
                    </div>
                    {r.position && <div className="text-[8.5px] italic text-slate-500">{r.position}</div>}
                    {r.desc && listItems(r.desc).map((l, j) => (
                      <div key={j} className="text-[8px] text-slate-600 leading-snug pl-3">• {l}</div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
          {(v.reference || []).some((r) => r.refName || r.refTitle) && (
            <>
              <MTitle tx={tx}>Reference</MTitle>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1.5">
                {(v.reference || []).filter((r) => r.refName || r.refTitle).map((r, i) => (
                  <div key={i}>
                    <div className="text-[9.5px] font-bold text-slate-800">{r.refName}</div>
                    <div className="text-[8px] text-slate-500">{r.refTitle}</div>
                    {r.refPhone && <div className="text-[7.5px] text-slate-400">Phone: {r.refPhone}</div>}
                    {r.refEmail && <div className="text-[7.5px] text-slate-400 break-words">Email: {r.refEmail}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const ST = ({ children }) => (
  <div className="mt-3 mb-1">
    <div className="text-[8.5px] font-black uppercase tracking-wider text-white">{children}</div>
    <div className="h-0.5 w-6 bg-white/70 mt-0.5" />
  </div>
);

// Sidebar CV preview (Canva-style two-column)
function SidebarDoc({ tpl, v }) {
  const pv = v.profile || {};
  const bg = ACCENT_BG[tpl.accent] || ACCENT_BG.slate;
  const tx = ACCENT_TX[tpl.accent] || ACCENT_TX.slate;
  const initials = (pv.name || 'Y N').split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="bg-white shadow-lg border border-slate-200 rounded-sm w-full min-h-[500px] text-left select-none flex">
      {/* sidebar */}
      <div className={`w-[31%] shrink-0 ${bg} text-white px-4 py-6 flex flex-col`}>
        <div className="w-16 h-16 mx-auto rounded-full bg-white flex items-center justify-center overflow-hidden">
          {pv.photo ? (
            <img src={pv.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className={`text-xl font-black ${tx}`}>{initials}</span>
          )}
        </div>
        {[pv.phone, pv.email, pv.location, pv.website].some(Boolean) && (
          <>
            <ST>Contact</ST>
            {[pv.phone, pv.email, pv.location, pv.website].filter(Boolean).map((c, i) => (
              <div key={i} className="text-[7.5px] text-white/80 break-words leading-relaxed">{c}</div>
            ))}
          </>
        )}
        {v.skills?.skills && (
          <>
            <ST>Skills</ST>
            {listItems(v.skills.skills).map((s, i) => (
              <div key={i} className="text-[8px] text-white/85 leading-relaxed">• {s}</div>
            ))}
          </>
        )}
        {v.extra?.languages && (
          <>
            <ST>Languages</ST>
            {listItems(v.extra.languages).map((s, i) => (
              <div key={i} className="text-[8px] text-white/85 leading-relaxed">• {s}</div>
            ))}
          </>
        )}
        {v.extra?.certs && (
          <>
            <ST>Certifications</ST>
            {listItems(v.extra.certs).map((s, i) => (
              <div key={i} className="text-[8px] text-white/85 leading-relaxed">• {s}</div>
            ))}
          </>
        )}
        {(v.reference?.refName || v.reference?.refTitle) && (
          <>
            <ST>Reference</ST>
            <div className="text-[8px] font-bold text-white">{v.reference.refName}</div>
            <div className="text-[7.5px] text-white/80">{v.reference.refTitle}</div>
            {v.reference.refPhone && <div className="text-[7.5px] text-white/80">Phone: {v.reference.refPhone}</div>}
            {v.reference.refEmail && <div className="text-[7.5px] text-white/80 break-words">Email: {v.reference.refEmail}</div>}
          </>
        )}
      </div>
      {/* main */}
      <div className="flex-1 px-5 py-6 overflow-hidden">
        <div className="text-[19px] font-black text-slate-900 leading-tight">{pv.name || 'Your Name'}</div>
        {pv.title && <div className={`text-[11px] font-semibold ${tx}`}>{pv.title}</div>}
        {v.summary?.summary && (
          <>
            <div className={`text-[9px] font-black uppercase tracking-wider ${tx} mt-3 pb-0.5 border-b border-slate-200`}>Profile</div>
            <div className="text-[9.5px] text-slate-700 whitespace-pre-line leading-relaxed mt-1">{v.summary.summary}</div>
          </>
        )}
        {(v.experience || []).length > 0 && (
          <>
            <div className={`text-[9px] font-black uppercase tracking-wider ${tx} mt-4 pb-0.5 border-b border-slate-200`}>Work Experience</div>
            <div className="space-y-2.5 mt-1.5">
              {(v.experience || []).map((r, i) => (
                <div key={i}>
                  <div className={`text-[8px] font-bold ${tx}`}>{[r.start, r.end].filter(Boolean).join(' - ')}</div>
                  <div className="text-[11px] font-bold text-slate-800">
                    {[r.position, r.company].filter(Boolean).join('  |  ')}
                  </div>
                  {r.desc && <div className="text-[9px] text-slate-600 whitespace-pre-line leading-snug">{r.desc}</div>}
                </div>
              ))}
            </div>
          </>
        )}
        {(v.education || []).length > 0 && (
          <>
            <div className={`text-[9px] font-black uppercase tracking-wider ${tx} mt-4 pb-0.5 border-b border-slate-200`}>Education</div>
            <div className="space-y-2 mt-1.5">
              {(v.education || []).map((r, i) => (
                <div key={i}>
                  <div className={`text-[8px] font-bold ${tx}`}>{[r.start, r.end].filter(Boolean).join(' - ')}</div>
                  <div className="text-[11px] font-bold text-slate-800">
                    {[r.degree, r.school].filter(Boolean).join('  |  ')}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TemplateDoc({ tpl, values }) {
  const v = values;
  const dt = tpl.docType;
  const acc = accentHex(tpl);
  const th = tpl.theme || 'modern';

  if (dt === 'cv' && tpl.layout === 'sidebar') {
    return <SidebarDoc tpl={tpl} v={v} />;
  }
  if (dt === 'cv' && tpl.layout === 'topband') {
    return <TopbandDoc tpl={tpl} v={v} />;
  }

  const genericSections = (
    <>
      {(tpl.sections || []).map((s) => {
        if (s.type === 'fields') {
          const headerKeys =
            dt === 'receipt' ? ['meta']
            : dt === 'agreement' ? ['meta', 'partyA', 'partyB']
            : ['sender', 'meta', 'company', 'profile'];
          if (headerKeys.includes(s.key)) return null;
          return (
            <div key={s.key}>
              <SectionTitle accent={acc} theme={th}>{s.title}</SectionTitle>
              <FieldPairs s={s} vals={v[s.key]} />
            </div>
          );
        }
        if (s.type === 'group') {
          const rows = v[s.key] || [];
          return (
            <div key={s.key}>
              <SectionTitle accent={acc} theme={th}>{s.title}</SectionTitle>
              {dt === 'checklist' ? (
                <div className="space-y-1">
                  {rows.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-slate-700">
                      <span className="w-2.5 h-2.5 mt-0.5 border inline-block shrink-0" style={{ borderColor: acc }} />
                      <span>{r.item || r.task || Object.values(r).filter((x) => typeof x === 'string' && x).join(' ')}
                        {r.note ? <span className="text-slate-400"> — {r.note}</span> : null}
                        {r.cond ? <span className="text-slate-400"> [{r.cond}]</span> : null}
                        {r.status ? <span className="text-slate-400"> [{r.status}]</span> : null}
                      </span>
                    </div>
                  ))}
                </div>
              ) : dt === 'agreement' && s.key === 'clauses' ? (
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={i}>
                      <div className="text-[11px] font-bold text-slate-800">{i + 1}. {r.title || 'Clause'}</div>
                      <div className="text-[10.5px] text-slate-600 whitespace-pre-line">{r.text}</div>
                    </div>
                  ))}
                </div>
              ) : dt === 'cv' ? (
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[11px] font-bold text-slate-800">
                          {[r.position || r.degree || r.title, r.company || r.school].filter(Boolean).join(' — ')}
                        </span>
                        <span className="text-[9px] text-slate-400">{[r.start, r.end].filter(Boolean).join(' – ')}</span>
                      </div>
                      {r.desc && <div className="text-[10px] text-slate-600 whitespace-pre-line">{r.desc}</div>}
                    </div>
                  ))}
                </div>
              ) : dt === 'report' ? (
                <div className="space-y-3">
                  {rows.map((r, i) => (
                    <div key={i}>
                      <div className="text-[12px] font-bold" style={{color: acc}}>{i + 1}. {r.heading || 'Section'}</div>
                      <div className="text-[10.5px] text-slate-600 whitespace-pre-line mt-0.5">{r.content}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <Tbl s={s} rows={rows} accent={acc} theme={th} />
              )}
            </div>
          );
        }
        if (s.type === 'signature') return <Sig key={s.key} s={s} />;
        return null;
      })}
    </>
  );

  const serif = th === 'classic' || th === 'elegant';
  return (
    <div className={`bg-white shadow-lg border border-slate-200 rounded-sm w-full min-h-[500px] p-7 text-left select-none ${serif ? 'font-serif' : ''}`}>
      {/* header per docType */}
      {(dt === 'letter') && (
        <div className="mb-4">
          <div className="text-[15px] font-black" style={{ color: serif ? '#1e293b' : acc }}>{v.sender?.name || 'Your Name'}</div>
          <div className="text-[8.5px] text-slate-500">
            {[v.sender?.address, v.sender?.email, v.sender?.phone].filter(Boolean).join('   |   ')}
          </div>
          <div className="h-[3px] mt-2" style={{ background: acc }} />
          <div className="mt-3 space-y-1">
            {v.doc?.date && <div className="text-[10px] text-slate-400 text-right">Date: {v.doc.date}</div>}
            {v.doc?.ref && <div className="text-[10px] font-bold text-slate-800">Subject: {v.doc.ref}</div>}
          </div>
          <div className="mt-3 space-y-0.5">
            {v.recipient?.name && <div className="text-[10px] font-bold text-slate-800">{v.recipient.name}</div>}
            {[v.recipient?.company, v.recipient?.address].filter(Boolean).map((x, i) => (
              <div key={i} className="text-[10px] text-slate-600">{x}</div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {v.body?.greeting && <div className="text-[10.5px] text-slate-800">{v.body.greeting}</div>}
            <div className="text-[10.5px] text-slate-700 whitespace-pre-line leading-relaxed">{v.body?.body}</div>
            {v.body?.closing && <div className="text-[10.5px] text-slate-800 mt-3">{v.body.closing}</div>}
            {v.body?.signName && <div className="text-[10.5px] font-bold text-slate-800 mt-4">{v.body.signName}</div>}
          </div>
        </div>
      )}

      {(dt === 'invoice' || dt === 'receipt') && (
        <div className="mb-3 -mx-7 -mt-7">
          {/* accent band */}
          {!serif && th === 'modern' && tpl.variant === 'rail' ? (
            <div className="h-1.5 w-1/3" style={{ background: acc }} />
          ) : !serif && th === 'modern' && tpl.variant === 'boxed' ? (
            <>
              <div className="h-1.5" style={{ background: acc }} />
              <div className="h-[3px] mt-[3px] bg-slate-300" />
            </>
          ) : !serif ? (
            <div className="h-2.5" style={{ background: th === 'bold' ? '#1e293b' : acc }} />
          ) : null}
          <div className="px-7 pt-3">
            {dt === 'receipt' ? (
              serif ? (
                <div className="mb-2 text-center">
                  <div className="text-[17px] font-bold uppercase tracking-widest text-slate-900">Receipt</div>
                  {v.company?.name && <div className="text-[9px] italic text-slate-500">{v.company.name}</div>}
                  <div className="border-t-2 border-slate-800 mt-1.5" />
                  <div className="border-t border-slate-400 mt-[2px]" />
                </div>
              ) : th === 'modern' && tpl.variant === 'boxed' ? (
                <div className="mb-2 border-t-4 border text-center px-3 py-2.5" style={{ borderColor: acc }}>
                  <div className="text-[18px] font-black" style={{ color: acc }}>RECEIPT</div>
                  {v.company?.name && <div className="text-[9px] text-slate-500">{v.company.name}</div>}
                </div>
              ) : (
                <div className="-mx-7 px-7 py-3 mb-2 text-center" style={{ background: th === 'bold' ? '#1e293b' : acc }}>
                  <div className="text-[18px] font-black text-white">RECEIPT</div>
                  {v.company?.name && <div className="text-[9px] text-white/90">{v.company.name}</div>}
                </div>
              )
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[16px] font-black text-slate-900">{v.company?.name || 'Your Company'}</div>
                    {[v.company?.address, v.company?.email, v.company?.phone].filter(Boolean).map((x, i) => (
                      <div key={i} className="text-[9px] text-slate-500">{x}</div>
                    ))}
                  </div>
                  {v.company?.logo && <img src={v.company.logo} alt="" className="h-10 object-contain" />}
                </div>
                <div className="flex items-end justify-between mt-2">
                  <div className="text-[20px] font-black" style={{ color: serif ? '#1e293b' : acc }}>{tpl.name.toUpperCase()}</div>
                  {/* meta box */}
                  {v.meta && (() => {
                    const s = sec(tpl, 'meta');
                    const rows = (s?.fields || []).filter((fd) => v.meta[fd.key]);
                    if (!rows.length) return null;
                    return (
                      <div className="bg-slate-50 border-l-[3px] px-3 py-1.5 space-y-0.5" style={{ borderColor: acc }}>
                        {rows.map((fd) => (
                          <div key={fd.key} className="flex justify-between gap-6">
                            <span className="text-[7px] font-bold uppercase text-slate-400">{fd.label}</span>
                            <span className="text-[9px] font-bold text-slate-800">{String(v.meta[fd.key])}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
          <div className="px-7">
            {dt === 'receipt' && v.meta && <FieldPairs s={sec(tpl, 'meta')} vals={v.meta} />}
            {v.client && (
              <>
                <SectionTitle accent={acc} theme={th}>{sec(tpl, 'client')?.title || 'Bill To'}</SectionTitle>
                <FieldPairs s={sec(tpl, 'client')} vals={v.client} />
              </>
            )}
          </div>
        </div>
      )}

      {dt === 'cv' && (
        <div className="mb-3">
          <div className="text-[19px] font-black text-slate-900">{v.profile?.name || 'Your Name'}</div>
          {v.profile?.title && <div className="text-[11px] font-semibold" style={{ color: acc }}>{v.profile.title}</div>}
          <div className="text-[8.5px] text-slate-500 mt-0.5">
            {[v.profile?.email, v.profile?.phone, v.profile?.location, v.profile?.website].filter(Boolean).join('   ·   ')}
          </div>
          <div className="h-0.5 mt-2" style={{ background: acc }} />
          {v.summary?.summary && (
            <>
              <SectionTitle accent={acc} theme={th}>Professional Summary</SectionTitle>
              <div className="text-[10px] text-slate-700 whitespace-pre-line">{v.summary.summary}</div>
            </>
          )}
        </div>
      )}

      {dt === 'agreement' && (
        <div className="mb-3">
          <div className="text-center text-[15px] font-black text-slate-900">{tpl.name.toUpperCase()}</div>
          <div className="h-0.5 w-16 mx-auto my-2" style={{ background: acc }} />
          <div className="text-[10px] text-slate-700">
            This {tpl.name} ("Agreement") is entered into on {v.meta?.date || '________'} by and between:
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {['partyA', 'partyB'].map((k) => {
              const s = sec(tpl, k);
              if (!s) return null;
              const pv = v[k] || {};
              return (
                <div key={k} className="bg-slate-50 px-2.5 py-2 border-t-[3px]" style={{ borderColor: acc }}>
                  <div className="text-[8px] font-bold uppercase" style={{ color: acc }}>{s.title}</div>
                  <div className="text-[9px] text-slate-600 mt-0.5 leading-snug">
                    {s.fields.map((fd) => pv[fd.key]).filter(Boolean).join(', ') || '____________________'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {['form', 'checklist', 'planner', 'table'].includes(dt) && (
        <DocTitleBand
          title={dt === 'table' ? (v.meta?.title || tpl.name) : tpl.name}
          sub={dt === 'table' ? [v.meta?.author, v.meta?.date].filter(Boolean).join(' · ') : tpl.categoryName}
          theme={th}
          accent={acc}
          variant={tpl.variant}
        />
      )}

      {dt === 'report' && (
        <div className="mb-3 pl-3 border-l-4" style={{ borderColor: acc }}>
          <div className="text-[8.5px] font-black uppercase tracking-wider" style={{ color: acc }}>{tpl.name}</div>
          <div className="text-[17px] font-black text-slate-900">{v.meta?.title || tpl.name}</div>
          <div className="text-[9px] text-slate-500">
            {[v.meta?.author, v.meta?.client, v.meta?.period, v.meta?.date].filter(Boolean).join('   ·   ')}
          </div>
        </div>
      )}

      {dt !== 'letter' && genericSections}

      {dt === 'invoice' && (() => {
        const t = calcTotals(tpl, v);
        if (!t) return null;
        return (
          <div className="mt-3 ml-auto w-44 space-y-0.5">
            <div className="flex justify-between text-[10px]"><span className="text-slate-500">Subtotal</span><span>{money(t.subtotal)}</span></div>
            {t.tax > 0 && <div className="flex justify-between text-[10px]"><span className="text-slate-500">Tax</span><span>{money(t.tax)}</span></div>}
            <div className="flex justify-between items-center px-2 py-1 mt-0.5" style={{ background: acc }}>
              <span className="text-[11px] font-bold text-white">TOTAL</span>
              <span className="text-[11px] font-bold text-white">{money(t.total)}</span>
            </div>
          </div>
        );
      })()}

      {dt === 'invoice' && (
        <div className="mt-4 pt-2 text-center text-[8px] text-slate-400" style={{ borderTop: `1.5px solid ${acc}` }}>
          Thank you for your business!
        </div>
      )}

      {tpl.disclaimer && (
        <div className="mt-4 text-[7.5px] text-slate-400 italic leading-snug">{tpl.disclaimer}</div>
      )}
    </div>
  );
}
