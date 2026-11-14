// Conversión de tasas de interés. Funciones puras; las tasas van en fracción (0,24 = 24 %).
// EA: efectiva anual. MV: mensual vencida (tasa periódica de un mes). NMV: nominal anual mes vencido (= 12 × MV).

/**
 * Lee un número escrito en español: «24,5», «24.5», «1.234,5», «10.000.000», «$ 150.000». Devuelve null si no es válido.
 * Con `montos: true`, un único punto seguido de 3 cifras («150.000») se lee como separador de miles;
 * sin él («0.125» en una tasa) es punto decimal. Los puntos de miles deben ir en grupos de 3 cifras.
 */
export function leerNumero(texto, { montos = false } = {}) {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : null;
  if (typeof texto !== 'string') return null;
  let t = texto.replace(/[\s$%]/g, '');
  if (!t) return null;
  // cifras con separadores sueltos: nada de «12..3», «1.,5», «.5.» ni separador al principio o al final
  if (!/^-?\d+([.,]\d+)*$/.test(t)) return null;
  const MILES = /^-?\d{1,3}(\.\d{3})+$/;
  const comas = (t.match(/,/g) || []).length;
  if (comas > 1) return null;
  if (comas === 1) {
    const [entera, decimal] = t.split(',');
    // la coma es el decimal: antes, puntos de miles bien agrupados («1.234,5»); después, solo cifras («1,234.5» no)
    if (decimal.includes('.')) return null;
    if (entera.includes('.') && !MILES.test(entera)) return null;
    t = `${entera.replace(/\./g, '')}.${decimal}`;
  } else {
    const puntos = (t.match(/\./g) || []).length;
    // «10.000.000» o «150.000»: puntos de miles (grupos de 3). «24.5»: punto decimal.
    if (puntos > 1) {
      if (!MILES.test(t)) return null; // «1.23.4», «1.2345.678»
      t = t.replace(/\./g, '');
    } else if (montos && puntos === 1 && /\.\d{3}$/.test(t)) {
      if (!MILES.test(t)) return null; // «1500.000»: ¿miles mal puestos o decimales? Mejor no adivinar
      t = t.replace(/\./g, '');
    }
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Tasa periódica equivalente a una efectiva anual: (1 + EA)^(1/m) − 1. */
export function efectivaAPeriodica(ea, m = 12) {
  return Math.pow(1 + ea, 1 / m) - 1;
}

/** Efectiva anual equivalente a una tasa periódica con m periodos al año: (1 + i)^m − 1. */
export function periodicaAEfectiva(i, m = 12) {
  return Math.pow(1 + i, m) - 1;
}

/** Nominal anual capitalizable m veces al año → efectiva anual: (1 + j/m)^m − 1. */
export function nominalAEfectiva(j, m = 12) {
  return periodicaAEfectiva(j / m, m);
}

/** Efectiva anual → nominal anual capitalizable m veces al año: m · ((1 + EA)^(1/m) − 1). */
export function efectivaANominal(ea, m = 12) {
  return m * efectivaAPeriodica(ea, m);
}

/**
 * Convierte una tasa dada como EA, MV o NMV a las tres formas.
 * @param {'EA'|'MV'|'NMV'} tipo
 * @param {number} valor en fracción
 * @returns {{ea:number, mv:number, nmv:number}}
 */
export function convertirTasa(tipo, valor) {
  if (!Number.isFinite(valor) || valor <= -1) throw new RangeError('Tasa no válida');
  let mv;
  if (tipo === 'EA') mv = efectivaAPeriodica(valor, 12);
  else if (tipo === 'MV') mv = valor;
  else if (tipo === 'NMV') mv = valor / 12;
  else throw new RangeError(`Tipo de tasa desconocido: ${tipo}`);
  return { ea: periodicaAEfectiva(mv, 12), mv, nmv: 12 * mv };
}

/** Valor presente de una lista de flujos al final de cada periodo 1..n (o con tiempos explícitos {t, valor}). */
export function valorPresente(flujos, i) {
  return flujos.reduce((s, f, k) => {
    const t = typeof f === 'number' ? k + 1 : f.t;
    const v = typeof f === 'number' ? f : f.valor;
    return s + v / Math.pow(1 + i, t);
  }, 0);
}

/** Valor presente de una anualidad vencida de n pagos R a la tasa periódica i. */
export function vpAnualidad(R, i, n) {
  if (i === 0) return R * n;
  return R * (1 - Math.pow(1 + i, -n)) / i;
}
