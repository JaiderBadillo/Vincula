# Diagrama de Base de Datos (ERD) — Plataforma Vincula

Este documento presenta el modelo Entidad-Relación completo de las **45 tablas** definidas en [schema_vincula_completo.sql](file:///u:/Bolsa_de_empleo/database/schema_vincula_completo.sql) (PostgreSQL 15+ y `pgvector`). Para evitar cruces de líneas y superposición de textos, el modelo se presenta en una **Vista Macro** seguida de **6 diagramas detallados por dominio**.

---

## 1. Vista Macro — Relaciones entre Entidades Principales

```mermaid
erDiagram
    usuarios ||--o| egresados : "1:1"
    usuarios ||--o| asesores_ies : "1:1"
    usuarios ||--o| reclutadores_empresa : "1:1"

    instituciones ||--o{ sedes_institucion : "tiene"
    instituciones ||--o{ facultades : "tiene"
    instituciones ||--o{ programas_academicos : "oferta"
    instituciones ||--o{ asesores_ies : "vincula"
    instituciones ||--o{ convenios_interinstitucionales : "suscribe"

    empresas ||--o{ sedes_empresa : "tiene"
    empresas ||--o{ reclutadores_empresa : "emplea"
    empresas ||--o{ vacantes : "publica"
    empresas ||--o{ convenios_interinstitucionales : "suscribe"

    egresados ||--o{ academicos_egresado : "cursa"
    programas_academicos ||--o{ academicos_egresado : "titula"
    egresados ||--o{ archivos_hoja_vida : "adjunta"
    egresados ||--o{ postulaciones : "realiza"

    vacantes ||--o{ postulaciones : "recibe"
    postulaciones ||--o| registros_laborales_egresado : "origina"

    vacantes ||--o{ reportes_vacante : "es reportada"
    usuarios ||--o{ reportes_vacante : "reporta"
```

---

## 2. Dominio 1 — Identidad, Acceso (IAM) y Auditoría Global

Tablas: `usuarios`, `codigos_recuperacion`, `accesos_asesor_ies`, `auditorias_superadmin`, `instantaneas_metricas_periodicas`.

```mermaid
erDiagram
    usuarios {
        uuid id PK
        varchar correo_electronico UK
        varchar contrasena_hash
        varchar google_sub UK
        enum rol
        enum estado
        timestamptz ultimo_acceso_en
        timestamptz creado_en
        timestamptz actualizado_en
    }

    codigos_recuperacion {
        uuid id_usuario PK,FK
        varchar codigo_hash
        timestamptz expira_en
        timestamptz solicitado_en
        integer intentos
    }

    accesos_asesor_ies {
        uuid id PK
        uuid id_usuario FK
        timestamptz fecha
        varchar metodo
        varchar navegador
        varchar direccion_ip
    }

    auditorias_superadmin {
        uuid id PK
        varchar tipo_entidad
        uuid id_entidad
        uuid id_auditor FK
        varchar accion_realizada
        text observaciones_correccion
        timestamptz registrado_en
    }

    instantaneas_metricas_periodicas {
        uuid id PK
        varchar clave_periodo UK
        enum tipo_periodo
        varchar etiqueta_periodo
        integer nuevas_empresas
        integer nuevas_vacantes
        integer nuevas_instituciones
        integer nuevos_egresados
        integer total_postulaciones
        date fecha_corte
    }

    usuarios ||--o| codigos_recuperacion : "recupera"
    usuarios ||--o{ accesos_asesor_ies : "registra"
    usuarios ||--o{ auditorias_superadmin : "audita"
```

---

## 3. Dominio 2 — Ecosistema Académico (IES, Programas y Pensum)

Tablas: `instituciones`, `documentos_institucion`, `sedes_institucion`, `facultades`, `programas_academicos`, `pensums_programa`, `asignaturas_pensum`, `competencias_asignatura`, `taxonomia_competencias`, `asesores_ies`, `asignacion_asesores_programas`.

```mermaid
erDiagram
    instituciones {
        uuid id PK
        varchar nombre_oficial
        varchar nombre_corto
        varchar codigo_snies UK
        varchar nit UK
        varchar caracter_academico
        varchar nombre_rector
        varchar correo_institucional
        enum estado
        timestamptz aprobado_en
    }

    documentos_institucion {
        uuid id PK
        uuid id_institucion FK
        varchar tipo_documento
        varchar nombre_archivo
        text url_archivo
        boolean archivo_cargado_por_usuario
        integer tamano_kb
        varchar estado
    }

    sedes_institucion {
        uuid id PK
        uuid id_institucion FK
        varchar nombre
        varchar ciudad
        varchar departamento
        boolean es_sede_principal
        varchar estado
    }

    facultades {
        uuid id PK
        uuid id_institucion FK
        varchar codigo
        varchar sigla
        varchar nombre
        varchar estado
    }

    programas_academicos {
        uuid id PK
        uuid id_institucion FK
        uuid id_facultad FK
        uuid id_sede FK
        uuid id_programa_previo FK
        varchar codigo_interno
        varchar codigo_snies
        varchar nombre
        varchar nivel_formacion
        varchar modalidad
        integer duracion_semestres
        integer total_creditos
        varchar estado
    }

    pensums_programa {
        uuid id PK
        uuid id_programa FK
        varchar codigo_version
        boolean es_activo
        text url_pdf
        timestamptz extraido_en
    }

    asignaturas_pensum {
        uuid id PK
        uuid id_pensum FK
        integer numero_semestre
        varchar codigo_asignatura
        varchar nombre
        integer creditos
        text_array herramientas
    }

    competencias_asignatura {
        uuid id PK
        uuid id_asignatura FK
        uuid id_competencia FK
        varchar texto_competencia
        varchar tipo_competencia
    }

    taxonomia_competencias {
        uuid id PK
        varchar nombre UK
        enum categoria
        varchar etiqueta_normalizada UK
        vector vector_embedding
    }

    asesores_ies {
        uuid id PK
        uuid id_usuario UK,FK
        uuid id_institucion FK
        uuid id_sede FK
        uuid id_facultad FK
        varchar nombre_completo
        varchar correo_institucional
        boolean avisar_accesos_email
        boolean avisar_cambios_email
        varchar sedes_cobertura
        varchar estado
    }

    asignacion_asesores_programas {
        uuid id_asesor PK,FK
        uuid id_programa PK,FK
    }

    instituciones ||--o{ documentos_institucion : "soporta"
    instituciones ||--o{ sedes_institucion : "posee"
    instituciones ||--o{ facultades : "organiza"
    instituciones ||--o{ programas_academicos : "oferta"
    instituciones ||--o{ asesores_ies : "integra"
    facultades ||--o{ programas_academicos : "adscribe"
    sedes_institucion ||--o{ programas_academicos : "aloja"
    programas_academicos ||--o{ programas_academicos : "ciclo_previo"
    programas_academicos ||--o{ pensums_programa : "estructura"
    pensums_programa ||--o{ asignaturas_pensum : "contiene"
    asignaturas_pensum ||--o{ competencias_asignatura : "desarrolla"
    taxonomia_competencias ||--o{ competencias_asignatura : "normaliza"
    asesores_ies ||--o{ asignacion_asesores_programas : "gestiona"
    programas_academicos ||--o{ asignacion_asesores_programas : "asignado_a"
```

---

## 4. Dominio 3 — Ecosistema Empresarial y Convenios IES

Tablas: `empresas`, `documentos_empresa`, `sedes_empresa`, `areas_sede_empresa`, `reclutadores_empresa`, `asignacion_reclutadores_sedes`, `convenios_interinstitucionales`, `solicitudes_convenio_ies`, `interacciones_seguimiento_empresa`, `bitacora_actividad_empresa`.

```mermaid
erDiagram
    empresas {
        uuid id PK
        varchar razon_social
        varchar nombre_comercial
        varchar nit UK
        varchar codigo_ciiu
        varchar sector_economico
        varchar tamano_empresa
        varchar ciudad
        varchar correo_contacto
        enum estado
        timestamptz aprobado_en
    }

    documentos_empresa {
        uuid id PK
        uuid id_empresa FK
        varchar tipo_documento
        varchar nombre_archivo
        text url_archivo
        boolean archivo_cargado_por_usuario
        integer tamano_kb
        varchar estado
    }

    sedes_empresa {
        uuid id PK
        uuid id_empresa FK
        varchar nombre
        varchar ciudad
        varchar departamento
        boolean es_sede_principal
        varchar estado
    }

    areas_sede_empresa {
        uuid id PK
        uuid id_sede FK
        varchar nombre_area
        integer personal_asignado
    }

    reclutadores_empresa {
        uuid id PK
        uuid id_usuario UK,FK
        uuid id_empresa FK
        varchar nombre_completo
        varchar correo_corporativo
        varchar cargo
        varchar estado
    }

    asignacion_reclutadores_sedes {
        uuid id_reclutador PK,FK
        uuid id_sede PK,FK
    }

    convenios_interinstitucionales {
        uuid id PK
        uuid id_empresa FK
        uuid id_institucion FK
        varchar codigo_convenio UK
        enum modalidad
        date fecha_inicio
        date fecha_vencimiento
        enum estado
    }

    solicitudes_convenio_ies {
        uuid id PK
        uuid id_empresa FK
        uuid id_institucion FK
        varchar tipo_convenio
        integer vacantes_proyectadas
        varchar estado
    }

    interacciones_seguimiento_empresa {
        uuid id PK
        uuid id_convenio FK
        uuid id_asesor FK
        varchar tipo_interaccion
        text resumen_acuerdos
        date fecha_interaccion
    }

    bitacora_actividad_empresa {
        uuid id PK
        uuid id_empresa FK
        uuid id_usuario FK
        varchar tipo_evento
        varchar entidad_afectada
        uuid id_registro_afectado
        timestamptz registrado_en
    }

    empresas ||--o{ documentos_empresa : "radica"
    empresas ||--o{ sedes_empresa : "opera"
    sedes_empresa ||--o{ areas_sede_empresa : "divide"
    empresas ||--o{ reclutadores_empresa : "vincula"
    reclutadores_empresa ||--o{ asignacion_reclutadores_sedes : "cubre"
    sedes_empresa ||--o{ asignacion_reclutadores_sedes : "atendida_por"
    empresas ||--o{ convenios_interinstitucionales : "firma"
    empresas ||--o{ solicitudes_convenio_ies : "solicita"
    convenios_interinstitucionales ||--o{ interacciones_seguimiento_empresa : "registra"
    empresas ||--o{ bitacora_actividad_empresa : "audita"
```

---

## 5. Dominio 4 — Egresados, Expediente Académico y Hoja de Vida

Tablas: `egresados`, `academicos_egresado`, `competencias_egresado`, `idiomas_egresado`, `experiencias_laborales_egresado`, `archivos_hoja_vida`, `enlaces_egresado`.

```mermaid
erDiagram
    egresados {
        uuid id PK
        uuid id_usuario UK,FK
        varchar tipo_documento
        varchar numero_documento UK
        varchar codigo_estudiantil
        varchar nombre_completo
        varchar ciudad_residencia
        varchar telefono
        varchar correo_personal
        varchar titular_profesional
        jsonb perfil_adicional
        boolean disponible_para_trabajar
        varchar estado
    }

    academicos_egresado {
        uuid id PK
        uuid id_egresado FK
        uuid id_institucion FK
        uuid id_programa FK
        uuid id_sede FK
        varchar nivel_formacion
        integer ano_graduacion
        boolean validado_por_ies
        text url_diploma_pdf
        boolean diploma_cargado_por_egresado
        varchar estado_verificacion
        varchar numero_acta_grado
        varchar numero_libro_folio
        date fecha_grado
        varchar sello_digital
    }

    competencias_egresado {
        uuid id_egresado PK,FK
        uuid id_competencia PK,FK
        integer nivel_dominio
        boolean validada_por_pensum
    }

    idiomas_egresado {
        uuid id PK
        uuid id_egresado FK
        varchar nombre_idioma
        varchar nivel_marco_europeo
    }

    experiencias_laborales_egresado {
        uuid id PK
        uuid id_egresado FK
        varchar empresa
        varchar cargo
        date fecha_inicio
        date fecha_fin
        boolean es_trabajo_actual
    }

    archivos_hoja_vida {
        uuid id PK
        uuid id_egresado FK
        varchar nombre_archivo
        text url_archivo
        integer tamano_kb
        boolean es_predeterminado
    }

    enlaces_egresado {
        uuid id_egresado PK,FK
        text url_linkedin
        text url_github
        text url_portafolio
    }

    egresados ||--o{ academicos_egresado : "acredita"
    egresados ||--o{ competencias_egresado : "domina"
    egresados ||--o{ idiomas_egresado : "habla"
    egresados ||--o{ experiencias_laborales_egresado : "acumula"
    egresados ||--o{ archivos_hoja_vida : "almacena"
    egresados ||--o| enlaces_egresado : "enlaza"
```

---

## 6. Dominio 5 — Vacantes, Embudo ATS Kanban y Banco de Talento

Tablas: `vacantes`, `competencias_exigidas_vacante`, `programas_afines_vacante`, `postulaciones`, `registros_laborales_egresado`, `historial_fases_postulacion`, `notas_reclutador_postulacion`, `entrevistas_postulacion`, `favoritos_banco_talento`, `invitaciones_banco_talento`.

```mermaid
erDiagram
    vacantes {
        uuid id PK
        uuid id_empresa FK
        uuid id_sede FK
        uuid id_reclutador_responsable FK
        varchar codigo_vacante UK
        varchar titulo
        varchar categoria
        enum modalidad
        varchar tipo_contrato
        numeric salario_minimo
        numeric salario_maximo
        integer cupos_disponibles
        integer total_postulantes
        enum estado
        date fecha_cierre
    }

    competencias_exigidas_vacante {
        uuid id_vacante PK,FK
        uuid id_competencia PK,FK
        boolean es_obligatoria
    }

    programas_afines_vacante {
        uuid id_vacante PK,FK
        uuid id_programa PK,FK
    }

    postulaciones {
        uuid id PK
        uuid id_vacante FK
        uuid id_egresado FK
        uuid id_hoja_vida FK
        enum fase_actual
        numeric porcentaje_afinidad
        text retroalimentacion_reclutador
        varchar motivo_descarte
        timestamptz postulado_en
    }

    registros_laborales_egresado {
        uuid id PK
        uuid id_academico FK
        uuid id_postulacion UK,FK
        varchar empresa_contratante
        varchar cargo_desempenado
        varchar tipo_contrato
        date fecha_vinculacion
    }

    historial_fases_postulacion {
        uuid id PK
        uuid id_postulacion FK
        enum fase_anterior
        enum fase_nueva
        uuid cambiado_por_usuario FK
        timestamptz registrado_en
    }

    notas_reclutador_postulacion {
        uuid id PK
        uuid id_postulacion FK
        uuid id_reclutador FK
        text texto_nota
        timestamptz creado_en
    }

    entrevistas_postulacion {
        uuid id PK
        uuid id_postulacion FK
        uuid id_reclutador FK
        date fecha_entrevista
        varchar franja_horaria
        varchar modalidad
        enum estado
    }

    favoritos_banco_talento {
        uuid id_reclutador PK,FK
        uuid id_egresado PK,FK
        timestamptz marcado_en
    }

    invitaciones_banco_talento {
        uuid id PK
        uuid id_reclutador FK
        uuid id_egresado FK
        uuid id_vacante FK
        varchar estado
    }

    vacantes ||--o{ competencias_exigidas_vacante : "exige"
    vacantes ||--o{ programas_afines_vacante : "dirige_a"
    vacantes ||--o{ postulaciones : "recibe"
    postulaciones ||--o| registros_laborales_egresado : "consolida"
    postulaciones ||--o{ historial_fases_postulacion : "traza"
    postulaciones ||--o{ notas_reclutador_postulacion : "evalua"
    postulaciones ||--o{ entrevistas_postulacion : "agenda"
    vacantes ||--o{ invitaciones_banco_talento : "convoca"
```

---

## 7. Dominio 6 — Moderación de Vacantes y Cuentas

Tablas: `reportes_vacante`, `acciones_moderacion` (y el estado `inhabilitada` de `vacantes.estado`).

```mermaid
erDiagram
    reportes_vacante {
        uuid id PK
        uuid id_vacante FK
        uuid id_reportante FK
        varchar motivo
        text detalle
        varchar estado
        varchar resolucion
        text nota_admin
        uuid resuelto_por FK
        timestamptz resuelto_en
        timestamptz creado_en
    }

    acciones_moderacion {
        uuid id PK
        varchar tipo_entidad
        uuid id_entidad
        varchar accion
        text motivo
        uuid id_admin FK
        timestamptz creado_en
    }

    vacantes ||--o{ reportes_vacante : "es reportada"
    usuarios ||--o{ reportes_vacante : "reporta (una vez por vacante)"
    usuarios |o--o{ reportes_vacante : "resuelve"
    usuarios |o--o{ acciones_moderacion : "ejecuta"
```

`acciones_moderacion.id_entidad` apunta, según `tipo_entidad`, a una vacante, un usuario o una empresa (referencia polimórfica sin clave foránea). La tabla `auditorias_superadmin` no se reutiliza porque su restricción solo admite `empresa` e `institucion`.

---

## 8. Cómo mantener el SQL y el diagrama iguales a la base de datos desplegada

La fuente de verdad es la base de datos desplegada; el SQL del repositorio es su copia legible. Cada vez que se aplique una migración (`database/*.sql`):

1. Reflejar el cambio en `schema_vincula_completo.sql` (y en este documento si cambian tablas o relaciones).
2. Verificar que no haya deriva, desde `backend/`:

```bash
python scripts/schema_tools.py check
```

Compara tablas, columnas y valores de enums contra la BD real y termina con código 1 si hay diferencias.

3. Regenerar el diagrama MER interactivo (DBML) desde la BD real:

```bash
python scripts/schema_tools.py dbml
```

Esto escribe `docs/diagrama_bd.dbml`. Se pega en [dbdiagram.io](https://dbdiagram.io) para verlo, reordenarlo y exportarlo a PNG o PDF.

Alternativas con conexión directa a la BD: DBeaver (clic derecho en el esquema → *View Diagram*) y pgAdmin (*Generate ERD*).
