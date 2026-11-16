import assert from 'node:assert/strict';
import test from 'node:test';
import { suggestTechnicalSkills } from '../src/utils/vacancySkillSuggestions.js';

test('el cargo define sugerencias específicas aunque el área sea general', () => {
  const nurse = suggestTechnicalSkills('Enfermera jefe', 'Tecnología y datos');
  assert.equal(nurse.source, 'cargo');
  assert.ok(nurse.suggestions.includes('Seguridad del paciente'));
  assert.ok(!nurse.suggestions.includes('React'));
  assert.ok(suggestTechnicalSkills('Contador público').suggestions.includes('Normas NIIF'));
  assert.ok(suggestTechnicalSkills('Desarrollador web').suggestions.includes('APIs REST'));
});

test('el área orienta si el cargo no tiene especialidad y no se inventan requisitos sin contexto', () => {
  assert.ok(suggestTechnicalSkills('Analista', 'Logística y transporte').suggestions.includes('Control de inventarios'));
  assert.ok(suggestTechnicalSkills('Gestor', 'Calidad y mejora continua').suggestions.includes('Auditorías internas'));
  assert.deepEqual(suggestTechnicalSkills('Cargo por definir', ''), { suggestions: [], source: null });
});
