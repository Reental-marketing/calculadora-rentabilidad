import { test } from 'node:test';
import assert from 'node:assert/strict';
import calc from '../calc.js';

test('caso de referencia: 10.000 € al 16,25 %', () => {
  assert.equal(calc.calculate(10000, 16.25, 1).toFixed(2), '11625.00');
  assert.equal(calc.calculate(10000, 16.25, 3).toFixed(2), '15710.10');
  assert.equal(calc.calculate(10000, 16.25, 5).toFixed(2), '21230.72');
  assert.equal(calc.calculate(10000, 16.25, 10).toFixed(2), '45074.36');
});

test('año 0 devuelve la inversión inicial', () => {
  assert.equal(calc.calculate(5000, 16.25, 0), 5000);
});

test('rentabilidad 0 mantiene el capital', () => {
  assert.equal(calc.calculate(10000, 0, 10), 10000);
});

test('isValidRate acepta 0..100 y rechaza el resto', () => {
  assert.equal(calc.isValidRate(0), true);
  assert.equal(calc.isValidRate(16.25), true);
  assert.equal(calc.isValidRate(100), true);
  assert.equal(calc.isValidRate(-1), false);
  assert.equal(calc.isValidRate(101), false);
  assert.equal(calc.isValidRate(NaN), false);
  assert.equal(calc.isValidRate(Infinity), false);
  assert.equal(calc.isValidRate('16.25'), false);
  assert.equal(calc.isValidRate(null), false);
});

test('mergeRates aplica válidos y descarta inválidos', () => {
  const merged = calc.mergeRates({ reental: 18, rentaFija: -5, oro: NaN, extra: 50 });
  assert.equal(merged.reental, 18);
  assert.equal(merged.rentaFija, 3);       // inválido → default
  assert.equal(merged.oro, 7);             // inválido → default
  assert.equal(merged.rentaVariable, 7.5); // ausente → default
  assert.equal(merged.indexado, 10);       // ausente → default
  assert.equal('extra' in merged, false);  // claves desconocidas ignoradas
});

test('mergeRates con null o no-objeto devuelve defaults', () => {
  assert.deepEqual(calc.mergeRates(null), calc.DEFAULT_RATES);
  assert.deepEqual(calc.mergeRates('x'), calc.DEFAULT_RATES);
});

test('parseCsvRates: CSV simple con cabecera', () => {
  const parsed = calc.parseCsvRates('activo,porcentaje\nreental,16.25\nrentaFija,3');
  assert.equal(parsed.reental, 16.25);
  assert.equal(parsed.rentaFija, 3);
  assert.equal(Number.isNaN(parsed.activo), true); // la cabecera produce NaN y mergeRates la descarta
});

test('parseCsvRates: decimales españoles entrecomillados y CRLF', () => {
  const parsed = calc.parseCsvRates('reental,"16,25"\r\noro,7\r\n');
  assert.equal(parsed.reental, 16.25);
  assert.equal(parsed.oro, 7);
});

test('parseCsvRates: líneas vacías o malformadas se ignoran', () => {
  const parsed = calc.parseCsvRates('\n,\nreental,16.25\nsolounacolumna\n');
  assert.deepEqual(Object.keys(parsed), ['reental']);
});
