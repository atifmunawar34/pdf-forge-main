// Calculator tools — powered by the 'calc' engine.
const N = (v) => parseFloat(v) || 0;
const money = (n) => (isFinite(n) ? n.toFixed(2) : '0.00');
const pct = (n) => (isFinite(n) ? n.toFixed(2) : '0') + '%';
const num = (n, d = 2) => (isFinite(n) ? +n.toFixed(d) : 0);

const F = (key, label, extra = {}) => ({ key, label, type: 'number', step: 'any', ...extra });
const FD = (key, label, extra = {}) => ({ key, label, type: 'date', ...extra });

const T = (id, name, desc, fields, compute, extra = {}) => ({
  id, name, desc, engine: 'calc', def: { fields, compute }, keywords: [name.toLowerCase(), 'free calculator', 'online'], ...extra,
});

export const CALC_TOOLS = [
  T('percentage-calculator', 'Percentage Calculator', 'Calculate what percentage one number is of another, or a percent of a value — free.', [
    F('a', 'Value'), F('b', 'Of total'),
  ], (v) => [
    { label: `${v.a} is`, value: pct(N(v.a) / N(v.b) * 100), hint: `of ${v.b}` },
    { label: `${v.b}% of ${v.a}`, value: num(N(v.a) * N(v.b) / 100) },
  ], { featured: true, popular: true }),
  T('percentage-increase', 'Percentage Increase Calculator', 'Work out the percentage increase between two values.', [
    F('from', 'From value'), F('to', 'To value'),
  ], (v) => [{ label: 'Increase', value: pct((N(v.to) - N(v.from)) / Math.abs(N(v.from)) * 100), hint: `${money(N(v.to) - N(v.from))} more` }]),
  T('percentage-decrease', 'Percentage Decrease Calculator', 'Work out the percentage decrease between two values.', [
    F('from', 'From value'), F('to', 'To value'),
  ], (v) => [{ label: 'Decrease', value: pct((N(v.from) - N(v.to)) / Math.abs(N(v.from)) * 100), hint: `${money(N(v.from) - N(v.to))} less` }]),
  T('discount-calculator', 'Discount Calculator', 'Calculate the sale price after a percentage discount — plus savings.', [
    F('price', 'Original price'), F('off', 'Discount %'),
  ], (v) => [
    { label: 'Final price', value: money(N(v.price) * (1 - N(v.off) / 100)) },
    { label: 'You save', value: money(N(v.price) * N(v.off) / 100) },
  ], { popular: true }),
  T('profit-calculator', 'Profit Calculator', 'Calculate profit and margin from cost and sale price.', [
    F('cost', 'Cost price'), F('sale', 'Sale price'),
  ], (v) => [
    { label: 'Profit', value: money(N(v.sale) - N(v.cost)) },
    { label: 'Margin', value: pct((N(v.sale) - N(v.cost)) / N(v.sale) * 100) },
    { label: 'Markup', value: pct((N(v.sale) - N(v.cost)) / N(v.cost) * 100) },
  ]),
  T('profit-margin', 'Profit Margin Calculator', 'Find profit margin percentage from revenue and cost.', [
    F('revenue', 'Revenue'), F('cost', 'Cost'),
  ], (v) => [
    { label: 'Profit', value: money(N(v.revenue) - N(v.cost)) },
    { label: 'Margin', value: pct((N(v.revenue) - N(v.cost)) / N(v.revenue) * 100) },
  ]),
  T('markup-calculator', 'Markup Calculator', 'Convert cost + markup % into sale price and profit.', [
    F('cost', 'Cost'), F('markup', 'Markup %'),
  ], (v) => [
    { label: 'Sale price', value: money(N(v.cost) * (1 + N(v.markup) / 100)) },
    { label: 'Profit', value: money(N(v.cost) * N(v.markup) / 100) },
  ]),
  T('sales-tax', 'Sales Tax Calculator', 'Add sales tax to a price or extract the tax from a total.', [
    F('price', 'Price before tax'), F('rate', 'Tax rate %'),
  ], (v) => [
    { label: 'Tax amount', value: money(N(v.price) * N(v.rate) / 100) },
    { label: 'Total', value: money(N(v.price) * (1 + N(v.rate) / 100)) },
  ]),
  T('vat-calculator', 'VAT Calculator', 'Add or remove VAT from a price — net, tax and gross amounts.', [
    F('price', 'Net price'), F('rate', 'VAT rate %', { default: 20 }),
  ], (v) => [
    { label: 'VAT', value: money(N(v.price) * N(v.rate) / 100) },
    { label: 'Gross', value: money(N(v.price) * (1 + N(v.rate) / 100)) },
  ]),
  T('gst-calculator', 'GST Calculator', 'Calculate GST amount and final price including goods & services tax.', [
    F('price', 'Price excl. GST'), F('rate', 'GST rate %', { default: 18 }),
  ], (v) => [
    { label: 'GST', value: money(N(v.price) * N(v.rate) / 100) },
    { label: 'Total', value: money(N(v.price) * (1 + N(v.rate) / 100)) },
  ]),
  T('salary-calculator', 'Salary Calculator', 'Convert annual salary to monthly, weekly, daily and hourly pay.', [
    F('annual', 'Annual salary'), F('hours', 'Hours per week', { default: 40 }),
  ], (v) => {
    const a = N(v.annual);
    return [
      { label: 'Monthly', value: money(a / 12) }, { label: 'Weekly', value: money(a / 52) },
      { label: 'Daily', value: money(a / 260) }, { label: 'Hourly', value: money(a / 52 / Math.max(1, N(v.hours))) },
    ];
  }),
  T('hourly-wage', 'Hourly Wage Calculator', 'Convert hourly rate to weekly, monthly and annual earnings.', [
    F('rate', 'Hourly rate'), F('hours', 'Hours per week', { default: 40 }),
  ], (v) => {
    const w = N(v.rate) * N(v.hours);
    return [
      { label: 'Weekly', value: money(w) }, { label: 'Monthly', value: money(w * 52 / 12) }, { label: 'Annual', value: money(w * 52) },
    ];
  }),
  T('overtime-calculator', 'Overtime Calculator', 'Calculate overtime pay from regular hours, rate and OT multiplier.', [
    F('rate', 'Hourly rate'), F('reg', 'Regular hours/week', { default: 40 }), F('ot', 'Overtime hours'), F('mult', 'OT multiplier', { default: 1.5 }),
  ], (v) => {
    const otp = N(v.rate) * N(v.mult) * N(v.ot);
    return [
      { label: 'Regular pay', value: money(N(v.rate) * N(v.reg)) },
      { label: 'Overtime pay', value: money(otp) },
      { label: 'Total week', value: money(N(v.rate) * N(v.reg) + otp) },
    ];
  }),
  T('loan-calculator', 'Loan Calculator', 'Monthly payment, total interest and total cost for a loan.', [
    F('amount', 'Loan amount'), F('rate', 'Interest % / year'), F('years', 'Term (years)'),
  ], (v) => {
    const P = N(v.amount), r = N(v.rate) / 1200, n = N(v.years) * 12;
    const m = r ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / Math.max(1, n);
    return [
      { label: 'Monthly', value: money(m) },
      { label: 'Total paid', value: money(m * n) },
      { label: 'Interest', value: money(m * n - P) },
    ];
  }, { featured: true, popular: true }),
  T('emi-calculator', 'EMI Calculator', 'Equated monthly installment for loans — EMI, interest and totals.', [
    F('amount', 'Loan amount'), F('rate', 'Interest % / year'), F('months', 'Tenure (months)'),
  ], (v) => {
    const P = N(v.amount), r = N(v.rate) / 1200, n = N(v.months);
    const e = r ? (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : P / Math.max(1, n);
    return [
      { label: 'EMI', value: money(e) },
      { label: 'Total interest', value: money(e * n - P) },
      { label: 'Total', value: money(e * n) },
    ];
  }),
  T('interest-calculator', 'Interest Calculator', 'Simple interest on a principal over a time period.', [
    F('p', 'Principal'), F('r', 'Rate % / year'), F('t', 'Years'),
  ], (v) => {
    const i = N(v.p) * N(v.r) / 100 * N(v.t);
    return [{ label: 'Interest', value: money(i) }, { label: 'Total', value: money(N(v.p) + i) }];
  }),
  T('simple-interest', 'Simple Interest Calculator', 'Simple interest = P × R × T / 100 — instant result.', [
    F('p', 'Principal'), F('r', 'Rate % / year'), F('t', 'Years'),
  ], (v) => {
    const i = N(v.p) * N(v.r) / 100 * N(v.t);
    return [{ label: 'Interest', value: money(i) }, { label: 'Total', value: money(N(v.p) + i) }];
  }),
  T('compound-interest', 'Compound Interest Calculator', 'Compound growth on savings — choose compounding frequency.', [
    F('p', 'Principal'), F('r', 'Rate % / year'), F('t', 'Years'),
    { key: 'n', label: 'Compounds/year', type: 'select', options: [1, 2, 4, 12, 365], default: 12 },
  ], (v) => {
    const A = N(v.p) * Math.pow(1 + N(v.r) / 100 / N(v.n), N(v.n) * N(v.t));
    return [{ label: 'Final amount', value: money(A) }, { label: 'Interest earned', value: money(A - N(v.p)) }];
  }, { popular: true }),
  T('investment-calculator', 'Investment Calculator', 'Project investment growth with monthly contributions.', [
    F('start', 'Starting amount'), F('monthly', 'Monthly contribution'), F('r', 'Return % / year'), F('t', 'Years'),
  ], (v) => {
    const r = N(v.r) / 1200, n = N(v.t) * 12;
    const A = N(v.start) * Math.pow(1 + r, n) + N(v.monthly) * ((Math.pow(1 + r, n) - 1) / r || n);
    return [
      { label: 'Final value', value: money(A) },
      { label: 'Contributed', value: money(N(v.start) + N(v.monthly) * n) },
      { label: 'Growth', value: money(A - N(v.start) - N(v.monthly) * n) },
    ];
  }),
  T('roi-calculator', 'ROI Calculator', 'Return on investment — gain vs cost as a percentage.', [
    F('invested', 'Amount invested'), F('returned', 'Amount returned'),
  ], (v) => [
    { label: 'ROI', value: pct((N(v.returned) - N(v.invested)) / Math.max(1e-9, N(v.invested)) * 100) },
    { label: 'Net gain', value: money(N(v.returned) - N(v.invested)) },
  ]),
  T('break-even', 'Break-Even Calculator', 'Units needed to cover fixed costs at a given price and cost.', [
    F('fixed', 'Fixed costs'), F('price', 'Price per unit'), F('cost', 'Cost per unit'),
  ], (v) => {
    const units = N(v.fixed) / Math.max(1e-9, N(v.price) - N(v.cost));
    return [
      { label: 'Break-even units', value: Math.ceil(units) },
      { label: 'Break-even revenue', value: money(units * N(v.price)) },
    ];
  }),
  T('age-calculator', 'Age Calculator', 'Exact age in years, months, days — plus next birthday countdown.', [
    FD('dob', 'Date of birth'),
  ], (v) => {
    const d = new Date(v.dob), now = new Date();
    if (isNaN(d)) throw new Error('Pick a birth date');
    let y = now.getFullYear() - d.getFullYear();
    let m = now.getMonth() - d.getMonth();
    let dd = now.getDate() - d.getDate();
    if (dd < 0) { m--; dd += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
    if (next < now) next.setFullYear(next.getFullYear() + 1);
    return [
      { label: 'Age', value: `${y}y ${m}m ${dd}d` },
      { label: 'Days lived', value: Math.floor((now - d) / 86400000).toLocaleString() },
      { label: 'Next birthday in', value: `${Math.ceil((next - now) / 86400000)} days` },
    ];
  }, { popular: true }),
  T('date-calculator', 'Date Calculator', 'Days between two dates, or add/subtract days from a date.', [
    FD('a', 'Start date'), FD('b', 'End date'), F('days', 'Or add days to start'),
  ], (v) => {
    const a = new Date(v.a);
    const out = [];
    if (v.b) out.push({ label: 'Days between', value: Math.abs(Math.round((new Date(v.b) - a) / 86400000)) });
    if (v.days) out.push({ label: `${v.days} days later`, value: new Date(a.getTime() + N(v.days) * 86400000).toDateString() });
    if (!out.length) throw new Error('Pick an end date or days to add');
    return out;
  }),
  T('time-calculator', 'Time Calculator', 'Add or subtract hours, minutes and seconds.', [
    F('h1', 'Hours'), F('m1', 'Minutes'), F('s1', 'Seconds'),
    F('h2', '+ Hours'), F('m2', '+ Minutes'), F('s2', '+ Seconds'),
  ], (v) => {
    const total = (N(v.h1) + N(v.h2)) * 3600 + (N(v.m1) + N(v.m2)) * 60 + N(v.s1) + N(v.s2);
    return [
      { label: 'Total', value: `${Math.floor(total / 3600)}h ${Math.floor((total % 3600) / 60)}m ${total % 60}s` },
      { label: 'In minutes', value: num(total / 60) }, { label: 'In seconds', value: num(total, 0) },
    ];
  }),
  T('countdown-calculator', 'Countdown Calculator', 'Days, hours and minutes remaining until a target date.', [
    FD('target', 'Target date'),
  ], (v) => {
    const t = new Date(v.target), now = new Date();
    if (isNaN(t)) throw new Error('Pick a target date');
    const ms = t - now;
    const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return ms < 0
      ? [{ label: 'Status', value: 'Date has passed' }]
      : [{ label: 'Remaining', value: `${d}d ${h}h ${m}m` }, { label: 'Total days', value: d }];
  }),
  T('tip-calculator', 'Tip Calculator', 'Tip amount and per-person split for a bill.', [
    F('bill', 'Bill amount'), F('tip', 'Tip %', { default: 15 }), F('people', 'Split between', { default: 1, min: 1 }),
  ], (v) => {
    const tip = N(v.bill) * N(v.tip) / 100;
    const total = N(v.bill) + tip;
    const p = Math.max(1, N(v.people));
    return [
      { label: 'Tip', value: money(tip) }, { label: 'Total', value: money(total) }, { label: 'Per person', value: money(total / p) },
    ];
  }, { popular: true }),
  T('fuel-cost', 'Fuel Cost Calculator', 'Trip fuel cost from distance, consumption and fuel price.', [
    F('dist', 'Distance (km)'), F('eff', 'Consumption (L/100km)'), F('price', 'Fuel price / L'),
  ], (v) => {
    const l = N(v.dist) * N(v.eff) / 100;
    return [{ label: 'Fuel needed', value: `${num(l)} L` }, { label: 'Cost', value: money(l * N(v.price)) }];
  }),
  T('electricity-cost', 'Electricity Cost Calculator', 'Cost to run an appliance — watts, hours, tariff.', [
    F('watts', 'Power (W)'), F('hours', 'Hours/day'), F('rate', 'Price per kWh'), F('days', 'Days', { default: 30 }),
  ], (v) => {
    const kwh = N(v.watts) / 1000 * N(v.hours) * N(v.days);
    return [{ label: 'Energy used', value: `${num(kwh)} kWh` }, { label: 'Cost', value: money(kwh * N(v.rate)) }];
  }),
  T('bmi-calculator', 'BMI Calculator', 'Body mass index from height and weight — with WHO category.', [
    F('h', 'Height (cm)'), F('w', 'Weight (kg)'),
  ], (v) => {
    const bmi = N(v.w) / Math.pow(N(v.h) / 100, 2);
    const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    return [{ label: 'BMI', value: num(bmi, 1) }, { label: 'Category', value: cat }];
  }, { popular: true }),
  T('bmr-calculator', 'BMR Calculator', 'Basal metabolic rate — calories your body burns at rest (Mifflin-St Jeor).', [
    F('w', 'Weight (kg)'), F('h', 'Height (cm)'), F('age', 'Age'),
    { key: 'sex', label: 'Sex', type: 'select', options: [{ value: 'm', label: 'Male' }, { value: 'f', label: 'Female' }], default: 'm' },
  ], (v) => {
    const bmr = 10 * N(v.w) + 6.25 * N(v.h) - 5 * N(v.age) + (v.sex === 'm' ? 5 : -161);
    return [{ label: 'BMR', value: `${num(bmr, 0)} kcal/day` }, { label: 'With light activity', value: `${num(bmr * 1.375, 0)} kcal` }];
  }),
  T('calorie-calculator', 'Calorie Calculator', 'Daily calorie needs for maintain, lose or gain weight.', [
    F('w', 'Weight (kg)'), F('h', 'Height (cm)'), F('age', 'Age'),
    { key: 'sex', label: 'Sex', type: 'select', options: [{ value: 'm', label: 'Male' }, { value: 'f', label: 'Female' }], default: 'm' },
    { key: 'act', label: 'Activity', type: 'select', options: [
      { value: '1.2', label: 'Sedentary' }, { value: '1.375', label: 'Light' }, { value: '1.55', label: 'Moderate' }, { value: '1.725', label: 'Active' },
    ], default: '1.2' },
  ], (v) => {
    const bmr = 10 * N(v.w) + 6.25 * N(v.h) - 5 * N(v.age) + (v.sex === 'm' ? 5 : -161);
    const tdee = bmr * parseFloat(v.act);
    return [
      { label: 'Maintain', value: `${num(tdee, 0)} kcal` },
      { label: 'Lose 0.5kg/wk', value: `${num(tdee - 500, 0)} kcal` },
      { label: 'Gain 0.5kg/wk', value: `${num(tdee + 500, 0)} kcal` },
    ];
  }),
];
