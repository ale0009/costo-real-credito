// Tasa de usura y semáforo. Funciones puras.
// Usura = 1,5 × interés bancario corriente (IBC) certificado por la Superintendencia Financiera.

/** Usura en % EA a partir del IBC en % EA, redondeada a 2 decimales como la publica la Superfinanciera. */
export function usuraDesdeIBC(ibcPct) {
  return Math.round(ibcPct * 1.5 * 100 + 1e-9) / 100;
}

/** Lee «18.89%» o «18,89 %» (texto de datos.gov.co) → 18.89. */
export function leerPorcentajeTexto(t) {
  if (typeof t === 'number') return t;
  const n = Number(String(t).replace('%', '').replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}

const NOMBRES = {
  'CONSUMO Y ORDINARIO': ['consumo-ordinario', 'Consumo y ordinario'],
  'CONSUMO BAJO MONTO': ['consumo-bajo-monto', 'Consumo de bajo monto'],
  'CREDITO PRODUCTIVO MAYOR MONTO': ['productivo-mayor-monto', 'Productivo de mayor monto'],
  'CREDITO PRODUCTIVO RURAL': ['productivo-rural', 'Productivo rural'],
  'CREDITO PRODUCTIVO URBANO': ['productivo-urbano', 'Productivo urbano'],
  'CREDITO POPULAR PRODUCTIVO RURAL': ['popular-productivo-rural', 'Popular productivo rural'],
  'CREDITO POPULAR PRODUCTIVO URBANO': ['popular-productivo-urbano', 'Popular productivo urbano'],
};

/**
 * Convierte filas de la API de datos.gov.co (conjunto pare-7x5i) en la certificación más reciente
 * con el mismo formato de datos/usura.json. Devuelve null si no hay consumo y ordinario.
 */
export function certificacionDesdeFilas(filas) {
  if (!Array.isArray(filas) || !filas.length) return null;
  const validas = filas.filter((f) => f && f.vigencia_desde && f.modalidad && leerPorcentajeTexto(f.interes_bancario_corriente) !== null);
  const consumo = validas.filter((f) => f.modalidad === 'CONSUMO Y ORDINARIO').sort((a, b) => b.vigencia_desde.localeCompare(a.vigencia_desde))[0];
  if (!consumo) return null;
  const mismas = validas.filter((f) => f.vigencia_desde === consumo.vigencia_desde && NOMBRES[f.modalidad]);
  const modalidades = mismas.map((f) => {
    const ibc = leerPorcentajeTexto(f.interes_bancario_corriente);
    const [id, nombre] = NOMBRES[f.modalidad];
    return { orden: Object.keys(NOMBRES).indexOf(f.modalidad), id, nombre, ibc_ea: ibc, usura_ea: usuraDesdeIBC(ibc) };
  }).sort((a, b) => a.orden - b.orden).map(({ orden, ...m }) => m);
  return {
    resolucion: `Resolución ${consumo.resolucion} de ${consumo.fecha_resolucion ? consumo.fecha_resolucion.slice(0, 4) : consumo.vigencia_desde.slice(0, 4)}`,
    fecha_resolucion: consumo.fecha_resolucion ? consumo.fecha_resolucion.slice(0, 10) : null,
    vigencia_desde: consumo.vigencia_desde.slice(0, 10),
    vigencia_hasta: consumo.vigencia_hasta ? consumo.vigencia_hasta.slice(0, 10) : null,
    modalidades,
  };
}

/** ¿La fecha (AAAA-MM-DD) cae dentro de la vigencia? */
export function vigenteEn(cert, fechaISO) {
  if (!cert || !cert.vigencia_desde) return false;
  return fechaISO >= cert.vigencia_desde && (!cert.vigencia_hasta || fechaISO <= cert.vigencia_hasta);
}

/**
 * Semáforo frente a la usura. Valores en fracción EA.
 * rojo: igual o por encima del tope · ambar: a menos de 3 puntos del tope · verde: por debajo.
 */
export function semaforo(tasaEA, usuraEA, margen = 0.03) {
  if (!Number.isFinite(tasaEA) || !Number.isFinite(usuraEA)) return 'gris';
  if (tasaEA >= usuraEA - 1e-12) return 'rojo';
  if (tasaEA >= usuraEA - margen) return 'ambar';
  return 'verde';
}
