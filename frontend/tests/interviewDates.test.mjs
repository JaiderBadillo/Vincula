// Ejecutar: node --test tests/interviewDates.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { isPastInterview } from '../src/utils/formatters.js';

test('la entrevista es pasada desde el día siguiente, no el mismo día', () => {
  assert.equal(isPastInterview('2026-11-17', '2026-11-25'), true);
  assert.equal(isPastInterview('2026-11-25', '2026-11-25'), false);
  assert.equal(isPastInterview('2026-12-01', '2026-11-25'), false);
  assert.equal(isPastInterview(undefined, '2026-11-25'), false);
});
