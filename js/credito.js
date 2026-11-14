// Crédito con cuota fija (sistema francés), seguros, cargos y comisiones; TIR del costo real.
// Funciones puras. Montos en pesos; tasas en fracción.

import { periodicaAEfectiva } from './tasas.js';

/** Cuota fija del sistema francés: P · i / (1 − (1 + i)^−n). Con i = 0, P / n. */
export function cuotaFrancesa(P, i, n) {
  if (!(P > 0) || !(n >= 1) || !Number.isInteger(n)) throw new RangeError('Monto o plazo no válidos');
  if (!Number.isFinite(i) || i < 0) throw new RangeError('Tasa no válida');
  if (i === 0) return P / n;
  return P * i / (1 - Math.pow(1 + i, -n));
}

/**
 * Tabla de amortización completa.
 * @param {object} c
 * @param {number} c.monto       capital prestado
 * @param {number} c.plazo       número de cuotas mensuales
 * @param {number} c.mv          tasa mensual vencida (fracción)
 * @param {{tipo:'tasa'|'fijo', valor:number}} [c.seguro]  tasa mensual sobre el saldo, o valor fijo mensual
 * @param {number} [c.cargos]    cuota de manejo y otros cargos fijos mensuales
 * @param {number} [c.comisiones] comisiones iniciales (se descuentan del desembolso)
 */
export function tablaAmortizacion({ monto, plazo, mv, seguro = { tipo: 'fijo', valor: 0 }, cargos = 0, comisiones = 0 }) {
  const cuota = cuotaFrancesa(monto, mv, plazo);
  const filas = [];
  let saldo = monto;
  for (let k = 1; k <= plazo; k++) {
    const interes = saldo * mv;
    let capital = cuota - interes;
    if (k === plazo) {
      // Con plazos y tasas extremos, (1 + i)^−n se pierde en el redondeo de punto flotante: la cuota
      // queda en solo intereses y la última tendría que pagar casi todo el capital. Mejor rechazar que mentir.
      if (Math.abs(saldo - capital) > Math.max(1, cuota * 1e-4)) {
        throw new RangeError('Con ese plazo y esa tasa la cuota fija no se puede calcular con precisión: reduce el plazo o la tasa.');
      }
      capital = saldo; // la última cuota cierra el saldo exacto (sin residuos de redondeo)
    }
    const seg = seguro.tipo === 'tasa' ? saldo * seguro.valor : seguro.valor;
    const saldoInicial = saldo;
    saldo = Math.max(0, saldo - capital);
    const pagoCuota = interes + capital;
    filas.push({ mes: k, saldoInicial, cuota: pagoCuota, interes, capital, seguro: seg, cargos, pago: pagoCuota + seg + cargos, saldo });
  }
  const suma = (campo) => filas.reduce((s, f) => s + f[campo], 0);
  const totales = {
    cuotas: suma('cuota'), intereses: suma('interes'), capital: suma('capital'),
    seguros: suma('seguro'), cargos: suma('cargos'), comisiones,
  };
  totales.pagado = totales.cuotas + totales.seguros + totales.cargos + comisiones;
  totales.costo = totales.pagado - monto; // lo que pagas por encima de lo que te prestaron
  return { cuota, filas, totales };
}

/** Valor presente neto de flujos f[0..n] a la tasa periódica r. */
export function vpn(flujos, r) {
  let s = 0;
  for (let t = 0; t < flujos.length; t++) s += flujos[t] / Math.pow(1 + r, t);
  return s;
}

function dvpn(flujos, r) {
  let s = 0;
  for (let t = 1; t < flujos.length; t++) s -= t * flujos[t] / Math.pow(1 + r, t + 1);
  return s;
}

/** Techo de la búsqueda de la TIR: 1.000.000 (100.000.000 %) por periodo. Por encima, null. */
export const TIR_MAXIMA = 1e6;

/**
 * Tasa interna de retorno periódica: r tal que VPN = 0.
 * Newton-Raphson desde `inicial`; si no converge o se sale del rango, bisección en [−0,99; 10],
 * y si ahí no hay cambio de signo, el techo se duplica hasta TIR_MAXIMA (comisiones enormes en plazos cortos).
 * Devuelve null si no hay cambio de signo (no existe una TIR en el rango).
 */
export function tir(flujos, { inicial = 0.01, tol = 1e-12, maxIter = 100 } = {}) {
  let r = inicial;
  for (let k = 0; k < maxIter; k++) {
    const f = vpn(flujos, r);
    const d = dvpn(flujos, r);
    if (!Number.isFinite(f) || !Number.isFinite(d) || d === 0) break;
    const nuevo = r - f / d;
    if (!(nuevo > -0.99 && nuevo < 10)) break;
    if (Math.abs(nuevo - r) < tol) return nuevo;
    r = nuevo;
  }
  let lo = -0.99, hi = 10;
  let flo = vpn(flujos, lo), fhi = vpn(flujos, hi);
  while (!(flo * fhi <= 0) && hi < TIR_MAXIMA && Number.isFinite(fhi)) {
    lo = hi; flo = fhi;
    hi = Math.min(hi * 2, TIR_MAXIMA);
    fhi = vpn(flujos, hi);
  }
  if (!(flo * fhi <= 0)) return null;
  for (let k = 0; k < 300; k++) {
    const mid = (lo + hi) / 2;
    const fm = vpn(flujos, mid);
    if (Math.abs(fm) < 1e-9 || (hi - lo) / 2 < tol) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

/**
 * Flujos del deudor: recibe el desembolso neto (monto − comisiones) y paga cada mes.
 * @param {boolean} [conSeguros=true] incluir los seguros en los pagos
 */
export function flujosDelDeudor(monto, tabla, { conSeguros = true, comisiones = tabla.totales.comisiones } = {}) {
  return [monto - comisiones, ...tabla.filas.map((f) => -(f.cuota + f.cargos + (conSeguros ? f.seguro : 0)))];
}

/** Costo efectivo: TIR mensual de los flujos y su equivalente efectivo anual. */
export function costoEfectivo(flujos) {
  const mensual = tir(flujos);
  if (mensual === null) return null;
  return { mensual, ea: periodicaAEfectiva(mensual, 12) };
}

/**
 * ¿El costo es incalculable por exceso? Sin TIR, pero se recibe algo y se paga más de lo recibido:
 * la TIR existe y es positiva, solo que supera TIR_MAXIMA.
 */
function desbordado(costo, flujos) {
  if (costo !== null) return false;
  const pagado = -flujos.slice(1).reduce((s, f) => s + f, 0);
  return flujos[0] > 0 && pagado > flujos[0];
}

/**
 * Todo junto: tabla, costo total (con seguros) y costo sin seguros (el que se compara con la usura).
 * `desborde.total` / `desborde.sinSeguros`: el costo existe pero es demasiado alto para calcularlo.
 */
export function analizarCredito(c) {
  const tabla = tablaAmortizacion(c);
  const fTotal = flujosDelDeudor(c.monto, tabla);
  const fSin = flujosDelDeudor(c.monto, tabla, { conSeguros: false });
  const total = costoEfectivo(fTotal);
  const sinSeguros = costoEfectivo(fSin);
  return {
    ...tabla, costoTotal: total, costoSinSeguros: sinSeguros,
    desborde: { total: desbordado(total, fTotal), sinSeguros: desbordado(sinSeguros, fSin) },
  };
}
