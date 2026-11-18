-- Convenios IES <-> empresa: propuestas en ambas direcciones y vacantes exclusivas de un convenio.
-- Aditiva: solo columnas nuevas y opcionales, el codigo anterior sigue funcionando con ella aplicada.

-- Quien origino la propuesta. Hasta ahora solo existian solicitudes de la empresa hacia la IES.
ALTER TABLE solicitudes_convenio_ies
    ADD COLUMN IF NOT EXISTS iniciada_por VARCHAR(10) NOT NULL DEFAULT 'empresa',
    ADD COLUMN IF NOT EXISTS mensaje TEXT,
    ADD COLUMN IF NOT EXISTS id_convenio UUID REFERENCES convenios_interinstitucionales(id) ON DELETE SET NULL;

DO $$ BEGIN
    ALTER TABLE solicitudes_convenio_ies ADD CONSTRAINT ck_solicitud_iniciada_por CHECK (iniciada_por IN ('empresa', 'ies'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Una sola propuesta abierta por pareja empresa-IES: evita duplicados mientras alguien no responde.
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_convenio_abierta
    ON solicitudes_convenio_ies (id_empresa, id_institucion) WHERE estado IN ('pendiente', 'en_revision');
CREATE INDEX IF NOT EXISTS ix_solicitudes_convenio_institucion ON solicitudes_convenio_ies (id_institucion, estado);
CREATE INDEX IF NOT EXISTS ix_solicitudes_convenio_empresa ON solicitudes_convenio_ies (id_empresa, estado);

-- Vacante exclusiva: si tiene convenio, solo la ven y se postulan los egresados de la IES de ese convenio.
ALTER TABLE vacantes ADD COLUMN IF NOT EXISTS id_convenio UUID REFERENCES convenios_interinstitucionales(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_vacantes_convenio ON vacantes (id_convenio) WHERE id_convenio IS NOT NULL;
