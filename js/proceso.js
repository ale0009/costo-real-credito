// Gráficas y tablas de /proceso/ (SVG propio, sin librerías).
import { iniciarTema } from './tema.js';
import { analizarCredito } from './credito.js';
import { convertirTasa, leerNumero } from './tasas.js';
import { usuraDesdeIBC } from './usura.js';
import { pesos, pct, fechaLarga } from './formato.js';
import { EJEMPLO } from './ejemplo.js';

iniciarTema(document.getElementById('tema'));

const NS = 'http://www.w3.org/2000/svg';
function el(nombre, atributos = {}, texto) {
  const e = document.createElementNS(NS, nombre);
  for (const [k, v] of Object.entries(atributos)) e.setAttribute(k, v);
  if (texto !== undefined) e.textContent = texto;
  return e;
}
const n2 = (x) => x.toFixed(2).replace('.', ',');

const base = {
  monto: leerNumero(EJEMPLO.monto, { montos: true }),
  plazo: Number(EJEMPLO.plazo),
  mv: convertirTasa(EJEMPLO.tipo, leerNumero(EJEMPLO.tasa) / 100).mv,
  seguro: { tipo: EJEMPLO.seguroTipo, valor: leerNumero(EJEMPLO.seguro) / 100 },
  cargos: leerNumero(EJEMPLO.cargos, { montos: true }),
  comisiones: leerNumero(EJEMPLO.comisiones, { montos: true }),
};
const ej = analizarCredito(base);

// ---------- 1. Composición del pago mes a mes ----------
function graficaCuotas(caja) {
  const W = 720, H = 300, m = { i: 64, d: 12, s: 16, b: 34 };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'grafica', role: 'img', 'aria-labelledby': 'g-cuotas-t' });
  svg.append(el('title', { id: 'g-cuotas-t' }, `Pago de cada mes del crédito de ejemplo: el interés baja de ${pesos(ej.filas[0].interes)} en el mes 1 a ${pesos(ej.filas.at(-1).interes)} en el mes ${ej.filas.length}, mientras el capital sube; seguro y cargos se suman encima.`));
  const max = Math.max(...ej.filas.map((f) => f.pago)) * 1.08;
  const ancho = (W - m.i - m.d) / ej.filas.length;
  const y = (v) => H - m.b - (v / max) * (H - m.s - m.b);
  for (let v = 0; v <= max; v += 100000) {
    svg.append(el('line', { x1: m.i, x2: W - m.d, y1: y(v), y2: y(v), class: 'g-reji' }));
    svg.append(el('text', { x: m.i - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'g-eje' }, `${v / 1000} mil`));
  }
  const capas = [['interes', 'var(--cian)'], ['capital', 'var(--papel-2)'], ['seguro', 'var(--ambar)'], ['cargos', 'var(--rojo)']];
  ej.filas.forEach((f, k) => {
    let acum = 0;
    const x = m.i + k * ancho + 1;
    for (const [campo, color] of capas) {
      const v = f[campo];
      svg.append(el('rect', { x, y: y(acum + v), width: Math.max(1, ancho - 2), height: Math.max(0, y(acum) - y(acum + v)), fill: color, stroke: 'var(--tinta)', 'stroke-width': 0.6 }));
      acum += v;
    }
    if ((k + 1) % 6 === 0 || k === 0) svg.append(el('text', { x: x + ancho / 2, y: H - m.b + 16, 'text-anchor': 'middle', class: 'g-eje' }, String(k + 1)));
  });
  svg.append(el('line', { x1: m.i, x2: W - m.d, y1: y(0), y2: y(0), class: 'g-base' }));
  svg.append(el('text', { x: W - m.d, y: H - 4, 'text-anchor': 'end', class: 'g-eje' }, 'mes'));
  caja.replaceChildren(svg);
}

// ---------- 2. Costo efectivo según el plazo ----------
function graficaPlazos(caja, usura) {
  const plazos = [3, 6, 9, 12, 18, 24, 30, 36, 42, 48, 54, 60];
  const datos = plazos.map((n) => {
    const r = analizarCredito({ ...base, plazo: n });
    return { n, total: r.costoTotal.ea * 100, sin: r.costoSinSeguros.ea * 100 };
  });
  const W = 720, H = 300, m = { i: 52, d: 120, s: 16, b: 36 };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'grafica', role: 'img', 'aria-labelledby': 'g-plazos-t' });
  const d6 = datos.find((d) => d.n === 6);
  svg.append(el('title', { id: 'g-plazos-t' }, `Con la misma tasa pactada de 24 % EA y la misma comisión, el costo efectivo sin seguros es ${n2(d6.sin)} % a 6 meses y ${n2(datos.at(-1).sin)} % a 60 meses; la usura es ${n2(usura)} %.`));
  const ymin = 22, ymax = Math.ceil(Math.max(...datos.map((d) => d.total), usura) + 2);
  const x = (n) => m.i + ((n - 3) / (60 - 3)) * (W - m.i - m.d);
  const y = (v) => H - m.b - ((v - ymin) / (ymax - ymin)) * (H - m.s - m.b);
  for (let v = ymin; v <= ymax; v += 2) {
    svg.append(el('line', { x1: m.i, x2: W - m.d, y1: y(v), y2: y(v), class: 'g-reji' }));
    svg.append(el('text', { x: m.i - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'g-eje' }, `${v} %`));
  }
  for (const n of [6, 12, 24, 36, 48, 60]) svg.append(el('text', { x: x(n), y: H - m.b + 18, 'text-anchor': 'middle', class: 'g-eje' }, String(n)));
  svg.append(el('text', { x: W - m.d, y: H - 4, 'text-anchor': 'end', class: 'g-eje' }, 'plazo (meses)'));
  svg.append(el('line', { x1: m.i, x2: W - m.d, y1: y(24), y2: y(24), stroke: 'var(--tinta-suave)', 'stroke-width': 2, 'stroke-dasharray': '2 4' }));
  svg.append(el('text', { x: W - m.d + 6, y: y(24) + 4, class: 'g-eje' }, 'pactada 24 %'));
  svg.append(el('line', { x1: m.i, x2: W - m.d, y1: y(usura), y2: y(usura), class: 'g-ref' }));
  svg.append(el('text', { x: W - m.d + 6, y: y(usura) + 4, class: 'g-ref-t' }, `usura ${n2(usura)} %`));
  const linea = (campo, color, guion) => {
    const dd = datos.map((d, k) => `${k ? 'L' : 'M'}${x(d.n).toFixed(1)} ${y(d[campo]).toFixed(1)}`).join(' ');
    svg.append(el('path', { d: dd, class: 'g-linea', stroke: color, ...(guion ? { 'stroke-dasharray': '7 4' } : {}) }));
    for (const d of datos) svg.append(el('circle', { cx: x(d.n), cy: y(d[campo]), r: 3.5, fill: color, stroke: 'var(--tinta)', 'stroke-width': 1 }));
  };
  linea('total', 'var(--rojo)', false);
  linea('sin', 'var(--cian)', true);
  svg.append(el('text', { x: W - m.d + 6, y: y(datos.at(-1).total) - 4, class: 'g-rotulo' }, 'con seguro'));
  svg.append(el('text', { x: W - m.d + 6, y: y(datos.at(-1).sin) + 14, class: 'g-rotulo' }, 'sin seguro'));
  caja.replaceChildren(svg);
  const t = document.getElementById('t-plazos');
  t.innerHTML = datos.filter((d) => [6, 12, 24, 36, 60].includes(d.n)).map((d) => `<tr><td class="num">${d.n}</td><td class="num">${n2(d.sin)} %</td><td class="num">${n2(d.total)} %</td><td>${d.sin >= usura ? '<span class="prueba-mal">supera la usura</span>' : (d.sin >= usura - 3 ? 'cerca del tope' : 'por debajo')}</td></tr>`).join('');
}

// ---------- 3. Histórico de la usura de consumo ----------
function graficaHistorico(caja, hist) {
  const W = 720, H = 300, m = { i: 52, d: 110, s: 16, b: 36 };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'grafica', role: 'img', 'aria-labelledby': 'g-hist-t' });
  const puntos = hist.map((h) => ({ ...h, usura: usuraDesdeIBC(h.ibc_ea) }));
  const pico = puntos.reduce((a, b) => (b.usura > a.usura ? b : a));
  const ult = puntos.at(-1);
  svg.append(el('title', { id: 'g-hist-t' }, `Tasa de usura de consumo y ordinario, mes a mes, de ${fechaLarga(puntos[0].desde)} a ${fechaLarga(ult.desde)}. Pico de ${n2(pico.usura)} % en ${pico.desde.slice(0, 7)}; hoy ${n2(ult.usura)} %.`));
  const ymin = 15, ymax = 50;
  const x = (k) => m.i + (k / (puntos.length - 1)) * (W - m.i - m.d);
  const y = (v) => H - m.b - ((v - ymin) / (ymax - ymin)) * (H - m.s - m.b);
  for (let v = ymin; v <= ymax; v += 5) {
    svg.append(el('line', { x1: m.i, x2: W - m.d, y1: y(v), y2: y(v), class: 'g-reji' }));
    svg.append(el('text', { x: m.i - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'g-eje' }, `${v} %`));
  }
  puntos.forEach((p, k) => { if (p.desde.slice(5, 7) === '01') svg.append(el('text', { x: x(k), y: H - m.b + 18, 'text-anchor': 'middle', class: 'g-eje' }, p.desde.slice(0, 4))); });
  const camino = (campo) => puntos.map((p, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${y(p[campo]).toFixed(1)}`).join(' ');
  svg.append(el('path', { d: camino('usura'), class: 'g-linea', stroke: 'var(--rojo)' }));
  svg.append(el('path', { d: camino('ibc_ea'), class: 'g-linea', stroke: 'var(--cian)', 'stroke-dasharray': '7 4' }));
  const kp = puntos.indexOf(pico);
  svg.append(el('circle', { cx: x(kp), cy: y(pico.usura), r: 5, fill: 'var(--rojo)', stroke: 'var(--tinta)' }));
  svg.append(el('text', { x: x(kp) + 8, y: y(pico.usura) - 6, class: 'g-rotulo' }, `pico ${n2(pico.usura)} %`));
  const ku = puntos.length - 1;
  svg.append(el('circle', { cx: x(ku), cy: y(ult.usura), r: 5, fill: 'var(--rojo)', stroke: 'var(--tinta)' }));
  svg.append(el('text', { x: x(ku) + 8, y: y(ult.usura) + 4, class: 'g-rotulo' }, `usura ${n2(ult.usura)} %`));
  svg.append(el('text', { x: x(ku) + 8, y: y(ult.ibc_ea) + 4, class: 'g-eje' }, `IBC ${n2(ult.ibc_ea)} %`));
  caja.replaceChildren(svg);
}

function tablaModalidades(d) {
  document.getElementById('t-modalidades').innerHTML = d.modalidades.map((m) => `<tr><td>${m.nombre}</td><td class="num">${String(m.ibc_ea.toFixed(2)).replace('.', ',')} %</td><td class="num"><strong>${String(m.usura_ea.toFixed(2)).replace('.', ',')} %</strong></td></tr>`).join('');
  document.getElementById('vigencia').textContent = `${d.resolucion}, del ${fechaLarga(d.fecha_resolucion)}; vigente del ${fechaLarga(d.vigencia_desde)} al ${fechaLarga(d.vigencia_hasta)}. Consultada el ${fechaLarga(d.fecha_consulta)}.`;
}

function cifrasEjemplo() {
  const t = ej.totales;
  document.getElementById('c-ejemplo').innerHTML = [
    `Cuota fija: <strong>${pesos(ej.cuota)}</strong>; primer pago del mes con seguro y cargos: ${pesos(ej.filas[0].pago)}.`,
    `Total pagado: <strong>${pesos(t.pagado)}</strong> por ${pesos(base.monto)} prestados; intereses ${pesos(t.intereses)}, seguros ${pesos(t.seguros)}, cargos ${pesos(t.cargos)} y comisión ${pesos(t.comisiones)}.`,
    `Tasa pactada 24 % EA = ${pct(convertirTasa('EA', 0.24).mv, 4)} MV = ${pct(convertirTasa('EA', 0.24).nmv, 4)} NMV.`,
    `Costo efectivo: <strong>${pct(ej.costoTotal.ea)} EA</strong> con seguro y <strong>${pct(ej.costoSinSeguros.ea)} EA</strong> sin seguro.`,
  ].map((x) => `<li>${x} <span class="marca">calculado aquí</span></li>`).join('');
}

graficaCuotas(document.getElementById('g-cuotas'));
cifrasEjemplo();
fetch('../datos/usura.json').then((r) => r.json()).then((d) => {
  const usura = d.modalidades.find((m) => m.id === 'consumo-ordinario').usura_ea;
  graficaPlazos(document.getElementById('g-plazos'), usura);
  graficaHistorico(document.getElementById('g-historico'), d.historico_consumo);
  tablaModalidades(d);
}).catch(() => {
  for (const id of ['g-plazos', 'g-historico']) document.getElementById(id).textContent = 'No se pudieron leer los datos guardados (datos/usura.json).';
});
