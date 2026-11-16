// Sugerencias orientativas: el empleador decide qué habilidades exige realmente.
const SKILLS = {
  software: ['Git y control de versiones', 'Pruebas de software', 'SQL', 'APIs REST', 'JavaScript', 'Python', 'React', 'Docker'],
  data: ['Excel avanzado', 'Análisis de datos', 'SQL', 'Power BI', 'Visualización de datos', 'Python', 'Limpieza de datos', 'Indicadores de gestión'],
  healthcare: ['Atención al paciente', 'Historias clínicas', 'Protocolos de bioseguridad', 'Primeros auxilios', 'Seguridad del paciente', 'Valoración clínica', 'Educación al paciente', 'Registro asistencial'],
  education: ['Planeación curricular', 'Evaluación del aprendizaje', 'Diseño de material didáctico', 'Gestión de aula', 'Herramientas educativas', 'Inclusión educativa', 'Aprendizaje basado en proyectos', 'Seguimiento académico'],
  legal: ['Redacción jurídica', 'Análisis normativo', 'Gestión contractual', 'Investigación jurídica', 'Protección de datos', 'Trámites administrativos', 'Gestión documental', 'Cumplimiento normativo'],
  finance: ['Excel avanzado', 'Conciliación bancaria', 'Estados financieros', 'Facturación electrónica', 'Normas NIIF', 'Declaraciones tributarias', 'Manejo de ERP', 'Presupuestos'],
  hr: ['Selección de personal', 'Entrevistas por competencias', 'Nómina', 'Legislación laboral', 'Gestión de desempeño', 'Seguridad social', 'Capacitación', 'Indicadores de talento humano'],
  construction: ['Lectura de planos', 'AutoCAD', 'Presupuestos de obra', 'Control de obra', 'Normas de construcción', 'Revit', 'Topografía', 'Seguridad en obra'],
  design: ['Diseño gráfico', 'Identidad visual', 'Adobe Illustrator', 'Photoshop', 'Figma', 'Diseño editorial', 'Edición de imagen', 'Preparación de piezas digitales'],
  maintenance: ['Mantenimiento preventivo', 'Diagnóstico de fallas', 'Lectura de planos', 'Seguridad industrial', 'Instrumentación', 'Mantenimiento correctivo', 'Control de calidad', 'Manejo de equipos'],
  logistics: ['Control de inventarios', 'Gestión de almacén', 'Despachos', 'Trazabilidad de pedidos', 'Excel', 'Rutas de distribución', 'Manejo de ERP', 'Indicadores logísticos'],
  environment: ['Gestión ambiental', 'Manejo de residuos', 'Normatividad ambiental', 'Evaluación de riesgos', 'Planes de manejo', 'Auditorías ambientales', 'Indicadores de sostenibilidad', 'Educación ambiental'],
  safety: ['Normatividad SST', 'Identificación de peligros', 'Investigación de incidentes', 'Matriz de riesgos', 'Inspecciones de seguridad', 'Planes de emergencia', 'Capacitaciones SST', 'Gestión documental SG-SST'],
  commercial: ['Atención al cliente', 'Gestión de ventas', 'CRM', 'Negociación comercial', 'Servicio posventa', 'Elaboración de propuestas', 'Análisis de mercado', 'Seguimiento de clientes'],
  administrative: ['Gestión documental', 'Excel', 'Elaboración de informes', 'Archivo y correspondencia', 'Atención al usuario', 'Organización de agendas', 'Manejo de ERP', 'Control de procesos'],
  agriculture: ['Buenas prácticas agrícolas', 'Control de calidad', 'Manejo de cultivos', 'Seguridad alimentaria', 'Trazabilidad de producción', 'Manejo de maquinaria', 'Gestión de insumos', 'Normatividad agropecuaria'],
  quality: ['Control de calidad', 'Gestión de procesos', 'Indicadores de calidad', 'Auditorías internas', 'Acciones correctivas', 'Normas ISO', 'Mejora continua', 'Documentación de procesos'],
  procurement: ['Gestión de proveedores', 'Órdenes de compra', 'Negociación', 'Control de inventarios', 'Análisis de costos', 'Abastecimiento', 'Manejo de ERP', 'Evaluación de proveedores'],
  marketing: ['Investigación de mercados', 'Gestión de campañas', 'Redacción de contenidos', 'Analítica digital', 'Redes sociales', 'SEO', 'Diseño de piezas', 'Métricas de conversión'],
};

const TITLE_RULES = [
  { key: 'healthcare', pattern: /enferm|medic[oa]|fisioterap|odontolog|nutricion|salud|laboratorio clinico|auxiliar clinico/ },
  { key: 'education', pattern: /docen|profesor|maestr[oa]|pedagog|instructor|formador/ },
  { key: 'legal', pattern: /abogad|juridic|derecho|paralegal/ },
  { key: 'hr', pattern: /talento humano|recursos humanos|rr\.?\s?hh|reclutamiento|seleccion de personal/ },
  { key: 'finance', pattern: /contad|tributari|tesorer|nomina|financier|cartera|revisor fiscal|auditor contable/ },
  { key: 'construction', pattern: /arquitect|ingenier[oa] civil|construccion|topograf|residente de obra/ },
  { key: 'design', pattern: /disenador|diseno grafico|ilustrador|creativo visual|diseno ux|diseno ui/ },
  { key: 'safety', pattern: /seguridad y salud|seguridad laboral|\bsst\b|hseq|prevencion de riesgos/ },
  { key: 'environment', pattern: /ambiental|sostenibilidad|recursos naturales|gestion de residuos/ },
  { key: 'agriculture', pattern: /agronom|agropecuari|agricol|produccion de alimentos/ },
  { key: 'quality', pattern: /calidad|mejora continua|auditor de procesos/ },
  { key: 'procurement', pattern: /compras|adquisiciones|proveedor|abastecimiento/ },
  { key: 'marketing', pattern: /marketing|mercadeo|publicidad|comunicacion digital|community manager/ },
  { key: 'logistics', pattern: /logistic|inventari|almacen|bodega|cadena de suministro|abastecimiento|distribucion/ },
  { key: 'maintenance', pattern: /mantenimiento|electromecan|electric|mecanic|ingenier[oa] industrial|produccion industrial/ },
  { key: 'commercial', pattern: /comercial|vendedor|ventas|servicio al cliente|asesor de servicio/ },
  { key: 'administrative', pattern: /administrativ|secretari|asistente de gerencia|gestion empresarial/ },
  { key: 'data', pattern: /analista de datos|cientific[oa] de datos|inteligencia de negocios|analitica|business intelligence|\bbi\b/ },
  { key: 'software', pattern: /software|sistemas|desarrollador|programador|frontend|backend|full.?stack|devops|ciberseguridad/ },
];

const CATEGORY_SKILLS = {
  'Tecnología y datos': 'data',
  'Operación y mantenimiento': 'maintenance',
  'Logística': 'logistics',
  'Sostenibilidad y seguridad': 'environment',
  'Finanzas y administración': 'finance',
  'Comercial y servicio': 'commercial',
  'Salud y bienestar': 'healthcare',
  'Educación y formación': 'education',
  'Diseño y construcción': 'construction',
  'Talento humano': 'hr',
  'Legal y cumplimiento': 'legal',
  'Agroindustria y producción': 'agriculture',
  'Administración y finanzas': 'administrative',
  'Calidad y mejora continua': 'quality',
  'Comercial, ventas y servicio al cliente': 'commercial',
  'Compras y cadena de suministro': 'procurement',
  'Contabilidad y auditoría': 'finance',
  'Diseño, arquitectura y arte': 'design',
  'Educación, docencia e investigación': 'education',
  'Ingeniería y construcción': 'construction',
  'Jurídica y cumplimiento': 'legal',
  'Logística y transporte': 'logistics',
  'Marketing y comunicaciones': 'marketing',
  'Operación, producción y mantenimiento': 'maintenance',
  'Sostenibilidad, medio ambiente y SST': 'environment',
  'Talento humano y bienestar laboral': 'hr',
  'Tecnología, sistemas y datos': 'data',
};

export function suggestTechnicalSkills(title = '', category = '') {
  const normalizedTitle = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const matched = TITLE_RULES.find(({ pattern }) => pattern.test(normalizedTitle));
  const key = matched?.key || CATEGORY_SKILLS[category];
  return {
    suggestions: key ? SKILLS[key] : [],
    source: matched ? 'cargo' : key ? 'área' : null,
  };
}
