// Ejercicios resueltos de los talleres y parciales de Matemáticas Financieras (2024).
// Cada prueba: dato de la fuente → resultado esperado. Donde la respuesta de clase estaba mal,
// la prueba usa el valor corregido y lo documenta (ver /proceso/, fe de erratas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nominalAEfectiva, efectivaAPeriodica, valorPresente, vpAnualidad } from '../js/tasas.js';
import { tir, cuotaFrancesa } from '../js/credito.js';

const cerca = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b} (tol ${tol})`);

test('Tasas, ej. 5: 18 % compuesto por días rinde más que 18,02 % efectivo', () => {
  const diaria = nominalAEfectiva(0.18, 365);
  cerca(diaria, 0.197164, 1e-6);
  assert.ok(diaria > 0.1802);
});

test('Tasas, ej. 27: la tasa efectiva más baja para el comprador es 21,4 % nominal semestral', () => {
  const op = { a: nominalAEfectiva(0.206, 12), b: nominalAEfectiva(0.21, 4), c: nominalAEfectiva(0.214, 2), d: nominalAEfectiva(0.205, 365) };
  cerca(op.a, 0.226607, 1e-6); cerca(op.b, 0.227124, 1e-6); cerca(op.c, 0.225449, 1e-6); cerca(op.d, 0.227454, 1e-6);
  const mejor = Object.entries(op).sort((x, y) => x[1] - y[1])[0][0];
  assert.equal(mejor, 'c');
});

test('Compuesto, ej. 22: dos abonos iguales a 2 y 3 meses sobre US$600 al 16 % mensual = US$310,09', () => {
  const i = 0.16 / 12;
  const X = 600 / valorPresente([{ t: 2, valor: 1 }, { t: 3, valor: 1 }], i);
  cerca(X, 310.09, 0.005); // la respuesta de clase acierta, aunque su procedimiento no (ver erratas)
});

test('Compuesto, ej. 24: un capital se duplica en 4 años al 17,35758 % anual compuesto por semanas', () => {
  cerca(52 * (Math.pow(2, 1 / 208) - 1), 0.1735758, 1e-7);
});

test('Compuesto, ej. 38: tres pagos bimestrales de 35.000 al 13,8 % → préstamo de 100.348,96', () => {
  cerca(vpAnualidad(35000, 0.138 / 6, 3), 100348.96, 0.01);
});

test('Compuesto, ej. 36: interés global de 1,15 % mensual a 8 meses es en realidad 23,98 % nominal mensual', () => {
  // 8 cuotas iguales de (1 + 0,0115·8)/8 por cada peso prestado; la tasa real sale de la TIR.
  const R = (1 + 0.0115 * 8) / 8;
  const r = tir([1, ...Array(8).fill(-R)]);
  cerca(r, 0.0199833, 1e-6);
  cerca(12 * r, 0.2398, 1e-4); // la respuesta de clase multiplicó 1,15 % × 8 = 9,2 %
});

test('Anualidades, ej. 35: pagaré de 1.950.000 pesos a 13 meses al 12 % efectivo → crédito de 1.724.706,05 pesos', () => {
  cerca(1_950_000 / Math.pow(1.12, 13 / 12), 1_724_706.05, 0.01);
});

test('Anualidades, ej. 31: precio de la motoconformadora al 15,8 % efectivo = 1.326.045,71 pesos', () => {
  const i = efectivaAPeriodica(0.158, 12);
  cerca(190_000 + valorPresente([{ t: 3, valor: 350_000 }, { t: 7, valor: 870_000 }], i), 1_326_045.71, 0.01);
});

test('Anualidades, ej. 30 y 32: reestructurar en 8 cuotas da $153.689,53 y no ahorra nada en valor', () => {
  const i = efectivaAPeriodica(0.158, 12);
  // deuda a valor del mes 3; 8 pagos mensuales con el primero en el mes 3 (anualidad anticipada)
  const deuda3 = 350_000 + 870_000 / Math.pow(1 + i, 4);
  const R = cuotaFrancesa(deuda3, i, 8) / (1 + i);
  cerca(R, 153_689.53, 0.01);
  // equivalencia: a la misma tasa, los dos planes valen lo mismo hoy
  const vpViejo = valorPresente([{ t: 3, valor: 350_000 }, { t: 7, valor: 870_000 }], i);
  const vpNuevo = valorPresente(Array.from({ length: 8 }, (_, k) => ({ t: 3 + k, valor: R })), i);
  cerca(vpViejo, vpNuevo, 1e-6);
});

test('Parcial 1, ej. 4: cuatro pagos bimestrales de 25.000 al 10 % → $95.968,28 (no $104.063)', () => {
  const C = vpAnualidad(25000, 0.10 / 6, 4);
  cerca(C, 95968.28, 0.01);
  assert.ok(C < 100000, 'un préstamo no puede valer más que la suma de sus pagos con interés positivo');
});

test('Parcial 2, ej. 4: cinco pagos bimestrales de 40.000 al 12 % → $188.538,38', () => {
  cerca(vpAnualidad(40000, 0.12 / 6, 5), 188538.38, 0.01);
});

test('Parciales, ej. 3: triplicar un capital en 5 y 6 años con capitalización semanal', () => {
  cerca(52 * (Math.pow(3, 1 / 260) - 1), 0.2201873, 1e-7); // 22,02 % anual (0,4234 % semanal)
  cerca(52 * (Math.pow(3, 1 / 312) - 1), 0.1834248, 1e-7); // 18,34 % anual (0,3527 % semanal)
});

test('Interés simple, ej. 11: $14.250 al 7,3 % durante 135 días acumulan $14.634,75', () => {
  cerca(14250 * (1 + 0.073 * 135 / 365), 14634.75, 0.005);
});
