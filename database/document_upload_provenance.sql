-- Solo los flujos de registro/subsanación y carga autenticada marcan un soporte
-- como recibido del usuario. Los archivos antiguos sin origen comprobado
-- quedan pendientes de una nueva carga por su titular.
ALTER TABLE public.academicos_egresado
    ADD COLUMN IF NOT EXISTS diploma_cargado_por_egresado boolean NOT NULL DEFAULT false;
ALTER TABLE public.documentos_empresa
    ADD COLUMN IF NOT EXISTS archivo_cargado_por_usuario boolean NOT NULL DEFAULT false;
ALTER TABLE public.documentos_institucion
    ADD COLUMN IF NOT EXISTS archivo_cargado_por_usuario boolean NOT NULL DEFAULT false;
