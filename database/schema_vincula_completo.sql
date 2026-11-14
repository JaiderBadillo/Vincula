-- ============================================================================
-- PLATAFORMA VINCULA: BOLSA DE EMPLEO Y PRÁCTICAS UNIVERSITARIAS
-- ESQUEMA RELACIONAL DEFINITIVO (POSTGRESQL 15+)

-- Normalización: Tercera Forma Normal (3NF) con Soporte de Vectores Semánticos
-- ============================================================================

-- Habilitar extensiones requeridas para UUIDs y Búsqueda Vectorial por IA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- SECCIÓN 1: TIPOS ENUMERADOS (ENUMS)
-- ============================================================================

CREATE TYPE rol_usuario_enum AS ENUM (
    'egresado',
    'asesor_ies',
    'admin_ies',
    'admin_empresa',
    'reclutador_empresa',
    'superadmin_vincula'
);

CREATE TYPE estado_cuenta_enum AS ENUM (
    'activo',
    'inactivo',
    'suspendido',
    'pendiente_verificacion'
);

CREATE TYPE estado_validacion_enum AS ENUM (
    'pendiente',
    'en_subsanacion',
    'aprobado',
    'rechazado'
);

CREATE TYPE modalidad_trabajo_enum AS ENUM (
    'Presencial',
    'Remoto',
    'Híbrido'
);

CREATE TYPE estado_vacante_enum AS ENUM (
    'borrador',
    'abierta',
    'pausada',
    'cerrada'
);

CREATE TYPE fase_postulacion_enum AS ENUM (
    'en_revision',
    'preseleccionados',
    'prueba_tecnica',
    'entrevista',
    'oferta_finalistas',
    'contratado',
    'descartados'
);

CREATE TYPE modalidad_convenio_enum AS ENUM (
    'Pasantía',
    'Aprendizaje',
    'Laboral'
);

CREATE TYPE estado_convenio_enum AS ENUM (
    'activo',
    'en_tramite',
    'vencido',
    'terminado'
);

CREATE TYPE categoria_competencia_enum AS ENUM (
    'tecnica',
    'blanda'
);

CREATE TYPE tipo_periodo_analitica_enum AS ENUM (
    'mensual',
    'semestral'
);

CREATE TYPE estado_entrevista_enum AS ENUM (
    'programada',
    'confirmada',
    'realizada',
    'cancelada',
    'reprogramada'
);

-- Función utilitaria para actualizar automáticamente el campo actualizado_en
CREATE OR REPLACE FUNCTION actualizar_marca_tiempo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECCIÓN 2: CONTROL DE ACCESO, IDENTIDAD Y USUARIOS (IAM)
-- ============================================================================

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correo_electronico VARCHAR(255) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    rol rol_usuario_enum NOT NULL,
    estado estado_cuenta_enum DEFAULT 'activo' NOT NULL,
    ultimo_acceso_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_usuarios_rol_estado ON usuarios(rol, estado);
CREATE INDEX idx_usuarios_correo ON usuarios(correo_electronico);

CREATE TRIGGER trg_usuarios_actualizado
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo();

-- ============================================================================
-- SECCIÓN 3: ECOSISTEMA ACADÉMICO (IES, SEDES, FACULTADES, PROGRAMAS Y PENSUM)
-- ============================================================================

CREATE TABLE instituciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_oficial VARCHAR(255) NOT NULL,
    nombre_corto VARCHAR(60) NOT NULL,
    codigo_snies VARCHAR(30) UNIQUE NOT NULL,
    nit VARCHAR(30) UNIQUE NOT NULL,
    caracter_academico VARCHAR(100) NOT NULL, -- 'Universidad', 'Institución Tecnológica', 'Institución Universitaria'
    nombre_rector VARCHAR(150) NOT NULL,
    documento_rector VARCHAR(30) NOT NULL,
    persona_contacto VARCHAR(150) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    correo_institucional VARCHAR(255) NOT NULL,
    sitio_web VARCHAR(255),
    url_logo TEXT,
    url_portada TEXT,
    estado estado_validacion_enum DEFAULT 'pendiente' NOT NULL,
    registrado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    aprobado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_instituciones_snies ON instituciones(codigo_snies);
CREATE INDEX idx_instituciones_estado ON instituciones(estado);

CREATE TRIGGER trg_instituciones_actualizado
BEFORE UPDATE ON instituciones
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo();

CREATE TABLE documentos_institucion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_institucion UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(60) NOT NULL, -- 'resolucion_men', 'rut_institucional', 'cedula_rector'
    nombre_archivo VARCHAR(255) NOT NULL,
    url_archivo TEXT NOT NULL,
    tamano_kb INTEGER NOT NULL,
    subido_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado VARCHAR(30) DEFAULT 'adjunto' NOT NULL
);

CREATE INDEX idx_docs_institucion_inst ON documentos_institucion(id_institucion);

CREATE TABLE sedes_institucion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_institucion UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    nombre_corto VARCHAR(50),
    ciudad VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    correo VARCHAR(255),
    es_sede_principal BOOLEAN DEFAULT FALSE NOT NULL,
    estado VARCHAR(30) DEFAULT 'activa' NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_sedes_institucion_inst ON sedes_institucion(id_institucion);

CREATE TABLE facultades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_institucion UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    sigla VARCHAR(30),
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    oficina VARCHAR(100),
    color_distintivo VARCHAR(30),
    estado VARCHAR(30) DEFAULT 'activa' NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_facultades_institucion ON facultades(id_institucion);

CREATE TABLE programas_academicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_institucion UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
    id_facultad UUID NOT NULL REFERENCES facultades(id) ON DELETE RESTRICT,
    id_sede UUID NOT NULL REFERENCES sedes_institucion(id) ON DELETE RESTRICT,
    codigo_interno VARCHAR(50) NOT NULL,
    codigo_snies VARCHAR(30) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    nivel_formacion VARCHAR(60) NOT NULL, -- 'Tecnológico', 'Profesional Universitario', 'Especialización'
    modalidad VARCHAR(50) NOT NULL, -- 'Presencial', 'Virtual', 'Híbrida'
    duracion_semestres INTEGER NOT NULL,
    total_creditos INTEGER NOT NULL,
    nombre_director VARCHAR(150),
    correo_director VARCHAR(255),
    estado_acreditacion VARCHAR(100),
    id_programa_previo UUID REFERENCES programas_academicos(id) ON DELETE SET NULL, -- ciclo propedéutico -- 'Alta Calidad Acreditado', 'Registro Calificado Vigente'
    estado VARCHAR(30) DEFAULT 'activo' NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_programas_facultad ON programas_academicos(id_facultad);
CREATE INDEX idx_programas_snies ON programas_academicos(codigo_snies);

CREATE TABLE pensums_programa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_programa UUID NOT NULL REFERENCES programas_academicos(id) ON DELETE CASCADE,
    codigo_version VARCHAR(50) NOT NULL, -- 'Pensum 2024-V2'
    es_activo BOOLEAN DEFAULT TRUE NOT NULL,
    url_pdf TEXT,
    extraido_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE asignaturas_pensum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pensum UUID NOT NULL REFERENCES pensums_programa(id) ON DELETE CASCADE,
    numero_semestre INTEGER NOT NULL CHECK (numero_semestre BETWEEN 1 AND 12),
    codigo_asignatura VARCHAR(50) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    creditos INTEGER NOT NULL CHECK (creditos >= 1),
    herramientas TEXT[] NOT NULL DEFAULT '{}' -- declaradas por la IES
);

CREATE INDEX idx_asignaturas_pensum ON asignaturas_pensum(id_pensum);

CREATE TABLE taxonomia_competencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(120) UNIQUE NOT NULL,
    categoria categoria_competencia_enum NOT NULL,
    etiqueta_normalizada VARCHAR(120) UNIQUE NOT NULL,
    vector_embedding vector(1536) -- Espacio vectorial para búsqueda semántica con IA (pgvector)
);

CREATE INDEX idx_competencias_categoria ON taxonomia_competencias(categoria);

CREATE TABLE competencias_asignatura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_asignatura UUID NOT NULL REFERENCES asignaturas_pensum(id) ON DELETE CASCADE,
    id_competencia UUID REFERENCES taxonomia_competencias(id) ON DELETE SET NULL,
    texto_competencia VARCHAR(255) NOT NULL,
    tipo_competencia VARCHAR(50) DEFAULT 'técnica' NOT NULL
);

CREATE TABLE asesores_ies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_institucion UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
    id_sede UUID REFERENCES sedes_institucion(id) ON DELETE SET NULL,
    id_facultad UUID REFERENCES facultades(id) ON DELETE SET NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    correo_institucional VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    cargo VARCHAR(100) DEFAULT 'Asesor de Enlace y Prácticas',
    estado VARCHAR(30) DEFAULT 'activo' NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE asignacion_asesores_programas (
    id_asesor UUID NOT NULL REFERENCES asesores_ies(id) ON DELETE CASCADE,
    id_programa UUID NOT NULL REFERENCES programas_academicos(id) ON DELETE CASCADE,
    PRIMARY KEY (id_asesor, id_programa)
);

-- ============================================================================
-- SECCIÓN 4: ECOSISTEMA EMPRESARIAL MULTI-SEDE Y CONVENIOS
-- ============================================================================

CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razon_social VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255) NOT NULL,
    nit VARCHAR(30) UNIQUE NOT NULL,
    codigo_ciiu VARCHAR(10) NOT NULL,
    descripcion_ciiu TEXT NOT NULL,
    sector_economico VARCHAR(100) NOT NULL,
    tamano_empresa VARCHAR(50) NOT NULL, -- '1 a 10', '11 a 50', '51 a 200', '200+'
    departamento VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    correo_contacto VARCHAR(255) NOT NULL,
    sitio_web VARCHAR(255),
    nombre_representante_legal VARCHAR(150) NOT NULL,
    documento_representante_legal VARCHAR(30) NOT NULL,
    persona_contacto VARCHAR(150) NOT NULL,
    url_logo TEXT,
    url_portada TEXT,
    descripcion_corporativa TEXT,
    dominio_es_corporativo BOOLEAN DEFAULT TRUE NOT NULL,
    estado estado_validacion_enum DEFAULT 'pendiente' NOT NULL,
    registrado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    aprobado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_empresas_nit ON empresas(nit);
CREATE INDEX idx_empresas_estado ON empresas(estado);

CREATE TRIGGER trg_empresas_actualizado
BEFORE UPDATE ON empresas
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo();

CREATE TABLE documentos_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(60) NOT NULL, -- 'camara_comercio', 'rut', 'cedula_rep_legal', 'carta_autorizacion'
    nombre_archivo VARCHAR(255) NOT NULL,
    url_archivo TEXT NOT NULL,
    tamano_kb INTEGER NOT NULL,
    subido_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado VARCHAR(30) DEFAULT 'adjunto' NOT NULL
);

CREATE INDEX idx_docs_empresa_empresa ON documentos_empresa(id_empresa);

CREATE TABLE sedes_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    nombre_corto VARCHAR(50),
    departamento VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    correo VARCHAR(255),
    nombre_responsable VARCHAR(150),
    es_sede_principal BOOLEAN DEFAULT FALSE NOT NULL,
    estado VARCHAR(30) DEFAULT 'activa' NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_sedes_empresa_ciudad ON sedes_empresa(ciudad);
CREATE INDEX idx_sedes_empresa_empresa ON sedes_empresa(id_empresa);

CREATE TABLE areas_sede_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_sede UUID NOT NULL REFERENCES sedes_empresa(id) ON DELETE CASCADE,
    nombre_area VARCHAR(100) NOT NULL, -- 'Tecnología', 'Recursos Humanos', 'Operaciones', 'Finanzas'
    personal_asignado INTEGER DEFAULT 0 NOT NULL CHECK (personal_asignado >= 0)
);

CREATE TABLE reclutadores_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_empresa UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(150) NOT NULL,
    correo_corporativo VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    cargo VARCHAR(100) DEFAULT 'Especialista de Atracción de Talento',
    url_avatar TEXT,
    estado VARCHAR(30) DEFAULT 'active' NOT NULL, -- 'active', 'invited', 'suspended'
    ultimo_acceso_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_reclutadores_empresa ON reclutadores_empresa(id_empresa);

-- Asignación N:M Reclutadores a Sedes
CREATE TABLE asignacion_reclutadores_sedes (
    id_reclutador UUID NOT NULL REFERENCES reclutadores_empresa(id) ON DELETE CASCADE,
    id_sede UUID NOT NULL REFERENCES sedes_empresa(id) ON DELETE CASCADE,
    PRIMARY KEY (id_reclutador, id_sede)
);

-- Convenios Formales Empresa <-> IES
CREATE TABLE convenios_interinstitucionales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    id_institucion UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
    codigo_convenio VARCHAR(60) UNIQUE NOT NULL,
    modalidad modalidad_convenio_enum NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado estado_convenio_enum DEFAULT 'activo' NOT NULL,
    tasa_retencion NUMERIC(5,2) DEFAULT 0.00,
    puntuacion_satisfaccion NUMERIC(3,2) DEFAULT 0.00,
    url_documento_soporte TEXT,
    persona_contacto_ies VARCHAR(150),
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_convenios_estado ON convenios_interinstitucionales(estado);

-- Solicitudes de Vinculación y Convenios pendientes por validar por el Asesor IES
CREATE TABLE solicitudes_convenio_ies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    id_institucion UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
    tipo_convenio VARCHAR(60) NOT NULL,
    vacantes_proyectadas INTEGER DEFAULT 1 NOT NULL,
    duracion_anos INTEGER DEFAULT 1 NOT NULL,
    facultades_objetivo TEXT[],
    programas_objetivo TEXT[],
    estado VARCHAR(30) DEFAULT 'pendiente' NOT NULL, -- 'pendiente', 'en_revision', 'aprobada', 'rechazada'
    notas_evaluador TEXT,
    solicitado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revisado_en TIMESTAMPTZ
);

-- Bitácora de seguimiento / interacciones del Asesor IES con la Empresa
CREATE TABLE interacciones_seguimiento_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_convenio UUID NOT NULL REFERENCES convenios_interinstitucionales(id) ON DELETE CASCADE,
    id_asesor UUID NOT NULL REFERENCES asesores_ies(id) ON DELETE CASCADE,
    tipo_interaccion VARCHAR(60) NOT NULL, -- 'Reunión presencial', 'Llamada telefónica', 'Auditoría de prácticas'
    resumen_acuerdos TEXT NOT NULL,
    fecha_interaccion DATE NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- SECCIÓN 5: TALENTO, EGRESADOS, HOJAS DE VIDA Y COMPETENCIAS
-- ============================================================================

CREATE TABLE egresados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(10) NOT NULL, -- 'CC', 'CE', 'TI', 'PAS'
    numero_documento VARCHAR(30) UNIQUE NOT NULL,
    codigo_estudiantil VARCHAR(50),
    nombre_completo VARCHAR(150) NOT NULL,
    fecha_nacimiento DATE,
    ciudad_residencia VARCHAR(100) NOT NULL,
    departamento_residencia VARCHAR(100),
    telefono VARCHAR(50) NOT NULL,
    correo_personal VARCHAR(255) NOT NULL,
    url_avatar TEXT,
    url_portada TEXT,
    titular_profesional VARCHAR(255),
    biografia TEXT,
    disponible_para_trabajar BOOLEAN DEFAULT TRUE NOT NULL,
    visibilidad_disponibilidad VARCHAR(50) DEFAULT 'todos_los_reclutadores' NOT NULL,
    tipo_disponibilidad VARCHAR(50) DEFAULT 'inmediata',
    aspiracion_salarial_min NUMERIC(12,2),
    aspiracion_salarial_max NUMERIC(12,2),
    tipos_contrato_interes TEXT[],
    modalidades_interes TEXT[],
    dispuesto_a_reubicarse BOOLEAN DEFAULT FALSE NOT NULL,
    porcentaje_completitud_perfil INTEGER DEFAULT 0 NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_egresados_ciudad ON egresados(ciudad_residencia);
CREATE INDEX idx_egresados_disponible ON egresados(disponible_para_trabajar);

CREATE TRIGGER trg_egresados_actualizado
BEFORE UPDATE ON egresados
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo();

CREATE TABLE academicos_egresado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_egresado UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    id_institucion UUID NOT NULL REFERENCES instituciones(id) ON DELETE RESTRICT,
    id_programa UUID NOT NULL REFERENCES programas_academicos(id) ON DELETE RESTRICT,
    id_sede UUID REFERENCES sedes_institucion(id) ON DELETE SET NULL,
    nivel_formacion VARCHAR(60) NOT NULL,
    ano_graduacion INTEGER NOT NULL,
    periodo_graduacion VARCHAR(20), -- '2024-1'
    promedio_ponderado NUMERIC(3,2), -- Promedio acumulado (ej. 4.65)
    proyecto_grado TEXT,
    estado_academico VARCHAR(50) DEFAULT 'recien-egresado' NOT NULL, -- 'recien-egresado', 'practicante', 'experiencia'
    estado_laboral VARCHAR(50) DEFAULT 'buscando' NOT NULL, -- 'empleado', 'buscando', 'inactivo'
    validado_por_ies BOOLEAN DEFAULT TRUE NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_academicos_egresado_prog ON academicos_egresado(id_programa);

-- Registro de empleo actual para seguimiento y métricas de empleabilidad IES
CREATE TABLE registros_laborales_egresado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_academico UUID NOT NULL REFERENCES academicos_egresado(id) ON DELETE CASCADE,
    empresa_contratante VARCHAR(150) NOT NULL,
    cargo_desempenado VARCHAR(150) NOT NULL,
    tipo_contrato VARCHAR(60) NOT NULL,
    modalidad_trabajo VARCHAR(50) NOT NULL,
    rango_salarial VARCHAR(60),
    fecha_vinculacion DATE NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_postulacion UUID UNIQUE REFERENCES postulaciones(id) ON DELETE SET NULL -- contratación que originó el registro
);

CREATE TABLE competencias_egresado (
    id_egresado UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    id_competencia UUID NOT NULL REFERENCES taxonomia_competencias(id) ON DELETE CASCADE,
    nivel_dominio INTEGER CHECK (nivel_dominio BETWEEN 1 AND 5), -- 1=Básico, 5=Experto
    validada_por_pensum BOOLEAN DEFAULT FALSE NOT NULL,
    PRIMARY KEY (id_egresado, id_competencia)
);

CREATE TABLE idiomas_egresado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_egresado UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    nombre_idioma VARCHAR(60) NOT NULL,
    nivel_marco_europeo VARCHAR(20) NOT NULL -- 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Nativo'
);

CREATE TABLE experiencias_laborales_egresado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_egresado UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    empresa VARCHAR(150) NOT NULL,
    cargo VARCHAR(150) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    es_trabajo_actual BOOLEAN DEFAULT FALSE NOT NULL,
    descripcion_funciones TEXT
);

CREATE TABLE archivos_hoja_vida (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_egresado UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(255) NOT NULL,
    url_archivo TEXT NOT NULL,
    tamano_kb INTEGER NOT NULL,
    es_predeterminado BOOLEAN DEFAULT FALSE NOT NULL,
    subido_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE enlaces_egresado (
    id_egresado UUID PRIMARY KEY REFERENCES egresados(id) ON DELETE CASCADE,
    url_linkedin TEXT,
    url_github TEXT,
    url_portafolio TEXT
);

-- ============================================================================
-- SECCIÓN 6: VACANTES Y PUBLICACIÓN DE EMPLEO
-- ============================================================================

CREATE TABLE vacantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    id_sede UUID NOT NULL REFERENCES sedes_empresa(id) ON DELETE RESTRICT,
    id_reclutador_responsable UUID NOT NULL REFERENCES reclutadores_empresa(id) ON DELETE RESTRICT,
    codigo_vacante VARCHAR(50) UNIQUE NOT NULL, -- 'VAC-2026-001'
    titulo VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    modalidad modalidad_trabajo_enum NOT NULL,
    tipo_contrato VARCHAR(100) NOT NULL,
    nivel_experiencia VARCHAR(60) NOT NULL,
    salario_minimo NUMERIC(12,2),
    salario_maximo NUMERIC(12,2),
    salario_es_confidencial BOOLEAN DEFAULT FALSE NOT NULL,
    periodo_salario VARCHAR(20) DEFAULT 'Mensual' NOT NULL,
    jornada_laboral VARCHAR(100) NOT NULL,
    idiomas_requeridos TEXT[],
    cupos_disponibles INTEGER DEFAULT 1 NOT NULL CHECK (cupos_disponibles >= 1),
    total_postulantes INTEGER DEFAULT 0 NOT NULL,
    descripcion TEXT NOT NULL,
    responsabilidades TEXT[] NOT NULL,
    requisitos TEXT[] NOT NULL,
    beneficios TEXT[],
    estado estado_vacante_enum DEFAULT 'abierta' NOT NULL,
    publicado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_cierre DATE NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_vacantes_empresa ON vacantes(id_empresa);
CREATE INDEX idx_vacantes_sede ON vacantes(id_sede);
CREATE INDEX idx_vacantes_reclutador ON vacantes(id_reclutador_responsable);
CREATE INDEX idx_vacantes_estado ON vacantes(estado);
CREATE INDEX idx_vacantes_modalidad ON vacantes(modalidad);

CREATE TRIGGER trg_vacantes_actualizado
BEFORE UPDATE ON vacantes
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo();

CREATE TABLE competencias_exigidas_vacante (
    id_vacante UUID NOT NULL REFERENCES vacantes(id) ON DELETE CASCADE,
    id_competencia UUID NOT NULL REFERENCES taxonomia_competencias(id) ON DELETE CASCADE,
    es_obligatoria BOOLEAN DEFAULT TRUE NOT NULL, -- TRUE: Excluyente, FALSE: Deseable
    PRIMARY KEY (id_vacante, id_competencia)
);

CREATE TABLE programas_afines_vacante (
    id_vacante UUID NOT NULL REFERENCES vacantes(id) ON DELETE CASCADE,
    id_programa UUID NOT NULL REFERENCES programas_academicos(id) ON DELETE CASCADE,
    PRIMARY KEY (id_vacante, id_programa)
);

-- ============================================================================
-- SECCIÓN 7: EMBUDO ATS KANBAN, ENTREVISTAS Y BANCO DE TALENTO
-- ============================================================================

CREATE TABLE postulaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_vacante UUID NOT NULL REFERENCES vacantes(id) ON DELETE CASCADE,
    id_egresado UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    id_hoja_vida UUID REFERENCES archivos_hoja_vida(id) ON DELETE SET NULL,
    fase_actual fase_postulacion_enum DEFAULT 'en_revision' NOT NULL,
    porcentaje_afinidad NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
    retroalimentacion_reclutador TEXT,
    motivo_descarte VARCHAR(255),
    descartado_en TIMESTAMPTZ,
    postulado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_postulacion_vacante_egresado UNIQUE (id_vacante, id_egresado)
);

CREATE INDEX idx_postulaciones_vacante_fase ON postulaciones(id_vacante, fase_actual);
CREATE INDEX idx_postulaciones_egresado ON postulaciones(id_egresado);

CREATE TRIGGER trg_postulaciones_actualizado
BEFORE UPDATE ON postulaciones
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo();

CREATE TABLE historial_fases_postulacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_postulacion UUID NOT NULL REFERENCES postulaciones(id) ON DELETE CASCADE,
    fase_anterior fase_postulacion_enum,
    fase_nueva fase_postulacion_enum NOT NULL,
    cambiado_por_usuario UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    comentario TEXT,
    registrado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_historial_postulacion ON historial_fases_postulacion(id_postulacion);

CREATE TABLE notas_reclutador_postulacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_postulacion UUID NOT NULL REFERENCES postulaciones(id) ON DELETE CASCADE,
    id_reclutador UUID NOT NULL REFERENCES reclutadores_empresa(id) ON DELETE CASCADE,
    texto_nota TEXT NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE entrevistas_postulacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_postulacion UUID NOT NULL REFERENCES postulaciones(id) ON DELETE CASCADE,
    id_reclutador UUID NOT NULL REFERENCES reclutadores_empresa(id) ON DELETE CASCADE,
    fecha_entrevista DATE NOT NULL,
    franja_horaria VARCHAR(50) NOT NULL, -- '10:00 AM - 11:00 AM'
    modalidad VARCHAR(50) NOT NULL, -- 'Virtual', 'Presencial'
    url_reunion TEXT, -- Enlace Google Meet / Microsoft Teams o dirección física
    objetivo TEXT NOT NULL, -- 'Entrevista técnica sobre proyectos en React y SQL'
    estado estado_entrevista_enum DEFAULT 'programada' NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_entrevistas_fecha ON entrevistas_postulacion(fecha_entrevista);

-- Sourcing Proactivo: Favoritos guardados por reclutadores en el Banco de Talento IES
CREATE TABLE favoritos_banco_talento (
    id_reclutador UUID NOT NULL REFERENCES reclutadores_empresa(id) ON DELETE CASCADE,
    id_egresado UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    marcado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id_reclutador, id_egresado)
);

-- Invitaciones enviadas por reclutadores a egresados para postularse a una vacante
CREATE TABLE invitaciones_banco_talento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_reclutador UUID NOT NULL REFERENCES reclutadores_empresa(id) ON DELETE CASCADE,
    id_egresado UUID NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    id_vacante UUID NOT NULL REFERENCES vacantes(id) ON DELETE CASCADE,
    mensaje_personalizado TEXT NOT NULL,
    estado VARCHAR(30) DEFAULT 'enviada' NOT NULL, -- 'enviada', 'aceptada', 'rechazada'
    enviado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- SECCIÓN 8: AUDITORÍA DE SUPERADMIN, ACTIVIDAD Y MÉTRICAS PERIÓDICAS
-- ============================================================================

-- Bitácora de validaciones y observaciones de subsanación del Super Admin
CREATE TABLE auditorias_superadmin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_entidad VARCHAR(30) NOT NULL CHECK (tipo_entidad IN ('empresa', 'institucion')),
    id_entidad UUID NOT NULL,
    id_auditor UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    accion_realizada VARCHAR(60) NOT NULL, -- 'subsanacion_solicitada', 'aprobacion_oficial', 'rechazo'
    observaciones_correccion TEXT NOT NULL,
    registrado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_auditorias_entidad ON auditorias_superadmin(tipo_entidad, id_entidad);

-- Bitácora de actividad interna corporativa
CREATE TABLE bitacora_actividad_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empresa UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    id_usuario UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    tipo_evento VARCHAR(60) NOT NULL, -- 'creacion_vacante', 'cambio_fase_candidato', 'alta_sede'
    entidad_afectada VARCHAR(60) NOT NULL,
    id_registro_afectado UUID NOT NULL,
    descripcion TEXT NOT NULL,
    registrado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabla de instantáneas temporales para analítica periódica (PlatformPeriodicAnalytics.jsx)
CREATE TABLE instantaneas_metricas_periodicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave_periodo VARCHAR(30) UNIQUE NOT NULL, -- '2026-10', '2026-S1'
    tipo_periodo tipo_periodo_analitica_enum NOT NULL,
    etiqueta_periodo VARCHAR(60) NOT NULL, -- 'Octubre 2026', 'Semestre I 2026'
    etiqueta_corta VARCHAR(20) NOT NULL, -- 'Oct', '2026-I'
    semestre VARCHAR(20), -- '2026-II'
    trimestre VARCHAR(20), -- 'Q4'
    nuevas_empresas INTEGER DEFAULT 0 NOT NULL,
    empresas_acumuladas INTEGER DEFAULT 0 NOT NULL,
    nuevas_vacantes INTEGER DEFAULT 0 NOT NULL,
    vacantes_acumuladas INTEGER DEFAULT 0 NOT NULL,
    nuevas_instituciones INTEGER DEFAULT 0 NOT NULL,
    instituciones_acumuladas INTEGER DEFAULT 0 NOT NULL,
    nuevos_egresados INTEGER DEFAULT 0 NOT NULL,
    egresados_acumulados INTEGER DEFAULT 0 NOT NULL,
    total_postulaciones INTEGER DEFAULT 0 NOT NULL,
    tasa_crecimiento NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
    fecha_corte DATE NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_instantaneas_tipo_clave ON instantaneas_metricas_periodicas(tipo_periodo, clave_periodo);

-- ============================================================================
-- FIN DEL ESQUEMA DDL - PLATAFORMA VINCULA
-- ============================================================================
