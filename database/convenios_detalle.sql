-- Convenios: condiciones adicionales de la propuesta (modalidad, remuneración, compromisos y responsable).
-- Aditiva: columnas nuevas y opcionales; el código anterior sigue funcionando con ella aplicada.
ALTER TABLE solicitudes_convenio_ies
    ADD COLUMN IF NOT EXISTS modalidad_trabajo VARCHAR(20),
    ADD COLUMN IF NOT EXISTS remuneracion VARCHAR(30),
    ADD COLUMN IF NOT EXISTS compromisos TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS responsable_nombre VARCHAR(150),
    ADD COLUMN IF NOT EXISTS responsable_contacto VARCHAR(200);

-- Búsqueda de contrapartes por ciudad, sector y programa
CREATE INDEX IF NOT EXISTS ix_empresas_estado_ciudad ON empresas (estado, ciudad);
CREATE INDEX IF NOT EXISTS ix_instituciones_estado_ciudad ON instituciones (estado, ciudad);
