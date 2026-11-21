-- Historial inicial de notificaciones, construido SOLO con registros reales (postulaciones, títulos validados, aprobaciones),
-- con la fecha real de cada hecho. Una sola vez: no hace nada si la tabla ya tiene filas.
-- Quedan sin leer los hechos de los últimos 14 días; los más antiguos entran como leídos (se ven en "Ver todas").
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM notificaciones) THEN

    -- Egresados: título aprobado por su IES
    INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, enlace, leida_en, creada_en)
    SELECT e.id_usuario, 'titulo_aprobado', 'Tu título fue aprobado',
           i.nombre_oficial || ' validó tu diploma de ' || p.nombre || ' y emitió tu sello digital.',
           '/dashboard/verificacion',
           CASE WHEN a.fecha_verificacion > now() - interval '14 days' THEN NULL ELSE a.fecha_verificacion END,
           a.fecha_verificacion
    FROM academicos_egresado a
    JOIN egresados e ON e.id = a.id_egresado
    JOIN instituciones i ON i.id = a.id_institucion
    JOIN programas_academicos p ON p.id = a.id_programa
    WHERE a.estado_verificacion = 'aprobado' AND a.fecha_verificacion IS NOT NULL;

    -- Egresados: estado actual de cada postulación (con la fecha de su último movimiento)
    INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, enlace, leida_en, creada_en)
    SELECT e.id_usuario,
           CASE WHEN po.fase_actual::text = 'en_revision' THEN 'postulacion_enviada' ELSE 'fase_postulacion' END,
           CASE WHEN po.fase_actual::text = 'en_revision' THEN 'Postulación enviada' ELSE 'Actualización de tu postulación' END,
           CASE WHEN po.fase_actual::text = 'en_revision'
                THEN 'Te postulaste a «' || v.titulo || '» en ' || COALESCE(em.nombre_comercial, em.razon_social) || '.'
                ELSE v.titulo || ' · ' || COALESCE(em.nombre_comercial, em.razon_social) || ': ahora está en «' ||
                     CASE po.fase_actual::text
                          WHEN 'preseleccionados' THEN 'Preselección Curricular'
                          WHEN 'prueba_tecnica' THEN 'Evaluación / Prueba Técnica'
                          WHEN 'entrevista' THEN 'Entrevista de Selección'
                          WHEN 'oferta_finalistas' THEN 'Selección Final y Oferta'
                          WHEN 'contratado' THEN 'Contratación Confirmada'
                          WHEN 'descartados' THEN 'Proceso Finalizado'
                          ELSE 'En Revisión Inicial' END || '».' END,
           '/dashboard/postulaciones',
           CASE WHEN COALESCE(h.ultimo, po.postulado_en) > now() - interval '14 days' THEN NULL ELSE COALESCE(h.ultimo, po.postulado_en) END,
           COALESCE(h.ultimo, po.postulado_en)
    FROM postulaciones po
    JOIN egresados e ON e.id = po.id_egresado
    JOIN vacantes v ON v.id = po.id_vacante
    JOIN empresas em ON em.id = v.id_empresa
    LEFT JOIN LATERAL (SELECT max(registrado_en) AS ultimo FROM historial_fases_postulacion h WHERE h.id_postulacion = po.id) h ON true;

    -- Empresas: postulaciones que siguen en revisión inicial (pendientes de que alguien las mire)
    INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, enlace, leida_en, creada_en)
    SELECT r.id_usuario, 'nueva_postulacion', 'Nueva postulación',
           eg.nombre_completo || ' se postuló a «' || v.titulo || '».',
           '/empresa/reclutador/candidatos',
           CASE WHEN po.postulado_en > now() - interval '14 days' THEN NULL ELSE po.postulado_en END,
           po.postulado_en
    FROM postulaciones po
    JOIN vacantes v ON v.id = po.id_vacante
    JOIN egresados eg ON eg.id = po.id_egresado
    JOIN reclutadores_empresa r ON r.id_empresa = v.id_empresa
    JOIN usuarios u ON u.id = r.id_usuario
    WHERE po.fase_actual::text = 'en_revision' AND u.estado = 'activo'
      AND (u.rol = 'admin_empresa' OR r.id = v.id_reclutador_responsable);

    -- Empresas aprobadas
    INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, enlace, leida_en, creada_en)
    SELECT r.id_usuario, 'empresa_aprobada', 'Tu empresa fue aprobada',
           'Ya puedes publicar vacantes y recibir postulaciones.', '/empresa/admin/vacantes',
           CASE WHEN em.aprobado_en > now() - interval '14 days' THEN NULL ELSE em.aprobado_en END,
           em.aprobado_en
    FROM empresas em
    JOIN reclutadores_empresa r ON r.id_empresa = em.id
    JOIN usuarios u ON u.id = r.id_usuario
    WHERE em.estado::text = 'aprobado' AND em.aprobado_en IS NOT NULL AND u.estado = 'activo' AND u.rol = 'admin_empresa';

    -- Instituciones aprobadas
    INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, enlace, leida_en, creada_en)
    SELECT a.id_usuario, 'ies_aprobada', 'Tu institución fue aprobada',
           'Ya puedes validar egresados y gestionar convenios con empresas.', '/institucion/estudiantes/solicitudes',
           CASE WHEN i.aprobado_en > now() - interval '14 days' THEN NULL ELSE i.aprobado_en END,
           i.aprobado_en
    FROM instituciones i
    JOIN asesores_ies a ON a.id_institucion = i.id
    JOIN usuarios u ON u.id = a.id_usuario
    WHERE i.estado::text = 'aprobado' AND i.aprobado_en IS NOT NULL AND u.estado = 'activo';

  END IF;
END $$;
