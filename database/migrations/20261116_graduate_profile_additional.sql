-- Datos editables del perfil del egresado, separados de documentos y campos principales.
ALTER TABLE public.egresados
ADD COLUMN IF NOT EXISTS perfil_adicional jsonb NOT NULL DEFAULT '{}'::jsonb;
