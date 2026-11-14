// Formato en español de Colombia. Funciones puras.

/** Pesos sin decimales, con punto de miles: 380380.61 → «$ 380.381». */
export function pesos(v) {
  if (!Number.isFinite(v)) return '–';
  const r = Math.round(v);
  const txt = Math.abs(r).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${r < 0 ? '−' : ''}$ ${txt}`;
}

/** Porcentaje desde una fracción: 0.2834 → «28,34 %». */
export function pct(fraccion, decimales = 2) {
  if (!Number.isFinite(fraccion)) return '–';
  let txt = (fraccion * 100).toFixed(decimales);
  if (/^-0(\.0*)?$/.test(txt)) txt = txt.slice(1); // sin «-0,000 %» por ruido de punto flotante
  return `${txt.replace('.', ',')} %`;
}

/** Fecha de hoy (AAAA-MM-DD) en hora de Colombia, no en UTC. */
export function hoyBogota(fecha = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
}

/** Fecha AAAA-MM-DD → «1 de noviembre de 2026». */
export function fechaLarga(iso) {
  if (!iso) return '–';
  const M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} de ${M[m - 1]} de ${a}`;
}
