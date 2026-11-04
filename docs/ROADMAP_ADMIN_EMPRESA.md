# Ruta pactada: Portal «Administrador de Empresa»

Objetivo: que el administrador de una empresa gestione desde un solo lugar su perfil corporativo,
sus reclutadores, sedes/áreas, vacantes, convenios con IES y la actividad de contratación.

> **Cómo retomar:** abre este archivo, busca el primer bloque con estado `⬜ Pendiente` o `🟡 En curso`
> y continúa desde ahí. Al terminar cada bloque, marca sus casillas y cambia el estado.
> Al final de cada bloque debe pasar `cd frontend && npm run build` (código 0).

## Convenciones (obligatorias en todos los bloques)

| Tema | Regla |
|---|---|
| Rutas | Prefijo `/empresa/admin/*`. `/empresa` redirige a `/empresa/admin/perfil`. |
| Archivos | Páginas `frontend/src/pages/CompanyAdmin<Nombre>Page.jsx`; componentes en `frontend/src/components/company/`; datos `frontend/src/data/company<Nombre>Data.js`; hooks `frontend/src/hooks/useCompany<Nombre>.js`. |
| Persistencia (por ahora) | `localStorage`, clave `vincula.company.<recurso>.v1`, hook con evento de sincronía `vincula:company-<recurso>-updated` (mismo patrón que `useInstitutionCampuses.js`). |
| Estilo | Solo modo claro con **paleta cálida**: fondo `bg-cream`, superficies `bg-white` + `border-sand-line`, acento `terracotta` (`-dark` en hover), `ochre`, `cocoa` para botones oscuros y textos sobre foto, `sand` para activos/hover. **Prohibido** usar azul y morado (nada de `blue-*`, `purple-*`, `indigo-*`, `violet-*`). Tokens definidos en `frontend/src/index.css`. |
| Fotografía | Cada página abre con `CompanyPageHero` (banner con foto + degradado cálido `company-shade--*`, métricas en cristal y acciones). Las fotos se centralizan en `data/companyImages.js`. Las tarjetas laterales/vacíos también pueden llevar foto. Evitar páginas solo de cajas claras. |
| UI (preferencias del usuario) | Listas rectangulares hacia abajo, **no** cuadrículas de tarjetas. **Sin** píldoras/badges de color sobre los títulos. Ciudad/ubicación como texto con separador `•`, no como caja redondeada. Estado como punto de color + texto, no como píldora. Filtros como desplegables. Botones de acción a la derecha. |
| Git | **No** hacer `git commit` ni `git push` salvo petición explícita del usuario. |
| Idioma | Interfaz y comentarios en español. |

## Modelo de datos (borrador compartido)

```
companyProfile  { id, name, commercialName, legalName, nit, sector, size, website, logo, coverImage,
                  description, contactEmail, phone, city, address,
                  legalRepresentative { name, role, documentId } }
companySite     { id, name, city, address, phone, isMain, status }
recruiter       { id, fullName, email, phone, siteIds[],
                  status: 'active'|'invited'|'suspended', lastAccess }
companyVacancy  { id, title, siteId, ownerRecruiterId, status: 'draft'|'open'|'paused'|'closed',
                  applicantsCount, publishedAt }   // reutiliza el esquema de data/jobs.js
agreement       { institutionId, status: 'vigente'|'por_renovar'|'en_revision', signedAt, expiresAt }
```

## Bloques

### Bloque 1 — Fundación y perfil corporativo · ✅ Completado
- [x] `components/company/CompanyPortalLayout.jsx`, `CompanySidebar.jsx`, `CompanyTopbar.jsx`
- [x] `data/companyAdminData.js` (perfil inicial) + `hooks/useCompanyProfile.js`
- [x] `pages/CompanyAdminProfilePage.jsx` (logo, razón social, NIT, sector, tamaño, contacto, representante legal; guardar/descartar con detección de cambios)
- [x] Rutas en `App.jsx` y enlace de cambio de portal en los sidebars existentes
- Entrega: el admin entra a `/empresa/admin/perfil`, edita y guarda su empresa.

### Bloque 2 — Equipo de reclutadores · ✅ Completado
- [x] `data/companyRecruitersData.js` + `hooks/useCompanyRecruiters.js` (sin subroles: todos son reclutadores con acceso a sedes y vacantes)
- [x] `pages/CompanyAdminRecruitersPage.jsx`: lista rectangular, búsqueda, filtro por estado, métricas en el banner
- [x] `components/company/RecruiterModal.jsx`: crear/editar/invitar (nombre, correo, teléfono y sedes; sin cargos ni subroles)
- [x] Suspender/reactivar/reenviar invitación; eliminar con confirmación y aviso si tiene vacantes asignadas
- Entrega: CRUD completo del equipo de reclutadores de la empresa.
- **Pendiente para el Bloque 3:** `RecruiterModal`, `VacancyModal` y sus páginas leen `initialCompanySites` de `companyRecruitersData.js` (provisional). Al crear `useCompanySites`, reemplazar esas lecturas por el hook y borrar `initialCompanySites`.

### Bloque 3 — Sedes y áreas de la empresa · ✅ Completado
- [x] `data/companySitesData.js` + `hooks/useCompanySites.js`: catálogo maestro con persistencia en `localStorage` (`vincula.company.sites.v1`), eventos cruzados `vincula:company-sites-updated`, soporte de sede principal (`isMain`), estado (activa/inactiva), colaboradores y áreas operativas.
- [x] `pages/CompanyAdminSitesPage.jsx` (`/empresa/admin/sedes`): vista rectangular Sonnet cálida con banner hero, métricas en vivo, búsqueda por nombre/dirección/área/responsable, filtros por ciudad y estado.
- [x] `components/company/SiteModal.jsx`: creación y edición de sedes con gestión de áreas/departamentos funcionales (chips y sugerencias rápidas) y asignación directa de reclutadores responsables.
- [x] Sincronización bidireccional de reclutadores y sedes: cada reclutador puede asociarse a múltiples sedes tanto desde la edición de la sede como desde el modal de reclutador (`RecruiterModal.jsx`).
- [x] Conexión dinámica con vacantes: conteo real de vacantes activas por sede y protección contra eliminación accidental si hay vacantes abiertas o si es la sede principal.
- Entrega: gestión integral de sedes, infraestructura física y vinculación operativa del equipo de selección.

### Bloque 4 — Vacantes de la empresa (vista del administrador) · ✅ Completado
- [x] `data/companyVacanciesData.js` + `hooks/useCompanyVacancies.js` (con `countActiveVacancies` y `unassignOwner` conectados a Reclutadores)
- [x] `pages/CompanyAdminVacanciesPage.jsx`: lista rectangular cálida, búsqueda, filtros desplegables (Estado, Sede, Reclutador responsable)
- [x] `components/company/VacancyModal.jsx`: crear y editar vacantes
- [x] Reasignar reclutador responsable en línea o desde el modal; pausar, publicar, reanudar, cerrar, reabrir y eliminar vacantes
- [x] Contadores de postulantes por vacante y conexión real con el conteo de vacantes activas por reclutador en `CompanyAdminRecruitersPage.jsx`
- Entrega: control central de vacantes y su responsable.

### Bloque 5 — Convenios con instituciones (IES) · ✅ Completado
- [x] `pages/CompanyAdminAgreementsPage.jsx`: convenios vigentes / por renovar, vencimientos, pestañas por estado, búsqueda y filtros por institución
- [x] `components/company/AgreementDetailDrawer.jsx`: panel lateral con expediente, programas vinculados, coordinador IES, impacto/métricas y anexos legales
- [x] `components/company/AgreementRequestModal.jsx`: radicación de nuevo convenio o solicitud de prórroga formal con checklist documental (Cámara de Comercio, RUT, minuta)
- [x] `data/companyAgreementsData.js` + `hooks/useCompanyAgreements.js`: persistencia en `localStorage`, subida de anexos, cancelación de solicitudes y sincronización entre pestañas
- Entrega: ciclo de convenios con IES (UTS, UIS y aliadas) gestionable directamente desde el portal de la empresa.

### Bloque 6 — Actividad, métricas y desempeño de reclutadores · ✅ Completado
- [x] `pages/CompanyAdminActivityPage.jsx`: vacantes activas, total de postulantes, contrataciones del mes, tiempo promedio de cobertura
- [x] Desempeño por reclutador en tabla rectangular (vacantes gestionadas, postulantes evaluados, contrataciones, tiempo medio y tasa de efectividad)
- [x] Gráficos interactivos SVG cálidos: evolución mensual de postulantes vs contratados, embudo de conversión y origen de talento (Convenios IES vs Mercado)
- [x] Bitácora de actividad con filtros por categoría (vacantes, convenios, contrataciones, postulaciones, seguridad) y búsqueda en tiempo real
- [x] Exportación de reporte de actividad en formato CSV
- Entrega: panel ejecutivo de métricas y trazabilidad de acciones corporativas.

### Bloque 7 — Seguridad y configuración · ✅ Resuelto en Menú Global
- Se resuelve y centraliza en el modal global `AccountSettingsModal.jsx` accesible desde la esquina superior derecha en todos los portales.
- Permite cambio de correo electrónico de acceso y cambio de contraseña con validación en tiempo real.
- Se retira del menú lateral de la empresa para un diseño 100% operativo y limpio.

### Bloque 8 — Backend y autenticación reales · ⬜ Pendiente
- [ ] Modelos/esquemas/repositorios FastAPI para empresa, reclutadores, sedes y vacantes (`backend/app/...`)
- [ ] Login por rol (egresado / asesor IES / admin IES / admin empresa / reclutador) y guardas de ruta
- [ ] Sustituir `localStorage` por la API manteniendo la misma interfaz de los hooks
- Entrega: persistencia real y acceso por rol.

## Registro de avance

| Fecha | Bloque | Nota |
|---|---|---|
| 2026-10-31 | 3 | Sedes y Áreas de la empresa (`/empresa/admin/sedes`): CRUD completo de sedes físicas con áreas funcionales, asociación bidireccional con el equipo de reclutadores, integración dinámica con vacantes y protección de sede principal. Build OK. |
| 2026-10-30 | 5 | Convenios con IES (`/empresa/admin/convenios`): banner hero con métricas, lista rectangular cálida, pestañas por estado, panel lateral de detalle del convenio (`AgreementDetailDrawer`), modal para radicar nuevo convenio o renovación formal (`AgreementRequestModal`), expediente con descarga y subida de anexos. Build OK. |
| 2026-10-30 | 4 | Rediseño de Vacantes: pestañas por estado con lista compacta y panel lateral de detalle (`VacancyDetailDrawer`); creación/edición en página completa por pasos con vista previa para egresados (`CompanyAdminVacancyEditorPage`, rutas `/vacantes/nueva` y `/vacantes/:id/editar`). Nuevos campos: descripción, habilidades, beneficios, fecha de cierre y nivel de experiencia. Se retira `VacancyModal`. Build OK. |
| 2026-10-30 | 1 | Layout/sidebar/topbar de empresa, hook de perfil, página de datos y rutas `/empresa/admin/*` (secciones futuras con página placeholder). Build OK. |
| 2026-10-30 | 4 | Vacantes de la empresa (`/empresa/admin/vacantes`): lista rectangular cálida, filtros desplegables (estado, sede, responsable), reasignación en línea, modal crear/editar y conteo real conectado con Reclutadores. Build OK. |
| 2026-10-30 | 1+2 | Rediseño cálido (arena/terracota/ocre/cacao, sin azul ni morado) con banners de foto (`CompanyPageHero`), vista previa pública en el perfil y tarjeta de foto en el sidebar. Bloque 2 completo. Build OK. |
| 2026-10-30 | — | Ruta creada. Sin código de empresa previo (solo vistas de empresas desde el portal IES). |

