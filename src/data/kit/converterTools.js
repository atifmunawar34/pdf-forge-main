// Unit converters — powered by the 'convert' engine (units -> toBase multiplier).

const T = (id, name, desc, units, extra = {}) => {
  const { custom, note, ...rest } = extra;
  return {
    id, name, desc, engine: 'convert', def: { units, custom, note }, keywords: [name.toLowerCase(), 'unit converter', 'free online'], ...rest,
  };
};

const U = (label, toBase) => ({ label, toBase });

export const CONVERTER_TOOLS = [
  T('length-converter', 'Length Converter', 'Convert meters, feet, inches, miles, km and more — free length converter.', {
    mm: U('Millimeter (mm)', 0.001), cm: U('Centimeter (cm)', 0.01), m: U('Meter (m)', 1),
    km: U('Kilometer (km)', 1000), in: U('Inch (in)', 0.0254), ft: U('Foot (ft)', 0.3048),
    yd: U('Yard (yd)', 0.9144), mi: U('Mile (mi)', 1609.344), nmi: U('Nautical mile', 1852),
  }, { featured: true, popular: true }),
  T('weight-converter', 'Weight Converter', 'Convert kg, grams, pounds, ounces, stones and tons instantly.', {
    mg: U('Milligram (mg)', 0.000001), g: U('Gram (g)', 0.001), kg: U('Kilogram (kg)', 1),
    t: U('Tonne (t)', 1000), oz: U('Ounce (oz)', 0.0283495), lb: U('Pound (lb)', 0.453592),
    st: U('Stone (st)', 6.35029),
  }, { popular: true }),
  T('height-converter', 'Height Converter', 'Convert height between cm, meters, feet and inches.', {
    cm: U('Centimeter (cm)', 1), m: U('Meter (m)', 100), mm: U('Millimeter (mm)', 0.1),
    in: U('Inch (in)', 2.54), ft: U('Foot (ft)', 30.48), ftin: U('Feet+Inches total (in)', 2.54),
  }),
  T('area-converter', 'Area Converter', 'Convert square meters, feet, acres, hectares and more.', {
    mm2: U('mm²', 0.000001), cm2: U('cm²', 0.0001), m2: U('m²', 1), km2: U('km²', 1e6),
    in2: U('in²', 0.00064516), ft2: U('ft²', 0.092903), yd2: U('yd²', 0.836127),
    acre: U('Acre', 4046.86), ha: U('Hectare', 10000),
  }),
  T('volume-converter', 'Volume Converter', 'Convert liters, milliliters, gallons, cups, cubic meters and more.', {
    ml: U('Milliliter (ml)', 0.001), l: U('Liter (L)', 1), m3: U('Cubic meter (m³)', 1000),
    floz: U('US fl oz', 0.0295735), cup: U('US cup', 0.236588), pt: U('US pint', 0.473176),
    qt: U('US quart', 0.946353), gal: U('US gallon', 3.78541), ft3: U('Cubic foot', 28.3168),
  }),
  T('temperature-converter', 'Temperature Converter', 'Convert between Celsius, Fahrenheit and Kelvin.', null, { custom: 'temperature' }),
  T('speed-converter', 'Speed Converter', 'Convert km/h, mph, m/s, knots and more.', {
    ms: U('m/s', 1), kmh: U('km/h', 0.277778), mph: U('mph', 0.44704),
    fts: U('ft/s', 0.3048), kn: U('Knot', 0.514444),
  }),
  T('time-converter', 'Time Converter', 'Convert seconds, minutes, hours, days, weeks and years.', {
    ms: U('Millisecond', 0.001), s: U('Second', 1), min: U('Minute', 60),
    h: U('Hour', 3600), d: U('Day', 86400), wk: U('Week', 604800),
    mo: U('Month (~30.4d)', 2629800), yr: U('Year', 31557600),
  }),
  T('data-storage-converter', 'Data Storage Converter', 'Convert bytes, KB, MB, GB, TB and bits.', {
    bit: U('Bit', 0.125), b: U('Byte', 1), kb: U('Kilobyte (KB)', 1024),
    mb: U('Megabyte (MB)', 1048576), gb: U('Gigabyte (GB)', 1073741824),
    tb: U('Terabyte (TB)', 1099511627776), kbit: U('Kilobit', 128), mbit: U('Megabit', 131072),
  }, { popular: true }),
  T('energy-converter', 'Energy Converter', 'Convert joules, calories, kWh, BTU and more.', {
    j: U('Joule (J)', 1), kj: U('Kilojoule', 1000), cal: U('Calorie', 4.184),
    kcal: U('Kilocalorie', 4184), wh: U('Watt-hour', 3600), kwh: U('kWh', 3.6e6),
    btu: U('BTU', 1055.06),
  }),
  T('pressure-converter', 'Pressure Converter', 'Convert pascal, bar, psi, atm and mmHg.', {
    pa: U('Pascal (Pa)', 1), kpa: U('kPa', 1000), bar: U('Bar', 100000),
    psi: U('PSI', 6894.76), atm: U('Atmosphere', 101325), mmhg: U('mmHg', 133.322),
  }),
  T('power-converter', 'Power Converter', 'Convert watts, kilowatts, horsepower and BTU/h.', {
    w: U('Watt (W)', 1), kw: U('Kilowatt', 1000), mw: U('Megawatt', 1e6),
    hp: U('Horsepower', 745.7), btuh: U('BTU/h', 0.293071),
  }),
  T('frequency-converter', 'Frequency Converter', 'Convert Hz, kHz, MHz, GHz and RPM.', {
    hz: U('Hertz (Hz)', 1), khz: U('kHz', 1000), mhz: U('MHz', 1e6),
    ghz: U('GHz', 1e9), rpm: U('RPM', 1 / 60),
  }),
  T('fuel-economy-converter', 'Fuel Economy Converter', 'Convert between L/100km, mpg (US) and mpg (UK).', null, { custom: 'fuel' }),
  T('angle-converter', 'Angle Converter', 'Convert degrees, radians, gradians and turns.', {
    deg: U('Degree (°)', Math.PI / 180), rad: U('Radian (rad)', 1),
    grad: U('Gradian', Math.PI / 200), turn: U('Turn', Math.PI * 2),
    arcmin: U('Arcminute', Math.PI / 10800), arcsec: U('Arcsecond', Math.PI / 648000),
  }),
  T('currency-converter', 'Currency Converter', 'Convert between major world currencies (approximate offline rates).', {
    usd: U('USD $', 1), eur: U('EUR €', 1.08), gbp: U('GBP £', 1.27), inr: U('INR ₹', 0.012),
    pkr: U('PKR ₨', 0.0036), aed: U('AED د.إ', 0.27), sar: U('SAR ﷼', 0.27),
    cny: U('CNY ¥', 0.14), jpy: U('JPY ¥', 0.0067), cad: U('CAD $', 0.73),
    aud: U('AUD $', 0.66), chf: U('CHF', 1.13),
  }, { note: 'Approximate offline rates — for reference only, not live market data.' }),
];
