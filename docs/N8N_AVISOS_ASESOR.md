# Avisos por correo del Asesor IES mediante n8n

El backend envía el evento `auth.asesor-notificacion` a
`{N8N_WEBHOOK_BASE_URL}/auth.asesor-notificacion` cuando el asesor activa
el aviso de accesos o cambios de cuenta. El payload contiene `correo`,
`asunto`, `mensaje` y `fecha`. El webhook solo confirma éxito después de que
el nodo Gmail acepte el mensaje.

## Activación

1. Importar `docs/n8n_advisor_notifications.json` en la instancia de n8n.
2. Conectar el nodo **Enviar con Gmail API** a una credencial Gmail OAuth2
   autorizada por el dueño del correo remitente. La instancia gratuita de
   Render no puede usar los puertos SMTP 25, 465 ni 587, por lo que este flujo
   debe usar la API de Gmail y no el nodo SMTP.
3. Configurar en n8n `VINCULA_WEBHOOK_SECRET` y en Render `vincula-api` el
   mismo valor en `N8N_WEBHOOK_SECRET`. Configurar también
   `N8N_WEBHOOK_BASE_URL` con la URL pública terminada en `/webhook`.
   Guardar el secreto en variables protegidas, nunca en el JSON o en Git.
4. Verificar que el nodo **Validar origen** rechace una solicitud sin el
   encabezado `Authorization: Bearer <secreto>`; publicar el workflow.
5. Activar **Nuevos accesos** en Configuración del Asesor, cerrar sesión y
   volver a entrar. Revisar la ejecución en n8n y el mensaje en la bandeja
   del correo de acceso. El aviso de cambio de correo se envía al correo
   anterior.

El backend registra un error si falta la configuración o n8n no confirma el
evento. Hasta que el workflow esté publicado y la credencial OAuth funcione,
los avisos del Asesor IES no pueden considerarse entregados.
