-- Ciclos propedéuticos: programa que debe haberse cursado antes (p. ej. Tecnología -> Ingeniería).
-- Aditiva y opcional. Se limita a dos niveles desde la aplicación.
ALTER TABLE programas_academicos
    ADD COLUMN IF NOT EXISTS id_programa_previo UUID REFERENCES programas_academicos(id) ON DELETE SET NULL;
