# Auditoría de procedencia de datos por rol

Revisión estática del repositorio al 13 de noviembre de 2026. Pasar compilación y pruebas locales no demuestra que los datos de producción estén completos. Los listados marcados «pendiente» no deben presentarse como registros oficiales hasta conectar la API y confirmar el guardado.

| Rol y pantalla | Estado de procedencia | Hallazgo / siguiente corrección |
| --- | --- | --- |
| Administrador empresa: perfil | API de empresa | El perfil se obtiene por sesión; verificar visualmente con una empresa nueva y con otra antigua. |
| Empresa: reclutadores | API de empresa | Alta y lista persistentes en backend; no usar el representante legal como reclutador automático. |
| Empresa: sedes | API de empresa | Las sedes y sus cambios se consultan y guardan mediante API; la pantalla distingue carga, error y vacío. Se retiró el borrado no persistente. Verificar el flujo en una sesión real. |
| Empresa: vacantes | API de empresa | Se eliminó el catálogo inicial y el guardado local que fingía publicar. Una lista vacía se respeta y las escrituras esperan respuesta del servidor. Revisar pantallas de administración en sesión real. |
| Empresa: convenios, actividad, bolsa de talento | **Pendiente** | Los hooks funcionan con datos locales de ejemplo o memoria del navegador; no existe confirmación de registro oficial. |
| Reclutador: inicio, vacantes y candidatos | API de empresa y ATS | El inicio, los contadores y el embudo usan la cuenta del reclutador y sus vacantes asignadas; sin vacantes muestran vacío. Las fases y notas se actualizan después de la confirmación ATS. Probar con dos reclutadores de la misma empresa. |
| Reclutador: banco de talento | Sin catálogo verificado | Se retiraron perfiles de demostración; se informa que no existe aún una búsqueda real. |
| IES administrador: perfil | API por institución | GET/PUT de la institución de la sesión; no se simula la IES UTS. Identidad legal aprobada bloqueada para edición. |
| IES administrador: facultades, programas y sedes | **Pendiente** | Hooks con muestras locales, respuesta vacía ignorada y edición local que oculta fallos del backend. Sedes no consulta el endpoint que ya existe. |
| IES administrador: pensum | **Pendiente** | Tiene cambios de trazabilidad paralelos sin finalizar; verificar origen del archivo por programa antes de publicar. |
| Asesor IES: validación de egresados | API IES | Cola de solicitudes y diplomas consultan backend; comprobar que el archivo corresponda a carga real del egresado. |
| Asesor IES: estadísticas, mercado, seguimiento, empresas | **Pendiente** | Varias pantallas importan métricas y registros de archivos `institution*Data.js` y `institutionTraceability.js`. |
| Egresado: perfil básico y CV | API del egresado | Datos básicos por usuario; CV PDF en bucket privado con URL firmada. Los otros apartados del perfil están identificados como borradores locales por cuenta. |
| Egresado: postulaciones | API ATS | Eliminado CV inventado, porcentaje de afinidad por defecto, fecha inventada y etiqueta de convenio verificado sin evidencia. Revisar el resto del DTO antes de certificar todas las métricas. |
| Egresado: vacantes | API pública/afinidad | Se retiraron las ofertas locales y las afirmaciones ficticias de afinidad, ubicación, beneficios y fechas; una postulación fallida ya no aparece como enviada. Verificar el catálogo y una postulación reales en producción. |
| Superadministración: aprobación de empresa/IES | API de auditoría | Campos inexistentes ya no se rellenan con NIT, ubicación, rector o sector ficticios. Las listas reales deben revisarse en el navegador. |

## Regla para nuevas pantallas

Una vista autenticada debe usar datos ligados al sujeto del token, presentar explícitamente los estados de carga/error/vacío y confirmar escritura antes de anunciar éxito. No mezclar ejemplos con respuestas vacías ni dejar datos de una cuenta en claves de navegador compartidas. Los módulos sin API deben anunciar claramente que son borradores de este dispositivo y nunca mostrar el estado «verificado», «cargado» o «aprobado» por inferencia. Añadir una prueba de cuenta A/cuenta B y otra de respuesta vacía/error para cada nuevo módulo.

## Riesgos actuales

Los buckets `vincula-documentos-auditoria` y `vincula-diplomas-validados` están configurados públicos en el proyecto actual; revisar qué documentos existentes requieren migración a almacenamiento privado y enlaces firmados. El nuevo bucket `vincula-hojas-de-vida` es privado y limita PDFs a 5 MB.
