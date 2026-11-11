ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS google_sub varchar(255);
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_google_sub ON public.usuarios (google_sub) WHERE google_sub IS NOT NULL;
