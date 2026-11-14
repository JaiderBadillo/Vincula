"""
Taxonomía Determinista de Habilidades y Familias Tecnológicas
Costo de tokens: $0.00.
Basado en estándares abiertos de clasificación académica y laboral (CNO Colombia / ESCO).
"""

import re
import unicodedata

def normalize_text(text: str) -> str:
    """
    Elimina tildes, diacríticos y convierte a minúsculas para comparaciones robustas.
    """
    if not text:
        return ""
    nfkd = unicodedata.normalize('NFD', text)
    return ''.join(c for c in nfkd if unicodedata.category(c) != 'Mn').lower().strip()

# Diccionario de familias de conocimiento y equivalencias técnicas
KNOWLEDGE_FAMILIES = {
    "sql_relational": {
        "name": "Bases de Datos Relacionales (SQL)",
        "canonical_skills": ["SQL", "Modelado de Datos", "Bases de Datos Relacionales", "Normalización"],
        "tools": ["MySQL", "PostgreSQL", "Oracle Database", "SQL Server", "MariaDB", "SQLite"],
        "equivalence_group": "database_relational",
    },
    "nosql": {
        "name": "Bases de Datos NoSQL y Documentales",
        "canonical_skills": ["NoSQL", "Bases de Datos Orientadas a Documentos", "Bases de Datos Clave-Valor"],
        "tools": ["MongoDB", "Redis", "Cassandra", "DynamoDB", "Firebase Firestore"],
        "equivalence_group": "database_nosql",
    },
    "frontend_web": {
        "name": "Desarrollo Frontend Web",
        "canonical_skills": ["Desarrollo Web", "HTML/CSS", "JavaScript", "Diseño Responsivo", "APIs REST"],
        "tools": ["React", "Vue.js", "Angular", "TailwindCSS", "Bootstrap", "TypeScript"],
        "equivalence_group": "web_development",
    },
    "backend_web": {
        "name": "Desarrollo Backend y APIs",
        "canonical_skills": ["Programación Backend", "APIs REST", "Arquitectura de Software", "Microservicios"],
        "tools": ["Node.js", "Python", "FastAPI", "Django", "Java Spring Boot", "Express", ".NET Core"],
        "equivalence_group": "web_development",
    },
    "mobile_dev": {
        "name": "Desarrollo de Aplicaciones Móviles",
        "canonical_skills": ["Desarrollo Móvil", "Android", "iOS", "Flutter", "React Native"],
        "tools": ["Flutter", "React Native", "Kotlin", "Swift", "Android Studio"],
        "equivalence_group": "mobile_apps",
    },
    "devops_cloud": {
        "name": "DevOps, Cloud y Contenedores",
        "canonical_skills": ["Contenedores", "Integración Continua (CI/CD)", "Computación en la Nube"],
        "tools": ["Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "GitHub Actions", "Linux", "Git", "GitHub"],
        "equivalence_group": "devops_infrastructure",
    },
    "networking": {
        "name": "Redes, Comunicaciones y Telecomunicaciones",
        "canonical_skills": ["Redes", "TCP/IP", "Enrutamiento", "Protocolos de Red", "Seguridad en Redes"],
        "tools": ["Cisco Packet Tracer", "Wireshark", "MikroTik", "Linux Server", "VPN"],
        "equivalence_group": "networking_infrastructure",
    },
    "cybersecurity": {
        "name": "Seguridad Informática y Ciberseguridad",
        "canonical_skills": ["Ciberseguridad", "Seguridad de la Información", "Análisis de Vulnerabilidades", "Criptografía"],
        "tools": ["Kali Linux", "OWASP", "Burp Suite", "Metasploit", "ISO 27001"],
        "equivalence_group": "security",
    },
    "data_analytics": {
        "name": "Analítica de Datos e Inteligencia de Negocios",
        "canonical_skills": ["Analítica de Datos", "Visualización de Datos", "Business Intelligence", "Estadística Aplicada"],
        "tools": ["Power BI", "Tableau", "Excel Avanzado", "Pandas", "Python", "R", "DAX"],
        "equivalence_group": "analytics_bi",
    },
    "accounting_erp": {
        "name": "Contabilidad, Nómina y Sistemas ERP",
        "canonical_skills": [
            "Contabilidad General",
            "Normas NIIF / IFRS",
            "Liquidación de Nómina y Seguridad Social",
            "Declaración Tributaria y Retención",
            "Costos y Presupuestos",
            "Auditoría y Control Interno",
            "Análisis Financiero"
        ],
        "tools": ["Siigo", "SAP FI/CO", "World Office", "Helisa", "SIESA", "Novasoft", "Excel Financiero", "Muisca (DIAN)"],
        "equivalence_group": "accounting_software",
    },
    "business_admin": {
        "name": "Administración y Gestión Empresarial",
        "canonical_skills": [
            "Gestión Estratégica",
            "Gestión del Talento Humano",
            "Procesos Administrativos y Calidad",
            "Modelos de Negocio",
            "Legislación Laboral",
            "Clima Organizacional"
        ],
        "tools": ["Excel Avanzado", "SAP ERP", "Power BI Empresarial", "Bizagi (BPMN)", "Modelo Canvas", "Asana", "Trello"],
        "equivalence_group": "business_management",
    },
    "logistics_supply": {
        "name": "Logística, Cadena de Suministro y Comercio Exterior",
        "canonical_skills": [
            "Gestión de Inventarios",
            "Cadena de Suministro (Supply Chain)",
            "Logística y Distribución",
            "Comercio Internacional",
            "Régimen Aduanero e Incoterms"
        ],
        "tools": ["SAP Logística", "WMS", "Excel Logístico", "VUCE", "Control de Calidad ISO 9001"],
        "equivalence_group": "logistics_operations",
    },
    "project_management": {
        "name": "Gestión de Proyectos y Metodologías Ágiles",
        "canonical_skills": ["Gestión de Proyectos", "Metodologías Ágiles", "Liderazgo de Equipos", "Planificación Estratégica"],
        "tools": ["Scrum", "Jira", "Trello", "Asana", "MS Project", "Kanban"],
        "equivalence_group": "management",
    },
    "digital_marketing": {
        "name": "Marketing Digital y Gestión Comercial",
        "canonical_skills": ["Marketing Digital", "Gestión Comercial", "Investigación de Mercados", "Atención al Cliente", "E-commerce"],
        "tools": ["Google Analytics", "HubSpot CRM", "Meta Ads", "SEO/SEM", "Mailchimp", "Shopify"],
        "equivalence_group": "marketing_crm",
    },
    "environmental_hseq": {
        "name": "Gestión Ambiental, Sostenibilidad y SST",
        "canonical_skills": [
            "Gestión Ambiental",
            "Seguridad y Salud en el Trabajo (SST)",
            "Norma ISO 14001",
            "Evaluación de Impacto Ambiental",
            "Manejo Integral de Residuos"
        ],
        "tools": ["Matriz HSEQ", "ArcGIS Ambiental", "QGIS", "SG-SST (Dec. 1072)", "AutoCAD"],
        "equivalence_group": "environmental_hseq",
    },
    "industrial_electronics": {
        "name": "Electrónica, Automatización e Instrumentación",
        "canonical_skills": ["Circuitos Eléctricos", "Automatización Industrial", "Instrumentación", "Microcontroladores"],
        "tools": ["PLC", "Arduino", "ESP32", "MATLAB", "Proteus", "LabVIEW", "IoT"],
        "equivalence_group": "electronics_automation",
    },
    "cad_civil": {
        "name": "Diseño CAD, Topografía y Modelado Estructural",
        "canonical_skills": ["Topografía", "Dibujo Técnico", "Sistemas de Información Geográfica (SIG)", "Cálculo Estructural"],
        "tools": ["AutoCAD", "Revit", "Civil 3D", "ArcGIS", "QGIS", "CYPECAD"],
        "equivalence_group": "civil_design",
    },
}

# Reglas de mapeo por palabras clave presentes en el nombre formal de la asignatura
SUBJECT_KEYWORD_RULES = [
    # Sistemas / Computación
    (["base de datos", "bases de datos", "motores de base", "b.d.", "gestor de base"], "sql_relational"),
    (["programacion web", "desarrollo web", "frontend", "front-end", "diseño web"], "frontend_web"),
    (["full stack", "fullstack", "desarrollo full stack"], "backend_web"),
    (["backend", "servicios web", "apis", "arquitectura de software", "ingenieria de software", "software"], "backend_web"),
    (["movil", "moviles", "aplicaciones moviles", "android", "flutter", "ios"], "mobile_dev"),
    (["redes", "comunicaciones", "telematica", "enrutamiento", "conectividad", "telecomunicaciones"], "networking"),
    (["seguridad informatica", "ciberseguridad", "criptografia", "seguridad en redes", "seguridad en los sistemas"], "cybersecurity"),
    (["devops", "cloud", "computacion en la nube", "sistemas distribuidos", "infraestructura tecnologica"], "devops_cloud"),
    (["inteligencia de negocios", "business intelligence", "analitica", "mineria de datos", "big data", "ciencia de datos", "inteligencia artificial", "aprendizaje automatico", "machine learning", "estadistica"], "data_analytics"),
    (["algoritmos", "fundamentos de programacion", "lenguajes de programacion", "programacion orientada", "estructura de datos", "programacion"], "backend_web"),
    (["internet de las cosas", "iot", "sistemas embebidos", "sistemas digitales"], "industrial_electronics"),
    
    # Contaduría y Finanzas
    (["contabilidad", "contable", "costos", "presupuestos", "tributaria", "impuestos", "nomina", "seguridad social", "auditoria", "revisoria fiscal", "estados financieros", "niif", "ifrs", "finanzas", "financiero", "analisis financiero", "conciliaciones"], "accounting_erp"),

    # Administración de Empresas y Gestión del Talento
    (["administracion", "gestion empresarial", "talento humano", "recursos humanos", "gestion humana", "planeacion estrategica", "gestion estrategica", "procesos administrativos", "organizacion", "legislacion laboral", "derecho comercial", "emprendimiento", "cultura organizacional", "modelos de negocio", "canvas", "calidad", "gestion por procesos"], "business_admin"),

    # Logística y Operaciones
    (["logistica", "cadena de suministro", "supply chain", "inventarios", "almacenamiento", "almacenes", "distribucion fisica", "compras", "comercio exterior", "comercio internacional", "aduanas", "incoterms", "operaciones", "produccion"], "logistics_supply"),

    # Gestión de Proyectos
    (["proyectos", "formulacion de proyectos", "evaluacion de proyectos", "administracion de proyectos", "pmi", "scrum", "agiles"], "project_management"),

    # Marketing y Ventas
    (["marketing", "mercadeo", "investigacion de mercados", "publicidad", "ventas", "comercial", "comportamiento del consumidor", "e-commerce", "comercio electronico", "redes sociales", "crm", "fidelizacion", "canales de distribucion"], "digital_marketing"),

    # Ambiental y SST
    (["ambiental", "recursos ambientales", "recursos naturales", "impacto ambiental", "residuos", "higiene y seguridad", "seguridad y salud en el trabajo", "sst", "hseq", "ecologia", "desarrollo sostenible", "sostenibilidad"], "environmental_hseq"),
    
    # Electrónica / Automatización
    (["circuitos", "electronica analoga", "electronica digital", "microcontroladores"], "industrial_electronics"),
    (["automatizacion", "controladores logicos", "plc", "instrumentacion", "robotica", "iot"], "industrial_electronics"),
    
    # Topografía / Civil
    (["topografia", "fotogrametria", "geomática", "sig", "sistemas de informacion geografica"], "cad_civil"),
    (["dibujo asistido", "cad", "autocad", "modelado bim", "estructuras"], "cad_civil"),
]


def contains_term(term: str, text: str) -> bool:
    """True si `term` aparece como palabra(s) completa(s) en `text` (ambos ya normalizados). Admite plural."""
    return bool(term) and re.search(rf"(?<![a-z0-9]){re.escape(term)}(?:e?s)?(?![a-z0-9])", text) is not None


def families_for_text(text: str) -> list:
    """
    Claves de las familias de conocimiento cuyo vocabulario aparece en el texto.
    Por palabra completa: "ios" no debe activarse con "negocios" ni "cad" con "mercadeo".
    """
    clean = normalize_text(text)
    hits = [(normalize_text(kw), fam) for kws, fam in SUBJECT_KEYWORD_RULES for kw in kws
            if contains_term(normalize_text(kw), clean)]
    families = []
    for kw, fam in hits:
        # "redes" dentro de "redes sociales": manda la coincidencia más larga
        if fam not in families and not any(kw != other and kw in other for other, _ in hits):
            families.append(fam)
    return families


def match_subject_to_skills(subject_name: str) -> dict:
    """
    Recibe el nombre formal de una asignatura y retorna sus habilidades y herramientas canónicas.
    Costo: 0 tokens (operación puramente determinista O(N)).
    """
    matched_families = families_for_text(subject_name)

    if not matched_families:
        # Fallback genérico para materias formativas / institucionales
        return {
            "family_name": "Formación General e Institucional",
            "skills": [subject_name.strip()],
            "tools": [],
            "equivalence_group": "general",
        }
        
    primary_family = KNOWLEDGE_FAMILIES[matched_families[0]]
    all_skills = []
    all_tools = []
    
    for fam_key in matched_families:
        fam = KNOWLEDGE_FAMILIES[fam_key]
        all_skills.extend(fam["canonical_skills"])
        all_tools.extend(fam["tools"])
        
    # Eliminar duplicados preservando orden
    unique_skills = list(dict.fromkeys(all_skills))
    unique_tools = list(dict.fromkeys(all_tools))
    
    return {
        "family_name": primary_family["name"],
        "skills": unique_skills,
        "tools": unique_tools,
        "equivalence_group": primary_family["equivalence_group"],
    }


def find_tool_equivalence(tool_a: str, tool_b: str) -> bool:
    """
    Determina si dos herramientas pertenecen a la misma familia de equivalencia.
    Ej: MySQL y PostgreSQL -> True (ambas son bases de datos relacionales SQL).
    """
    a_lower = tool_a.lower().strip()
    b_lower = tool_b.lower().strip()
    
    if a_lower == b_lower:
        return True
        
    for fam in KNOWLEDGE_FAMILIES.values():
        tools_lower = [t.lower() for t in fam["tools"]]
        if a_lower in tools_lower and b_lower in tools_lower:
            return True
            
    return False
