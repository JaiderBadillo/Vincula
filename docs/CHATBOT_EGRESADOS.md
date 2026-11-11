# Asistente Víncula para egresados

El botón **Habla con Víncula** sustituye al acceso flotante a la guía en las rutas
`/dashboard` para el rol `egresado`. La guía sigue disponible en el menú de cuenta.
Los demás roles conservan su comportamiento anterior, incluso el superadministrador
cuando visita el portal del egresado. Los endpoints también exigen el rol `egresado`.

## Activación

En `backend/.env`, configura una clave válida de Google AI Studio y un modelo de
generación disponible para esa cuenta:

```dotenv
GEMINI_API_KEY=tu_clave_real
GEMINI_CHAT_MODEL=gemini-2.5-flash
```

Reinicia el backend. En producción configura estas variables en el servicio del
backend. La clave nunca debe ir en variables `VITE_*` ni en el código del frontend.
El frontend utiliza su `VITE_API_BASE_URL` habitual. Sin clave se responde HTTP 503
con un aviso de configuración pendiente, sin simular respuestas de IA.

Referencia del proveedor: https://ai.google.dev/api/generate-content

## Alcance y datos

- Conversación sobre empleabilidad, perfiles, cartas de presentación y entrevistas.
- Ayuda para navegar por Víncula, sin consultar vacantes ni postulaciones en vivo.
- Adjuntar PDF de hasta 5 MB y 15 páginas, con texto seleccionable; también se puede
  pegar texto en mensajes de hasta 4.000 caracteres.
- El PDF se procesa en el backend con `pypdf`. Se rechazan archivos inválidos,
  protegidos, sin texto y documentos cuyo texto exceda 24.000 caracteres.
- Al enviar se comparte con Gemini el mensaje, los últimos seis pares de conversación
  (hasta 24.000 caracteres) y el texto del PDF adjunto. La interfaz informa de ello.
- La revisión evalúa el contenido textual, no el diseño visual ni una puntuación ATS real.
- No se descarga automáticamente el CV del perfil: `CvManager` actualmente conserva
  metadatos y URL temporal local, no un archivo recuperable en el servidor.
- No se guardan mensajes ni CV en la base de datos o localStorage del chat. El estado
  permanece en memoria mientras se navega dentro del portal y se elimina al recargar,
  salir del portal o cerrar sesión. La retención del proveedor depende de sus condiciones.
- Cambiar o quitar el PDF inicia otra conversación para evitar mezclar documentos.
- No hay cambios de esquema ni dependencias adicionales. Aplican las cuotas de Gemini;
  antes de escalar conviene configurar límites por usuario en la infraestructura de API.

## Endpoints

- `POST /api/v1/ia/chat`: JSON con `message`, `history` (pares user/assistant) y `cv_text` opcional.
- `POST /api/v1/ia/chat/documento`: multipart con `file`; devuelve el texto extraído.

Ambos requieren JWT. No admiten un identificador de otro egresado ni roles de sistema
en el historial. El backend oculta los detalles internos de errores del proveedor.

## Verificación

```powershell
cd backend
python -m unittest discover -s tests -p test_graduate_chat.py
cd ../frontend
npm run build
```

Prueba manual: ingresar como egresado, abrir el botón, enviar preguntas, adjuntar PDF,
enviar la evaluación y una repregunta, minimizar, cambiar de sección, iniciar otra
conversación y cerrar sesión. Verificar ausencia del chat con los demás roles.
Las pruebas del proveedor usan respuestas simuladas y no consumen una API real.
