# BACKUP Y CONTEXTO MAESTRO DEL PROYECTO VINCULA
> **Fecha de corte y generación:** Noviembre de 2026  
> **Propósito:** Documento de transferencia de contexto completo (*Handoff Prompt / Project Memory*) para que cualquier modelo de Inteligencia Artificial pueda comprender el 100% de la arquitectura, decisiones de diseño, restricciones críticas y estado del proyecto sin pérdida de contexto.

---

## 1. Visión General del Proyecto
**VINCULA** es un ecosistema web integral de empleabilidad, intermediación laboral y vinculación formativa para Colombia (especialmente Santander: Unidades Tecnológicas de Santander - UTS, Universidad Industrial de Santander - UIS, etc.). Conecta a tres actores fundamentales:
1. **Estudiantes y Egresados:** Buscan prácticas empresariales (etapa productiva) y su primer empleo profesional, con validación curricular de pensum.
2. **Empresas e Instituciones Empleadoras:** Crean sedes, publican vacantes, gestionan convenios marco, hacen headhunting institucional y operan un embudo ATS de selección.
3. **Instituciones de Educación Superior (IES):** Administran programas académicos, avalan las competencias del pensum, asignan asesores de práctica y monitorean la trazabilidad de inserción laboral.
4. **Super Administrador de Plataforma (Vincula Central):** Supervisa el crecimiento periódico del ecosistema (mes a mes / semestres), valida documentalmente a las nuevas empresas y acredita a nuevas IES ante el Ministerio de Educación Nacional (SNIES).

---

## 2. Stack Tecnológico y Entorno de Ejecución
* **Frontend:** React 19, Vite v8, React Router v7 (`react-router-dom`), Tailwind CSS v4, Boxicons (`bx` / `bxs`).
* **Backend:** Python FastAPI (`backend/main.py`), extracción de pensums en PDF con PyMuPDF / pdfplumber, taxonomía de habilidades y cálculo de afinidad curricular.
* **Persistencia en Frontend:** React Hooks con capa de persistencia en `localStorage` y sincronización multi-pestaña en tiempo real mediante `window.dispatchEvent(new CustomEvent(...))`.
* **Ejecución Local:** Archivo `abrir_proyecto.bat` en la raíz que inicia tanto el frontend de Vite como el entorno backend.
* **Comando de compilación:** `cmd /c "npm --prefix frontend run build"` (debe compilar siempre con código de salida 0 y 0 errores).

---

## 3. Reglas de Oro de Diseño y Restricciones Estrictas de la UI
Cualquier cambio futuro **DEBE** respetar religiosamente las siguientes directrices fijadas por el usuario:

1. **Solo Modo Claro (Strict Light Mode):**
   * Toda la plataforma opera en fondo claro cálido. No implementar temas oscuros (*Dark Mode*).
2. **Paleta Corporativa Cálida (Warm Corporate Palette):**
   * Tonos base: `cream` (`#faf6f0`), `sand` (`#f4ede4`), `white` (`#ffffff`), `cocoa` (`#2b1810`), `ink` (`#1a1008`).
   * Acentos permitidos: `terracotta` (`#c85a32`) y `ochre` (`#d99b26`).
   * **PROHIBICIÓN TOTAL:** No usar azul ni morado en botones, cabeceras, bordes ni elementos principales.
3. **Portadas y Cabeceras Limpias (Sin Eyebrows con Puntos):**
   * Las cabeceras (`CompanyPageHero`) **NO** deben llevar subtítulos ni badges con puntos de separación (ejemplo prohibido: `Gestión de Selección · Cenit Transporte`). Deben ser limpias con título directo, descripción amigable, fotografía cálida Pexels y tarjetas de métricas.
4. **Cero Simulación de IA en Fechas Documentales:**
   * **NO** simular análisis de fechas con IA ni calcular días de expedición con badges de «Vigente» o «Vencido». Los documentos radicados se presentan neutralmente como `Documento adjunto` para inspección humana directa.
5. **Cero Menciones de «Seguridad KYB»:**
   * No usar la sigla ni el concepto «KYB» (*Know Your Business*). Utilizar términos directos y naturales como **Acreditación**, **Validación Empresarial** o **Expediente de Documentos**.
6. **Diseño de Listas y Tarjetas:**
   * Tarjetas rectangulares cálidas y legibles.
   * Evitar badges de colores saturados montados sobre los títulos de candidatos o vacantes.
7. **Control de Versiones:**
   * **NUNCA** ejecutar comandos de `git commit` ni `git push` a menos que el usuario lo ordene de forma expresa.

---

## 4. Mapa Completo de Roles, Rutas y Módulos

### Rol 1: Egresado / Graduado
* `/dashboard` — Panel de inicio del egresado (postulaciones activas, alertas de empleo).
* `/dashboard/postulaciones` — Seguimiento a procesos de selección.
* `/dashboard/vacantes` — Explorador de ofertas laborales con compatibilidad de pensum.
* `/dashboard/perfil` — Hoja de vida digital, formación en UTS, competencias validadas y proyectos.

### Rol 2: Asesor IES (Seguimiento Académico)
* `/institucion/dashboard` — Panel operativo del asesor de prácticas y empleo.
* `/institucion/estudiantes/seguimiento` — Bandeja de estudiantes en práctica o egresados.
* `/institucion/estudiantes/estadisticas` — Indicadores de colocación laboral.
* `/institucion/empresas/solicitudes` — Solicitudes de vinculación de empresas recibidas en la IES.
* `/institucion/empresas/seguimiento` — Seguimiento a convenios y empresas empleadoras.
* `/institucion/mercado-laboral/competencias` — Mapa de calor y demanda de habilidades.

### Rol 3: Administrador IES (Gobierno Universitario)
* `/institucion/admin/perfil` — Identidad de la IES (UTS, UIS), sedes y rectoría.
* `/institucion/admin/programas` — Gestión de programas académicos y carga/procesamiento de pensums curriculares.
* `/institucion/admin/trazabilidad` — Bitácora de seguimiento institucional.
* `/institucion/admin/asesores` — Asignación de asesores por facultad, programa y sede.

### Rol 4: Administrador de Empresa (Central Corporativo)
* `/empresa/admin/perfil` — Datos fiscales (NIT, Razón social, CIIU, representante legal).
* `/empresa/admin/sedes` — Gestión de sedes operativas y áreas de trabajo con vinculación bidireccional a reclutadores.
* `/empresa/admin/reclutadores` — Gestión del equipo de atracción de talento humano.
* `/empresa/admin/vacantes` — Repositorio maestro de convocatorias de empleo.
* `/empresa/admin/vacantes/nueva` y `/editar` — Editor técnico de vacantes (competencias duras, blandas, pensum afín).
* `/empresa/admin/convenios` — Convenios marco suscritos con universidades (UTS, UIS).
* `/empresa/admin/actividad` — Auditoría y registros de actividad corporativa.

### Rol 5: Reclutador de Empresa (Operativa de Selección)
* `/empresa/reclutador/dashboard` — Inicio operativo de la reclutadora líder (María Fernanda Henao), agenda de entrevistas de hoy y solicitudes entrantes.
* `/empresa/reclutador/candidatos` — **Embudo ATS Completo:**
  * Vista Kanban fluida (contenedor flex horizontal sin solapamiento de tarjetas entre columnas).
  * Columnas: *En Revisión*, *Preseleccionados*, *Prueba Técnica*, *Entrevista*, *Oferta / Finalistas*, *Descartados*.
  * Pantalla inicial guiada: *«Selecciona una vacante para abrir su embudo»*.
  * Drawer deslizable `CandidateDetailDrawer.jsx` para calificar, añadir notas y avanzar de etapa.
* `/empresa/reclutador/talento` — **Banco de Talento IES (Sourcing & Headhunting):**
  * Buscador y filtros por IES aliada (UTS, UIS) y momento académico (recién egresado, practicante, con experiencia).
  * **Comparador dinámico de afinidad:** Selector para contrastar en vivo a cualquier egresado contra una vacante activa, calculando porcentaje de afinidad de habilidades y resaltando competencias coincidentes.
  * Modal `InviteToVacancyModal.jsx` para invitar en 1 clic a participar en una convocatoria abierta con mensaje personalizado.
  * Drawer `TalentDetailDrawer.jsx` con verificación de perfil por IES, promedio GPA y proyecto capstone.
  * Cabecera limpia sin botón que lleve de regreso al embudo (retirado a solicitud del usuario).
* `/empresa/reclutador/vacantes` — Mis vacantes asignadas con creación y duplicación.

### Rol 6: Super Administrador de Vincula (Plataforma Central)
* `/admin` / `/admin/dashboard` — **Panel Central de Administración:**
  * **Módulo interactivo de métricas periódicas (`PlatformPeriodicAnalytics.jsx`):**
    * Filtros por rangos: *Últimos 6 meses*, *Año 2026*, *Trimestre Q4*, *Cortes semestrales*.
    * Desglose de 4 dimensiones: Nuevas Empresas, Nuevas Vacantes, Nuevas Universidades / IES y Nuevos Egresados en Red.
    * Tarjetas de alta del periodo vs. acumulado histórico total de la plataforma.
    * Gráfica SVG interactiva de columnas con detalle dinámico en hover.
    * Tabla detallada mes a mes con porcentajes de variación y botón funcional de **Exportar CSV**.
  * **Bandeja de atención prioritaria:** Cola de nuevas solicitudes de empresas e IES con días de espera y botón de inspección directa.
  * Barra superior limpia que muestra únicamente la fecha del día (retiradas las leyendas y badges anteriores).
* `/admin/empresas` — **Aprobación de Empresas:**
  * Pestañas: *Pendientes*, *En Subsanación*, *Aprobadas / Activas*, *Rechazadas*, *Todas*.
  * Drawer `CompanyVerificationDrawer.jsx` para inspeccionar Cámara de Comercio, RUT DIAN, cédula del representante legal y dominio corporativo.
  * Modal `CorrectionModal.jsx` para solicitar requerimientos de subsanación o rechazo formal.
* `/admin/instituciones` — **Aprobación de IES:**
  * Pestañas de validación, código SNIES, resolución MEN, acta de rectoría y convenio marco.
  * Drawer `InstitutionVerificationDrawer.jsx`.

---

## 5. Credenciales de Acceso para Demostración (`/login`)
En [LoginPage.jsx](file:///u:/Bolsa_de_empleo/frontend/src/pages/LoginPage.jsx) existe una botonera de acceso rápido por rol que auto-completa las credenciales:

| Rol | Correo Electrónico | Contraseña | Redirección de Inicio |
| :--- | :--- | :--- | :--- |
| **Super Admin Vincula** | `admin@vincula.edu.co` | `Password123!` | `/admin/dashboard` |
| **Reclutador Empresa** | `m.henao@cenit-transporte.com` | `Password123!` | `/empresa/reclutador/dashboard` |
| **Administrador Empresa** | `talento@cenit-transporte.com` | `Password123!` | `/empresa/admin/perfil` |
| **Asesor IES** | `c.morales@correo.uts.edu.co` | `Password123!` | `/institucion/dashboard` |
| **Administrador IES** | `contacto@uts.edu.co` | `Password123!` | `/institucion/admin/perfil` |
| **Egresado / Estudiante** | `jaider@correo.uts.edu.co` | `Password123!` | `/dashboard` |

---

## 6. Estructura de Datos y Hooks Clave

```
frontend/src/
├── data/
│   ├── vinculaAdminData.js           # Métricas periódicas mensuales/semestrales, solicitudes de empresas e IES
│   ├── companyTalentPoolData.js      # Base de datos de egresados/practicantes verificados de UTS y UIS
│   ├── companyCandidatesData.js      # Candidatos activos y etapas ATS (Kanban)
│   ├── companyVacanciesData.js       # Convocatorias de empleo
│   ├── companySitesData.js           # Sedes y áreas operativas
│   ├── companyRecruitersData.js      # Reclutadores asignados
│   ├── companyAgreementsData.js      # Convenios con IES
│   ├── companyImages.js              # Fotografías Pexels cálidas corporativas centralizadas
│   └── institutionProgramsData.js    # Programas académicos y facultades de la IES
├── hooks/
│   ├── useVinculaAdmin.js            # Estado y acciones de aprobación/subsanación del Super Admin
│   ├── useCompanyTalentPool.js       # Sourcing, guardado en favoritos y registro de invitaciones
│   ├── useCompanyCandidates.js       # Transición de fases en embudo ATS y notas
│   ├── useCompanyVacancies.js        # CRUD y duplicación de vacantes
│   ├── useCompanySites.js            # Asignación y gestión de sedes
│   ├── useCompanyProfile.js          # Datos corporativos de la empresa
│   └── useAuthCredentials.js         # Autenticación simulada y perfiles activos
└── components/
    ├── admin/                        # Componentes exclusivos del Super Admin Vincula
    ├── company/                      # Componentes de Administrador y Reclutador de Empresa
    ├── institution/                  # Componentes de Administrador y Asesor IES
    └── common/                       # Topbars, Dropdown de usuario, Modales globales
```

---

## 7. Instrucciones para la Próxima IA que continúe este trabajo
* **Tono de comunicación:** Directo, en español natural, profesional, sin encabezados robóticos repetitivos ni justificaciones innecesarias.
* **Integridad del código:** Antes de dar por finalizada cualquier tarea, ejecutar siempre `cmd /c "npm --prefix frontend run build"` y garantizar que la compilación de Vite termine con éxito sin errores de linting ni sintaxis.
* **Enlaces clicables:** Proporcionar siempre enlaces de archivos en formato Markdown `file:///` con barras inclinadas hacia adelante (ej. `[VinculaAdminDashboardPage.jsx](file:///u:/Bolsa_de_empleo/frontend/src/pages/VinculaAdminDashboardPage.jsx)`).
* **Prioridad:** Consultar este documento antes de realizar cambios de interfaz para no reintroducir elementos prohibidos (modos oscuros, colores azules, eyebrows con puntos o análisis de fechas de IA).

