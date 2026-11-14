import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leerNumero, convertirTasa, efectivaAPeriodica, periodicaAEfectiva, nominalAEfectiva, efectivaANominal } from '../js/tasas.js';
import { cuotaFrancesa, tablaAmortizacion, tir, vpn, flujosDelDeudor, analizarCredito, TIR_MAXIMA } from '../js/credito.js';
import { usuraDesdeIBC, semaforo, semaforoCredito, certificacionDesdeFilas, vigenteEn, leerPorcentajeTexto } from '../js/usura.js';
import { pesos, pct, fechaLarga, hoyBogota } from '../js/formato.js';

const cerca = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b} (tol ${tol})`);

test('leerNumero entiende coma decimal, puntos de miles y signos', () => {
  assert.equal(leerNumero('24,5'), 24.5);
  assert.equal(leerNumero('24.5'), 24.5);
  assert.equal(leerNumero('0.125'), 0.125);
  assert.equal(leerNumero('10.000.000', { montos: true }), 10000000);
  assert.equal(leerNumero('$ 150.000', { montos: true }), 150000);
  assert.equal(leerNumero('1.234,5'), 1234.5);
  for (const malo of ['', 'abc', '1,2,3', null, undefined, '12a']) assert.equal(leerNumero(malo), null, String(malo));
});

test('EA ↔ MV ↔ NMV son inversas entre sí', () => {
  for (const ea of [0, 0.05, 0.1268, 0.24, 0.2834, 0.7182]) {
    const t = convertirTasa('EA', ea);
    cerca(t.ea, ea, 1e-12);
    cerca(convertirTasa('MV', t.mv).ea, ea, 1e-12);
    cerca(convertirTasa('NMV', t.nmv).ea, ea, 1e-12);
    cerca(efectivaANominal(nominalAEfectiva(t.nmv)), t.nmv, 1e-12);
  }
});

test('1 % MV equivale a 12,6825 % EA y a 12 % NMV', () => {
  const t = convertirTasa('MV', 0.01);
  cerca(t.ea, 0.12682503013196977, 1e-15);
  cerca(t.nmv, 0.12, 1e-15);
  cerca(periodicaAEfectiva(efectivaAPeriodica(0.12682503013196977)), 0.12682503013196977, 1e-15);
});

test('la usura de noviembre de 2026 en MV: 28,34 % EA ≈ 2,1 % mensual', () => {
  cerca(convertirTasa('EA', 0.2834).mv, 0.0210, 1e-4);
});

test('convertirTasa rechaza tipos y valores imposibles', () => {
  assert.throws(() => convertirTasa('XX', 0.1), RangeError);
  assert.throws(() => convertirTasa('EA', -1), RangeError);
  assert.throws(() => convertirTasa('EA', NaN), RangeError);
});

test('cuota francesa: caso clásico 1.000.000 a 12 meses al 2 % mensual = 94.559,60', () => {
  cerca(cuotaFrancesa(1_000_000, 0.02, 12), 94559.60, 0.005);
});

test('caso borde: tasa 0 reparte el monto en cuotas iguales', () => {
  assert.equal(cuotaFrancesa(1200, 0, 12), 100);
  const t = tablaAmortizacion({ monto: 1200, plazo: 12, mv: 0 });
  assert.ok(t.filas.every((f) => f.interes === 0 && Math.abs(f.capital - 100) < 1e-9));
  assert.equal(t.totales.intereses, 0);
});

test('caso borde: plazo 1 paga capital más un mes de interés', () => {
  cerca(cuotaFrancesa(500_000, 0.02, 1), 510_000, 1e-6);
  const t = tablaAmortizacion({ monto: 500_000, plazo: 1, mv: 0.02 });
  assert.equal(t.filas.length, 1);
  assert.equal(t.filas[0].saldo, 0);
  cerca(t.totales.intereses, 10_000, 1e-6);
});

test('cuotaFrancesa rechaza montos, plazos y tasas no válidos', () => {
  assert.throws(() => cuotaFrancesa(0, 0.01, 12), RangeError);
  assert.throws(() => cuotaFrancesa(1000, 0.01, 0), RangeError);
  assert.throws(() => cuotaFrancesa(1000, 0.01, 2.5), RangeError);
  assert.throws(() => cuotaFrancesa(1000, -0.01, 12), RangeError);
});

test('tabla: la suma del capital es el monto y el saldo final es 0', () => {
  for (const [monto, plazo, mv] of [[10_000_000, 36, 0.0180876], [3_500_000, 7, 0.031], [777_777, 60, 0.0123]]) {
    const t = tablaAmortizacion({ monto, plazo, mv });
    cerca(t.totales.capital, monto, 1e-6);
    assert.equal(t.filas.at(-1).saldo, 0);
    // cada cuota (capital + interés) es la cuota fija, salvo residuos de redondeo
    for (const f of t.filas) cerca(f.cuota, t.cuota, 1e-6);
    // el interés de cada mes es el saldo inicial por la tasa
    for (const f of t.filas) cerca(f.interes, f.saldoInicial * mv, 1e-6);
  }
});

test('tabla: seguro sobre el saldo baja mes a mes; seguro fijo y cargos no cambian', () => {
  const s = tablaAmortizacion({ monto: 1_000_000, plazo: 12, mv: 0.02, seguro: { tipo: 'tasa', valor: 0.001 }, cargos: 5000 });
  cerca(s.filas[0].seguro, 1000, 1e-9);
  assert.ok(s.filas.every((f, k) => k === 0 || f.seguro < s.filas[k - 1].seguro));
  assert.ok(s.filas.every((f) => f.cargos === 5000));
  const f = tablaAmortizacion({ monto: 1_000_000, plazo: 12, mv: 0.02, seguro: { tipo: 'fijo', valor: 3000 } });
  assert.ok(f.filas.every((x) => x.seguro === 3000));
  cerca(f.totales.pagado, f.totales.cuotas + 36000, 1e-6);
});

test('TIR: sin cargos ni seguros, el costo efectivo es la tasa pactada', () => {
  const t = tablaAmortizacion({ monto: 10_000_000, plazo: 36, mv: efectivaAPeriodica(0.24) });
  const r = tir(flujosDelDeudor(10_000_000, t));
  cerca(r, efectivaAPeriodica(0.24), 1e-10);
});

test('TIR: el VPN en la TIR es cero y la bisección resuelve lo que Newton no', () => {
  const flujos = [-1000, 300, 400, 500];
  const r = tir(flujos);
  cerca(vpn(flujos, r), 0, 1e-7);
  cerca(r, 0.0889633947, 1e-8);
  // inicial absurdo: Newton se sale del rango y la bisección lo rescata
  cerca(tir(flujos, { inicial: 50 }), r, 1e-8);
  assert.equal(tir([100, 100, 100]), null); // sin cambio de signo no hay TIR
});

test('ejemplo de la herramienta: 24 % EA cuesta de verdad 27,6 % EA con seguro, cargos y comisión', () => {
  const r = analizarCredito({ monto: 10_000_000, plazo: 36, mv: efectivaAPeriodica(0.24), seguro: { tipo: 'tasa', valor: 0.001 }, cargos: 5000, comisiones: 100_000 });
  cerca(r.cuota, 380380.61, 0.01);
  cerca(r.totales.intereses, 3693701.90, 0.01);
  cerca(r.costoTotal.ea, 0.27599, 1e-5);
  cerca(r.costoSinSeguros.ea, 0.26101, 1e-5);
  assert.ok(r.costoTotal.ea > r.costoSinSeguros.ea && r.costoSinSeguros.ea > 0.24);
});

test('usura = 1,5 × IBC: noviembre de 2026 (Res. 1707) da 28,34 % y 71,82 %', () => {
  assert.equal(usuraDesdeIBC(18.89), 28.34);
  assert.equal(usuraDesdeIBC(47.88), 71.82);
  assert.equal(usuraDesdeIBC(19.06), 28.59); // octubre de 2026
});

test('datos/usura.json es coherente: usura = 1,5 × IBC en todas las modalidades', () => {
  const d = JSON.parse(readFileSync(new URL('../datos/usura.json', import.meta.url)));
  assert.equal(d.resolucion, 'Resolución 1707 de 2026');
  assert.ok(d.vigencia_desde <= d.vigencia_hasta);
  for (const m of d.modalidades) assert.equal(m.usura_ea, usuraDesdeIBC(m.ibc_ea), m.id);
  assert.ok(d.fuentes.every((f) => f.url.startsWith('https://')));
  assert.ok(d.historico_consumo.length > 24);
});

test('certificacionDesdeFilas toma la vigencia más reciente de datos.gov.co', () => {
  const filas = [
    { resolucion: '1472', fecha_resolucion: '2026-09-30T00:00:00.000', vigencia_desde: '2026-10-01T00:00:00.000', vigencia_hasta: '2026-10-31T00:00:00.000', interes_bancario_corriente: '19.06%', modalidad: 'CONSUMO Y ORDINARIO' },
    { resolucion: '1707', fecha_resolucion: '2026-10-30T00:00:00.000', vigencia_desde: '2026-11-01T00:00:00.000', vigencia_hasta: '2026-11-30T00:00:00.000', interes_bancario_corriente: '47.88%', modalidad: 'CONSUMO BAJO MONTO' },
    { resolucion: '1707', fecha_resolucion: '2026-10-30T00:00:00.000', vigencia_desde: '2026-11-01T00:00:00.000', vigencia_hasta: '2026-11-30T00:00:00.000', interes_bancario_corriente: '18.89%', modalidad: 'CONSUMO Y ORDINARIO' },
    { resolucion: '1707', vigencia_desde: '2026-11-01T00:00:00.000', interes_bancario_corriente: 'roto', modalidad: 'CREDITO PRODUCTIVO RURAL' },
  ];
  const c = certificacionDesdeFilas(filas);
  assert.equal(c.resolucion, 'Resolución 1707 de 2026');
  assert.equal(c.vigencia_hasta, '2026-11-30');
  assert.deepEqual(c.modalidades.map((m) => [m.id, m.usura_ea]), [['consumo-ordinario', 28.34], ['consumo-bajo-monto', 71.82]]);
  assert.ok(vigenteEn(c, '2026-11-14'));
  assert.ok(!vigenteEn(c, '2026-12-01'));
  assert.equal(certificacionDesdeFilas([]), null);
  assert.equal(leerPorcentajeTexto('18,89 %'), 18.89);
});

test('semáforo: verde por debajo, ámbar a menos de 3 puntos, rojo en el tope o encima', () => {
  assert.equal(semaforo(0.20, 0.2834), 'verde');
  assert.equal(semaforo(0.261, 0.2834), 'ambar');
  assert.equal(semaforo(0.2834, 0.2834), 'rojo');
  assert.equal(semaforo(0.35, 0.2834), 'rojo');
  assert.equal(semaforo(NaN, 0.2834), 'gris');
});

test('formato en español', () => {
  assert.equal(pesos(10_000_000), '$ ' + '10.000.000');
  assert.equal(pesos(380380.61), '$ 380.381');
  assert.equal(pesos(-1500), '−$ 1.500');
  assert.equal(pct(0.2834), '28,34 %');
  assert.equal(fechaLarga('2026-11-01'), '1 de noviembre de 2026');
});

test('leerNumero rechaza puntos sueltos y miles mal agrupados', () => {
  for (const malo of ['12..3', '1.23.4', '1.2345.678', '1,234.5', '1.,5', '1,.5', '.5.', '5.', '24,', '1.23,5'])
    assert.equal(leerNumero(malo), null, malo);
  assert.equal(leerNumero('1500.000', { montos: true }), null); // ¿miles o decimales? no se adivina
  assert.equal(leerNumero('1.500.000', { montos: true }), 1500000);
  assert.equal(leerNumero('1500,5', { montos: true }), 1500.5);
  assert.equal(leerNumero('1500.5', { montos: true }), 1500.5);
  assert.equal(leerNumero('-2,5'), -2.5);
  assert.equal(leerNumero('28,34 %'), 28.34);
});

test('TIR por encima del 1000 % mensual: el techo de búsqueda se amplía', () => {
  // recibe 5.000 (100.000 menos 95.000 de comisión) y paga 100.000 al mes siguiente: TIR = 1900 % mensual
  cerca(tir([5000, -100_000]), 19, 1e-9);
  assert.equal(tir([1, -1e12]), null); // más allá de TIR_MAXIMA no se inventa un valor
  assert.ok(TIR_MAXIMA >= 1e6);
});

test('comisión enorme en plazo corto: el semáforo no sale verde', () => {
  const r = analizarCredito({ monto: 100_000, plazo: 1, mv: 0, comisiones: 95_000 });
  cerca(r.costoSinSeguros.mensual, 19, 1e-9);
  assert.equal(semaforoCredito(0, r.costoSinSeguros.ea, 0.2834), 'rojo');
  // si aun así el costo no se puede calcular por exceso, es rojo; si no hay costo que comparar, gris (nunca verde)
  const extremo = analizarCredito({ monto: 1e12, plazo: 1, mv: 0, comisiones: 1e12 - 1 });
  assert.equal(extremo.costoSinSeguros, null);
  assert.equal(extremo.desborde.sinSeguros, true);
  assert.equal(semaforoCredito(0, NaN, 0.2834, { costoDesbordado: extremo.desborde.sinSeguros }), 'rojo');
  assert.equal(semaforoCredito(0, NaN, 0.2834), 'gris');
  assert.equal(semaforoCredito(0.20, 0.261, 0.2834), 'ambar');
  assert.equal(semaforoCredito(0.20, 0.21, 0.2834), 'verde');
  assert.equal(semaforoCredito(convertirTasa('EA', 0.2834).ea, 0.2834, 0.2834), 'rojo'); // tolerancia de redondeo
});

test('cuota francesa que colapsa por precisión: se rechaza en vez de cargar todo a la última cuota', () => {
  assert.throws(() => tablaAmortizacion({ monto: 10_000_000, plazo: 600, mv: 0.2 }), RangeError);
  assert.throws(() => tablaAmortizacion({ monto: 10_000_000, plazo: 600, mv: 0.06 }), RangeError);
  // los casos largos pero calculables siguen funcionando con la cuota fija
  for (const [plazo, mv] of [[600, 0.02], [600, 0.03], [120, 0.2], [360, 0.05]]) {
    const t = tablaAmortizacion({ monto: 10_000_000, plazo, mv });
    cerca(t.filas.at(-1).cuota, t.cuota, Math.max(1, t.cuota * 1e-4));
  }
});

test('pct no muestra «-0» y la fecha de hoy va en hora de Colombia', () => {
  assert.equal(pct(-4.82e-17, 3), '0,000 %');
  assert.equal(pct(-0), '0,00 %');
  assert.equal(pct(-0.0123), '-1,23 %');
  // 1 de diciembre a las 03:00 UTC sigue siendo 30 de noviembre en Bogotá (UTC−5)
  assert.equal(hoyBogota(new Date('2026-12-01T03:00:00Z')), '2026-11-30');
  assert.equal(hoyBogota(new Date('2026-12-01T06:00:00Z')), '2026-12-01');
});

test('certificación sin número de resolución: texto de respaldo, nunca «undefined»', () => {
  const c = certificacionDesdeFilas([{ vigencia_desde: '2026-11-01T00:00:00.000', interes_bancario_corriente: '18.89%', modalidad: 'CONSUMO Y ORDINARIO' }]);
  assert.ok(!/undefined|null/.test(c.resolucion), c.resolucion);
});
