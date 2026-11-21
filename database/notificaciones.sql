-- Notificaciones dentro de la plataforma (campana de todos los roles). Aditiva: no toca tablas existentes.
CREATE TABLE IF NOT EXISTS notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(40) NOT NULL,
    titulo VARCHAR(160) NOT NULL,
    mensaje TEXT NOT NULL,
    enlace VARCHAR(255),              -- ruta del frontend a la que lleva el aviso
    leida_en TIMESTAMPTZ,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notificaciones_usuario_fecha ON notificaciones (id_usuario, creada_en DESC);
CREATE INDEX IF NOT EXISTS ix_notificaciones_no_leidas ON notificaciones (id_usuario) WHERE leida_en IS NULL;
