import assert from 'node:assert/strict';
import { departmentForCity } from '../src/data/profile.js';
import { AVAILABLE_CITIES } from '../src/data/companySitesData.js';

assert.equal(departmentForCity('Medellín'), 'Antioquia');
assert.equal(departmentForCity('Cúcuta'), 'Norte de Santander');
assert.equal(departmentForCity('Bogotá D.C.'), 'Bogotá D.C.');
assert.equal(departmentForCity('Ciudad inventada'), null);
// Todas las ciudades de la lista de sedes tienen departamento.
for (const city of AVAILABLE_CITIES) assert.ok(departmentForCity(city), city);
// Y las de la sede universitaria.
for (const city of ['Bucaramanga', 'Barrancabermeja', 'Piedecuesta', 'Floridablanca', 'Girón', 'Vélez', 'San Gil', 'Socorro', 'Málaga']) {
  assert.equal(departmentForCity(city), 'Santander', city);
}

console.log('departmentForCity: ok');
