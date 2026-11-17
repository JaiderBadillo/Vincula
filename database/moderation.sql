-- Moderación de vacantes y cuentas: estado de vacante inhabilitada, reportes de usuarios y registro de acciones.
-- Aditiva. ADD VALUE no puede ejecutarse dentro de una transacción que luego use el valor.
ALTER TYPE estado_vacante_enum ADD VALUE IF NOT EXISTS 'inhabilitada';

CREATE TABLE IF NOT EXISTS reportes_vacante (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_vacante UUID NOT NULL REFERENCES vacantes(id) ON DELETE CASCADE,
    id_reportante UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    motivo VARCHAR(30) NOT NULL,
    detalle TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'resuelto', 'descartado')),
    resolucion VARCHAR(30),
    nota_admin TEXT,
    resuelto_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    resuelto_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_vacante, id_reportante)  -- un usuario reporta una vacante una sola vez
);
CREATE INDEX IF NOT EXISTS ix_reportes_vacante_estado ON reportes_vacante (estado, creado_en DESC);
CREATE INDEX IF NOT EXISTS ix_reportes_vacante_reportante ON reportes_vacante (id_reportante, creado_en DESC);

-- La tabla auditorias_superadmin solo admite 'empresa' e 'institucion' (CHECK), por eso la moderación lleva la suya.
CREATE TABLE IF NOT EXISTS acciones_moderacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_entidad VARCHAR(20) NOT NULL CHECK (tipo_entidad IN ('vacante', 'usuario', 'empresa')),
    id_entidad UUID NOT NULL,
    accion VARCHAR(40) NOT NULL,
    motivo TEXT NOT NULL,
    id_admin UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_acciones_moderacion_entidad ON acciones_moderacion (tipo_entidad, id_entidad, creado_en DESC);
CREATE INDEX IF NOT EXISTS ix_acciones_moderacion_fecha ON acciones_moderacion (creado_en DESC);
