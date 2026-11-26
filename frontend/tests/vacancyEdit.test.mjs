import assert from 'node:assert/strict';
import { changedFields, formatSalary } from '../src/data/companyVacanciesData.js';

assert.equal(formatSalary(2000000, 3000000), '$2.000.000 - $3.000.000');
assert.equal(formatSalary(2000000, null), 'Desde $2.000.000');
assert.equal(formatSalary(null, null), '');
assert.equal(formatSalary(2000000, 3000000, true), 'Confidencial');

const base = { title: 'Analista', modality: 'Híbrido', salaryMin: 2000000, skills: ['SQL', 'Liderazgo'], skillsTech: ['SQL'], skillsSoft: ['Liderazgo'], customCategory: '', status: 'open' };

// Sin tocar nada no se envía nada.
assert.deepEqual(changedFields(base, { ...base, skills: [...base.skills] }), {});
// Un campo que solo existe en el formulario no cuenta como cambio.
assert.deepEqual(changedFields(base, { ...base, customCategory: 'x' }), {});
// Borrar el salario se envía como null.
assert.deepEqual(changedFields(base, { ...base, salaryMin: null }), { salaryMin: null });
// Las habilidades viajan con la lista de blandas para no perder la categoría.
const after = { ...base, skills: ['SQL', 'Python', 'Liderazgo'], skillsTech: ['SQL', 'Python'] };
assert.deepEqual(changedFields(base, after), { skills: after.skills, skillsSoft: ['Liderazgo'] });

console.log('vacancyEdit: ok');
