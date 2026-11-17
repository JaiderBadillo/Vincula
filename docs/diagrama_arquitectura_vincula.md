# Arquitectura de Software — Plataforma Vincula

**Vincula** implementa una arquitectura de **Monolito Modular Híbrido Asíncrono** dividida en cuatro niveles desacoplados:

1. **Capa de Presentación (Frontend SPA):** React 18, Vite 8, React Router v7 y Tailwind CSS v4 (desplegada en Vercel).
2. **Capa de Aplicación (Backend API):** FastAPI, Uvicorn ASGI y SQLAlchemy 2.0 Async con Gating de Cuarentena y 7 dominios modulares bajo `/api/v1` (desplegada en Render).
3. **Capa de Persistencia:** PostgreSQL 15+, extensión vectorial `pgvector` y buckets privados en Supabase Storage.
4. **Capa de Procesamiento e Integraciones:** Google Gemini API, Google OAuth 2.0, Motor OCR/PDF local (PyPDF + RapidOCR + ReportLab) y correo transaccional vía Brevo API HTTPS.

---

## 1. Vista General de Capas e Infraestructura

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 50, 'rankSpacing': 70, 'padding': 16}}}%%
flowchart TD
    subgraph CAPA_USUARIOS["1. Roles del Sistema"]
        U_EGR["Egresado"]
        U_IES["Asesor y Admin IES"]
        U_EMP["Reclutador y Admin Empresa"]
        U_ADM["Superadministrador Vincula"]
    end

    subgraph CAPA_FRONTEND["2. Frontend SPA - Vercel CDN"]
        FE_APP["React 18 + Vite 8 + Tailwind CSS v4"]
        FE_ROUTES["React Router v7 + Control de Acceso por Rol"]
        FE_CLIENT["Cliente HTTP REST + Inyeccion JWT Bearer"]
    end

    subgraph CAPA_BACKEND["3. Backend API - Render ASGI"]
        BE_MW["Middleware CORS + Cabeceras de Seguridad HTTP"]
        BE_AUTH["Seguridad JWT HS256 + Gating de Cuarentena"]
        BE_MODS["7 Modulos de Dominio bajo /api/v1"]
        BE_ORM["SQLAlchemy 2.0 AsyncEngine + Pool asyncpg"]
    end

    subgraph CAPA_DATOS["4. Persistencia - Supabase Cloud"]
        DB_REL[("PostgreSQL Relacional")]
        DB_VEC[("Extension pgvector")]
        DB_STO[("Supabase Storage PDF")]
    end

    subgraph CAPA_EXT["5. Servicios e Integraciones"]
        EXT_GEM["Google Gemini API"]
        EXT_OCR["Motor OCR y PDF Local"]
        EXT_SSO["Google OAuth 2.0"]
        EXT_MAIL["Brevo API HTTPS - Correo Transaccional"]
    end

    U_EGR --> FE_APP
    U_IES --> FE_APP
    U_EMP --> FE_APP
    U_ADM --> FE_APP

    FE_APP --> FE_ROUTES
    FE_ROUTES --> FE_CLIENT
    FE_CLIENT -->|HTTPS JSON| BE_MW

    BE_MW --> BE_AUTH
    BE_AUTH --> BE_MODS
    BE_MODS --> BE_ORM

    BE_ORM --> DB_REL
    BE_MODS --> DB_VEC
    BE_MODS --> DB_STO

    BE_MODS --> EXT_GEM
    BE_MODS --> EXT_OCR
    BE_AUTH --> EXT_SSO
    BE_MODS --> EXT_MAIL
```

---

## 2. Arquitectura Interna del Backend (7 Dominios Modulares)

Cada dominio en `backend/app/modules` encapsula sus propios archivos `router.py`, `services.py`, `schemas.py` y `models.py`.

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 40, 'rankSpacing': 80, 'padding': 16}}}%%
flowchart LR
    MAIN["app/main.py - FastAPI"]

    subgraph MODULOS["Dominios de Negocio (/api/v1)"]
        M1["1. iam (/api/v1/auth)"]
        M2["2. superadmin (/api/v1/admin)"]
        M3["3. companies (/api/v1/empresas)"]
        M4["4. institutions (/api/v1/instituciones)"]
        M5["5. graduates (/api/v1/egresados)"]
        M6["6. vacancies_ats (/api/v1/vacantes)"]
        M7["7. ai_engine (/api/v1/ia)"]
    end

    subgraph CORE["Nucleo Transversal (app/core)"]
        C_CFG["config.py - Variables de Entorno"]
        C_SEC["security.py - JWT y Roles"]
        C_DB["database.py - Sesion Asincrona"]
    end

    subgraph INTEG["Adaptadores (app/integrations)"]
        I_STO["supabase_storage.py - Storage y URLs Firmadas"]
        I_NOT["transactional_notifications.py - Brevo HTTPS"]
    end

    MAIN --> M1
    MAIN --> M2
    MAIN --> M3
    MAIN --> M4
    MAIN --> M5
    MAIN --> M6
    MAIN --> M7

    M1 --> CORE
    M2 --> CORE
    M3 --> CORE
    M4 --> CORE
    M5 --> CORE
    M6 --> CORE
    M7 --> CORE

    M1 --> INTEG
    M2 --> INTEG
    M3 --> INTEG
    M4 --> INTEG
    M5 --> INTEG
    M6 --> INTEG
```

### Responsabilidad de cada módulo

| Módulo | Prefijo API | Responsabilidad Principal |
| :--- | :--- | :--- |
| **1. `iam`** | `/api/v1/auth` | Autenticación JWT, login con Google OAuth 2.0, registro multirrol, sesiones y recuperación de contraseña. |
| **2. `superadmin`** | `/api/v1/admin` | Auditoría legal de 72h, aprobación o subsanación de empresas e instituciones y analítica global. |
| **3. `companies`** | `/api/v1/empresas` | Perfil corporativo, sedes, equipo de reclutadores, convenios con IES y bitácora de actividad. |
| **4. `institutions`** | `/api/v1/instituciones` | Sedes IES, facultades, programas SNIES, extracción OCR de pensums y validación de diplomas con Sello Digital SHA-256. |
| **5. `graduates`** | `/api/v1/egresados` | Hoja de vida integral, soporte de diploma PDF, idiomas, experiencia, privacidad y seguimiento de postulaciones. |
| **6. `vacancies_ats`** | `/api/v1/vacantes` y `/api/v1/reclutador` | Publicación de vacantes con Gating de Cuarentena, tablero ATS Kanban de 6 fases, entrevistas y visor de diplomas para reclutadores. |
| **7. `ai_engine`** | `/api/v1/ia` | Recomendación híbrida de vacantes (TF-IDF + competencias), asistente de carrera con RAG y trazabilidad curricular frente al mercado laboral. |

---

## 3. Flujo de Seguridad, Validación Académica y Selección ATS

```mermaid
sequenceDiagram
    autonumber
    participant EMP as Empresa / Reclutador
    participant ADM as Superadmin / IES
    participant API as Backend FastAPI
    participant DB as PostgreSQL + Storage
    participant AI as Motor IA
    participant EGR as Egresado

    EMP->>API: Registra empresa y adjunta documentos legales (PDF)
    API->>DB: Guarda empresa en estado en_cuarentena
    ADM->>API: Audita soportes y aprueba empresa
    API->>DB: Actualiza empresa a estado aprobado

    EGR->>API: Registra perfil y sube diploma en PDF
    API->>DB: Almacena diploma en bucket vincula-diplomas-validados
    ADM->>API: Asesor IES verifica acta/folio y aprueba diploma
    API->>DB: Genera Sello Digital SHA-256 y marca titulo verificado

    EGR->>API: Solicita vacantes recomendadas (/api/v1/ia/recomendaciones/vacantes)
    API->>AI: Calcula afinidad entre perfil, programa y vacantes abiertas
    AI-->>EGR: Retorna vacantes ordenadas por afinidad y fecha de cierre

    EGR->>API: Se postula a vacante abierta
    API->>DB: Crea postulacion en fase en_revision
    EMP->>API: Consulta tablero ATS Kanban y solicita URL firmada del diploma
    API-->>EMP: Entrega ficha del candidato, Sello Digital y visor PDF del diploma
    EMP->>API: Avanza candidato por las fases del embudo ATS
    API-->>EGR: Envia notificacion por correo via Brevo API HTTPS
```
