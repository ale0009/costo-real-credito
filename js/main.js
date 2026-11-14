// Interfaz de «¿Cuánto te cuesta de verdad este crédito?».
import { iniciarTema } from './tema.js';
import { leerNumero, convertirTasa } from './tasas.js';
import { analizarCredito } from './credito.js';
import { certificacionDesdeFilas, semaforo, vigenteEn } from './usura.js';
import { pesos, pct, fechaLarga } from './formato.js';
import { EJEMPLO } from './ejemplo.js';

const $ = (id) => document.getElementById(id);
const API = 'https://www.datos.gov.co/resource/pare-7x5i.json';
const SIN_CONEXION = new URLSearchParams(location.search).has('sin-conexion');

let cert = null;          // certificación de usura en uso
let origen = 'cargando';  // 'vivo' | 'guardado' | 'cargando'
let motivoGuardado = '';

iniciarTema($('tema'));

// ---------- formulario ----------
const campos = ['monto', 'plazo', 'tasa', 'seguro', 'cargos', 'comisiones'];

function valorRadio(nombre) {
  return document.querySelector(`input[name="${nombre}"]:checked`).value;
}
function ponerRadio(nombre, valor) {
  const r = document.querySelector(`input[name="${nombre}"][value="${valor}"]`);
  if (r) r.checked = true;
}

function cargarEjemplo() {
  for (const c of campos) $(c).value = EJEMPLO[c];
  ponerRadio('tipo', EJEMPLO.tipo);
  ponerRadio('seguro-tipo', EJEMPLO.seguroTipo);
  if ([...$('modalidad').options].some((o) => o.value === EJEMPLO.modalidad)) $('modalidad').value = EJEMPLO.modalidad;
  actualizar();
}

function esEjemplo() {
  return campos.every((c) => $(c).value.trim() === EJEMPLO[c]) && valorRadio('tipo') === EJEMPLO.tipo && valorRadio('seguro-tipo') === EJEMPLO.seguroTipo;
}

function marcarError(id, mensaje) {
  const input = $(id);
  const err = $(`err-${id}`);
  if (mensaje) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  if (err) err.textContent = mensaje || '';
  return !mensaje;
}

/** Lee y valida el formulario. Devuelve el crédito o null. */
function leerFormulario() {
  const monto = leerNumero($('monto').value, { montos: true });
  const plazo = Number($('plazo').value);
  const tasa = leerNumero($('tasa').value);
  const tipo = valorRadio('tipo');
  const seguroTipo = valorRadio('seguro-tipo');
  const seguro = $('seguro').value.trim() === '' ? 0 : leerNumero($('seguro').value, { montos: seguroTipo === 'fijo' });
  const cargos = $('cargos').value.trim() === '' ? 0 : leerNumero($('cargos').value, { montos: true });
  const comisiones = $('comisiones').value.trim() === '' ? 0 : leerNumero($('comisiones').value, { montos: true });

  let ok = true;
  ok &= marcarError('monto', monto > 0 ? '' : 'Escribe un monto mayor que 0.');
  ok &= marcarError('plazo', Number.isInteger(plazo) && plazo >= 1 && plazo <= 600 ? '' : 'Entre 1 y 600 meses, sin decimales.');
  const maxTasa = tipo === 'MV' ? 20 : 300;
  ok &= marcarError('tasa', tasa !== null && tasa >= 0 && tasa <= maxTasa ? '' : `Escribe una tasa entre 0 y ${maxTasa} %.`);
  ok &= marcarError('seguro', seguro !== null && seguro >= 0 && (seguroTipo === 'fijo' || seguro <= 5) ? '' : (seguroTipo === 'fijo' ? 'Escribe un valor en pesos (0 si no hay).' : 'Entre 0 y 5 % al mes.'));
  ok &= marcarError('cargos', cargos !== null && cargos >= 0 ? '' : 'Escribe un valor en pesos (0 si no hay).');
  ok &= marcarError('comisiones', comisiones !== null && comisiones >= 0 && (!(monto > 0) || comisiones < monto) ? '' : 'Debe ser 0 o más y menor que el monto.');
  if (!ok) return null;

  const tasas = convertirTasa(tipo, tasa / 100);
  return {
    tipo, tasas,
    credito: {
      monto, plazo, mv: tasas.mv, cargos, comisiones,
      seguro: { tipo: seguroTipo, valor: seguroTipo === 'tasa' ? seguro / 100 : seguro },
    },
  };
}

// ---------- pintar ----------
const COMPONENTES = [
  ['capital', 'Capital (lo que te prestaron)', 'var(--papel-2)', 'var(--tinta)'],
  ['intereses', 'Intereses', 'var(--cian)', '#0A090A'],
  ['seguros', 'Seguros', 'var(--ambar)', '#0A090A'],
  ['cargos', 'Cargos mensuales', 'var(--rojo)', '#FFFFFF'],
  ['comisiones', 'Comisiones iniciales', 'var(--rojo-osc)', '#FFFFFF'],
];

function pintarComposicion(t) {
  const total = t.pagado;
  const barra = $('barra-total');
  barra.replaceChildren();
  const ley = $('leyenda-total');
  ley.replaceChildren();
  const partes = [];
  for (const [k, nombre, color, texto] of COMPONENTES) {
    const v = t[k];
    const p = total > 0 ? v / total : 0;
    if (v > 0) {
      const s = document.createElement('span');
      s.style.setProperty('--c', color);
      s.style.flexGrow = String(v);
      s.style.color = texto;
      if (p >= 0.08) s.textContent = pct(p, 0);
      barra.append(s);
    }
    const li = document.createElement('li');
    li.innerHTML = `<i style="--c:${color}"></i>${nombre}: <strong>${pesos(v)}</strong> <span class="peq">(${pct(p, 1)})</span>`;
    ley.append(li);
    partes.push(`${nombre} ${pct(p, 1)}`);
  }
  barra.setAttribute('aria-label', `Composición del total pagado de ${pesos(total)}: ${partes.join(', ')}.`);
}

function pintarTabla(r) {
  const filas = r.filas.map((f) => `<tr><th scope="row">${f.mes}</th><td>${pesos(f.saldoInicial)}</td><td>${pesos(f.cuota)}</td><td>${pesos(f.interes)}</td><td>${pesos(f.capital)}</td><td>${pesos(f.seguro)}</td><td>${pesos(f.cargos)}</td><td><strong>${pesos(f.pago)}</strong></td><td>${pesos(f.saldo)}</td></tr>`);
  $('cuerpo-tabla').innerHTML = filas.join('');
  const t = r.totales;
  $('pie-tabla').innerHTML = `<tr><th scope="row">Total</th><td></td><td>${pesos(t.cuotas)}</td><td>${pesos(t.intereses)}</td><td>${pesos(t.capital)}</td><td>${pesos(t.seguros)}</td><td>${pesos(t.cargos)}</td><td><strong>${pesos(t.cuotas + t.seguros + t.cargos)}</strong></td><td></td></tr>`
    + (t.comisiones > 0 ? `<tr><th scope="row" colspan="7">Más comisiones iniciales (descontadas del desembolso)</th><td><strong>${pesos(t.comisiones)}</strong></td><td></td></tr>` : '');
}

function modalidadActual() {
  if (!cert) return null;
  return cert.modalidades.find((m) => m.id === $('modalidad').value) || cert.modalidades[0];
}

const TEXTO_SELLO = {
  verde: 'Por debajo de la usura',
  ambar: 'Cerca del tope',
  rojo: 'En la usura o por encima',
  gris: 'Sin comparar',
};

function pintarUsura(d, tasaEA) {
  const hud = $('resultado');
  const mod = modalidadActual();
  if (!mod || !d) {
    hud.dataset.semaforo = 'gris';
    $('sello').textContent = TEXTO_SELLO.gris;
    $('semaforo-detalle').textContent = cert ? '' : 'Cargando la tasa de usura…';
    return;
  }
  const usura = mod.usura_ea / 100;
  const sinSeg = d.costoSinSeguros ? d.costoSinSeguros.ea : NaN;
  const orden = ['verde', 'ambar', 'rojo'];
  const a = semaforo(tasaEA, usura);
  const b = semaforo(sinSeg, usura);
  const estado = orden[Math.max(orden.indexOf(a), orden.indexOf(b))] || 'gris';
  hud.dataset.semaforo = estado;
  $('sello').textContent = TEXTO_SELLO[estado];
  const base = `Usura de ${mod.nombre.toLowerCase()}: <strong>${pct(usura)} EA</strong>. Tasa pactada: ${pct(tasaEA)}; con cargos y comisiones, sin seguros: ${pct(sinSeg)} (estimación de lo que cuenta como interés para la usura).`;
  const cola = {
    verde: '',
    ambar: ' Está a menos de 3 puntos del tope.',
    rojo: tasaEA >= usura ? ' La tasa pactada ya llega al tope legal: revisa el contrato.' : ' Con los cargos y comisiones el costo llega al tope legal: revisa qué cobra el contrato.',
  }[estado] || '';
  $('semaforo-detalle').innerHTML = base + cola;

  // medidor: escala hasta un poco más que la usura o el costo
  const escala = Math.max(usura, d.costoTotal ? d.costoTotal.ea : 0, tasaEA) * 1.15 || 1;
  const w = (x) => `${Math.min(100, Math.max(0, (x / escala) * 100))}%`;
  $('medidor-pactada').style.width = w(tasaEA);
  $('medidor-costo').style.left = w(tasaEA);
  $('medidor-costo').style.width = `calc(${w(d.costoTotal ? d.costoTotal.ea : tasaEA)} - ${w(tasaEA)})`;
  $('medidor-usura').style.left = w(usura);
  $('medidor').setAttribute('aria-label', `Tasa pactada ${pct(tasaEA)}, costo efectivo ${pct(d.costoTotal ? d.costoTotal.ea : NaN)}, usura ${pct(usura)}.`);
}

function pintarFuente() {
  const chip = $('estado-usura');
  if (!cert) { chip.className = 'chip chip-carga'; chip.textContent = 'Cargando la usura…'; $('fuente-usura').textContent = ''; return; }
  const hoy = new Date().toISOString().slice(0, 10);
  const vigente = vigenteEn(cert, hoy);
  if (origen === 'vivo') { chip.className = 'chip chip-vivo'; chip.textContent = 'En vivo: datos.gov.co'; }
  else { chip.className = 'chip chip-guardado'; chip.textContent = `Sin conexión: datos guardados del ${fechaLarga(cert.fecha_consulta || '2026-11-14')}`; }
  const prefijo = vigente ? 'Vigente' : 'Última certificación verificada, vigente';
  $('fuente-usura').innerHTML = `${prefijo} del ${fechaLarga(cert.vigencia_desde)} al ${fechaLarga(cert.vigencia_hasta)} · ${cert.resolucion} · <a href="https://www.superfinanciera.gov.co/publicaciones/10829/interes-bancario-corriente/" target="_blank" rel="noopener">Superintendencia Financiera</a>${motivoGuardado ? ` <span class="motivo">${motivoGuardado}</span>` : ''}`;
}

let ultimo = null;
function actualizar() {
  $('chip-ejemplo').hidden = !esEjemplo();
  const entrada = leerFormulario();
  if (!entrada) {
    $('resultado').dataset.semaforo = 'gris';
    $('costo-ea').textContent = '–';
    $('explica').textContent = 'Revisa los datos marcados en rojo.';
    return;
  }
  let d;
  try { d = analizarCredito(entrada.credito); } catch (e) {
    $('explica').textContent = `No se pudo calcular: ${e.message}`;
    return;
  }
  ultimo = { d, entrada };
  const { tasas } = entrada;
  const c = d.costoTotal;
  $('costo-ea').textContent = c ? pct(c.ea) : '–';
  const extra = c ? c.ea - tasas.ea : 0;
  $('explica').innerHTML = c
    ? (extra > 0.00005
      ? `La tasa dice <strong>${pct(tasas.ea)} EA</strong>; con seguro, cargos y comisiones pagas <strong>${pct(c.ea)} EA</strong>: ${(extra * 100).toFixed(2).replace(".", ",")} puntos más. Equivale a ${pct(c.mensual, 3)} al mes.`
      : `Sin seguro, cargos ni comisiones, el costo efectivo es la misma tasa pactada: <strong>${pct(tasas.ea)} EA</strong>.`)
    : 'No hay una tasa que iguale lo recibido y lo pagado.';

  $('t-ea').textContent = pct(tasas.ea, 4);
  $('t-nmv').textContent = pct(tasas.nmv, 4);
  $('t-mv').textContent = pct(tasas.mv, 4);

  const t = d.totales;
  $('r-cuota').textContent = pesos(d.cuota);
  $('r-pago1').textContent = pesos(d.filas[0].pago);
  $('r-total').textContent = pesos(t.pagado);
  $('r-intereses').textContent = pesos(t.intereses);
  $('r-seguros').textContent = pesos(t.seguros);
  $('r-cargos').textContent = pesos(t.cargos + t.comisiones);

  pintarUsura(d, tasas.ea);
  pintarComposicion(t);
  pintarTabla(d);
}

function llenarModalidades() {
  const sel = $('modalidad');
  const antes = sel.value;
  sel.replaceChildren(...cert.modalidades.map((m) => {
    const o = document.createElement('option');
    o.value = m.id; o.textContent = `${m.nombre} (${String(m.usura_ea).replace('.', ',')} %)`;
    return o;
  }));
  sel.value = cert.modalidades.some((m) => m.id === antes) ? antes : 'consumo-ordinario';
}

// ---------- datos de usura ----------
async function cargarGuardado() {
  const r = await fetch('datos/usura.json');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function cargarEnVivo() {
  const desde = new Date(Date.now() - 75 * 864e5).toISOString().slice(0, 10);
  const url = `${API}?$where=${encodeURIComponent(`vigencia_desde >= '${desde}'`)}&$order=${encodeURIComponent('vigencia_desde DESC')}&$limit=60`;
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`la API respondió ${r.status}`);
    const c = certificacionDesdeFilas(await r.json());
    if (!c) throw new Error('la API no trajo la modalidad de consumo');
    return c;
  } finally { clearTimeout(reloj); }
}

async function iniciarDatos() {
  try {
    const g = await cargarGuardado();
    cert = { ...g };
    origen = 'guardado';
  } catch {
    motivoGuardado = 'No se pudo leer el archivo de respaldo.';
  }
  if (cert) { llenarModalidades(); }
  pintarFuente();
  actualizar();
  if (SIN_CONEXION) { motivoGuardado = 'Modo sin conexión pedido en la dirección (?sin-conexion).'; pintarFuente(); return; }
  try {
    const vivo = await cargarEnVivo();
    // la certificación en vivo solo reemplaza a la guardada si es igual o más reciente
    if (!cert || vivo.vigencia_desde >= cert.vigencia_desde) {
      cert = { ...vivo, fecha_consulta: new Date().toISOString().slice(0, 10) };
      origen = 'vivo';
      motivoGuardado = '';
      llenarModalidades();
    }
  } catch (e) {
    motivoGuardado = `No se pudo consultar datos.gov.co (${e.name === 'AbortError' ? 'tardó demasiado' : e.message}); se usan los datos guardados.`;
  }
  pintarFuente();
  actualizar();
}

// ---------- eventos ----------
const form = $('formulario');
form.addEventListener('input', actualizar);
form.addEventListener('change', (e) => {
  if (e.target.name === 'seguro-tipo') {
    const fijo = valorRadio('seguro-tipo') === 'fijo';
    $('seguro-unidad').textContent = fijo ? '$ al mes' : '% al mes';
    if (fijo && $('seguro').value.trim() === EJEMPLO.seguro) $('seguro').value = '10.000';
    if (!fijo && $('seguro').value.trim() === '10.000') $('seguro').value = EJEMPLO.seguro;
  }
  actualizar();
});
form.addEventListener('submit', (e) => e.preventDefault());
$('restaurar').addEventListener('click', () => { cargarEjemplo(); $('seguro-unidad').textContent = '% al mes'; });

actualizar();
iniciarDatos();
