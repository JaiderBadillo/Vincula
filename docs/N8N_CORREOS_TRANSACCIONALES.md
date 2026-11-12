# Correos transaccionales de Víncula con n8n

El backend prepara el HTML con la misma estructura visual que los correos
actuales (`email_service.py`: encabezado oscuro, verde institucional, tarjeta,
estado, datos y botón). Lo envía por HTTPS a
`{N8N_WEBHOOK_BASE_URL}/correo-transaccional`. n8n usa el nodo **Gmail API**,
no SMTP; el plan gratuito de Render bloquea los puertos SMTP.

Importar `docs/n8n_transactional_emails.json`, configurar la credencial
**Gmail OAuth2** en el nodo **Enviar con Gmail API**, configurar
`VINCULA_WEBHOOK_SECRET` en n8n y el mismo secreto como `N8N_WEBHOOK_SECRET`
en Render para `vincula-api`. `N8N_WEBHOOK_BASE_URL` debe terminar en
`/webhook`. Verificar la rama 401 sin autorización, probar una ejecución
con un destinatario de prueba y **publicar** el workflow antes de desplegar
el backend. No poner secretos ni credenciales dentro del JSON.

| Tipo (`body.tipo`) | Acción real | Destinatario |
| --- | --- | --- |
| `registro_egresado` | Se registra el egresado | Correo de registro |
| `registro_empresa` | Se radica una empresa | Correo de contacto |
| `registro_ies` | Se radica una IES | Correo institucional |
| `egresado_verificado` | Su IES aprueba el diploma | Correo personal del egresado |
| `empresa_aprobada` | Super Admin aprueba la empresa | Correo de contacto |
| `ies_aprobada` | Super Admin aprueba la IES | Correo institucional |
| `fase_postulacion` | Cambia una fase del ATS, incluida entrevista programada | Correo del egresado |

El payload trae `tipo`, `correo`, `asunto`, `texto` y `html`. El nodo de
respuesta devuelve 200 **después** de la aceptación de Gmail. El backend
registra una falla si n8n no responde correctamente. No activar otros flujos
que envíen el mismo correo desde los eventos antiguos (`registro-egresado`,
`registro-empresa`, `registro-institucion`, `empresa-aprobada`,
`institucion-aprobada`, `postulacion-cambio-fase`): esos eventos se conservan
para otras automatizaciones y podrían duplicar los mensajes.

La recuperación de contraseña conserva su flujo propio
`docs/n8n_password_reset.json`. Ese JSON todavía usa el nodo SMTP y requiere
reemplazarlo por Gmail API si n8n también está alojado en Render gratuito.
La entrega no está garantizada mientras n8n no tenga workflow publicado,
credencial OAuth válida y configuración de webhook. Para reintentos duraderos
ante caídas de n8n se requiere una cola de salida persistente; este cambio
registra el fallo sin bloquear el registro o la aprobación del usuario.
