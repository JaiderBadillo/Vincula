-- Fase "contratado" del embudo y vínculo del registro laboral con la postulación que lo originó.
-- Aditiva. ADD VALUE no puede ejecutarse dentro de una transacción que luego use el valor.
ALTER TYPE fase_postulacion_enum ADD VALUE IF NOT EXISTS 'contratado' BEFORE 'descartados';
ALTER TABLE registros_laborales_egresado
    ADD COLUMN IF NOT EXISTS id_postulacion UUID UNIQUE REFERENCES postulaciones(id) ON DELETE SET NULL;
