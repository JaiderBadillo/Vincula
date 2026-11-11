ALTER TABLE public.asesores_ies
  ADD COLUMN IF NOT EXISTS avisar_accesos_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avisar_cambios_email boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.accesos_asesor_ies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  fecha timestamptz NOT NULL DEFAULT now(),
  metodo varchar(20) NOT NULL CHECK (metodo IN ('contraseña', 'google')),
  navegador varchar(120) NOT NULL,
  direccion_ip varchar(45)
);
CREATE INDEX IF NOT EXISTS ix_accesos_asesor_usuario_fecha
  ON public.accesos_asesor_ies (id_usuario, fecha DESC);
ALTER TABLE public.accesos_asesor_ies ENABLE ROW LEVEL SECURITY;
