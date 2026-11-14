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
  return `${(fraccion * 100).toFixed(decimales).replace('.', ',')} %`;
}

/** Fecha AAAA-MM-DD → «1 de noviembre de 2026». */
export function fechaLarga(iso) {
  if (!iso) return '–';
  const M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} de ${M[m - 1]} de ${a}`;
}
