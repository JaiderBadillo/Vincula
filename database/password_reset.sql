-- Ejecutar una sola vez en la base PostgreSQL de Víncula antes de activar el flujo.
CREATE TABLE IF NOT EXISTS public.codigos_recuperacion (
    id_usuario uuid PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
    codigo_hash varchar(64) NOT NULL,
    expira_en timestamptz NOT NULL,
    solicitado_en timestamptz NOT NULL,
    intentos integer NOT NULL DEFAULT 0
);
-- Solo el backend mediante su conexión PostgreSQL puede consultar estos códigos.
ALTER TABLE public.codigos_recuperacion ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.codigos_recuperacion FROM anon, authenticated;
