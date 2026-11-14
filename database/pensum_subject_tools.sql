-- Herramientas y competencias que la IES declara por asignatura (trazabilidad curricular).
-- Aditiva: no modifica ni borra datos existentes.
ALTER TABLE asignaturas_pensum
    ADD COLUMN IF NOT EXISTS herramientas TEXT[] NOT NULL DEFAULT '{}';
