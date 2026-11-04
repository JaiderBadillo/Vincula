// Datos maestros de Pensums y Demanda de Vacantes para Trazabilidad Curricular

const sistemasPensum = {
  id: 'prog-01',
  programCode: 'SNIES 10452',
  programName: 'Ingeniería de Sistemas',
  faculty: 'Facultad de Ciencias Naturales e Ingenierías',
  version: 'Pensum 2024 (Aprobado MEN)',
  lastUpdated: '15 de Agosto de 2024',
  totalSemesters: 10,
  totalCredits: 160,
  semesters: [
    {
      semesterNumber: 1,
      label: 'Semestre I',
      subjects: [
        { id: 'sis-101', code: 'SIS-101', name: 'Fundamentos de Programación y Lógica', credits: 3, family: 'Desarrollo Backend y APIs', tools: ['Python', 'Lógica de Algoritmos'] },
        { id: 'mat-102', code: 'MAT-102', name: 'Cálculo Diferencial', credits: 4, family: 'Formación General e Institucional', tools: ['GeoGebra'] },
        { id: 'hum-103', code: 'HUM-103', name: 'Comunicación y Competencias Lectoras', credits: 2, family: 'Formación General e Institucional', tools: [] },
        { id: 'fis-104', code: 'FIS-104', name: 'Física Mecánica', credits: 3, family: 'Formación General e Institucional', tools: [] },
      ],
    },
    {
      semesterNumber: 2,
      label: 'Semestre II',
      subjects: [
        { id: 'sis-201', code: 'SIS-201', name: 'Programación Orientada a Objetos', credits: 4, family: 'Desarrollo Backend y APIs', tools: ['Java', 'Git'] },
        { id: 'mat-202', code: 'MAT-202', name: 'Álgebra Lineal', credits: 3, family: 'Formación General e Institucional', tools: [] },
        { id: 'mat-203', code: 'MAT-203', name: 'Cálculo Integral', credits: 4, family: 'Formación General e Institucional', tools: [] },
        { id: 'ing-204', code: 'ING-204', name: 'Inglés Técnico I', credits: 2, family: 'Formación General e Institucional', tools: ['Inglés A2'] },
      ],
    },
    {
      semesterNumber: 5,
      label: 'Semestre V',
      subjects: [
        { id: 'sis-501', code: 'SIS-501', name: 'Motores de Bases de Datos', credits: 3, family: 'Bases de Datos Relacionales (SQL)', tools: ['MySQL', 'SQL', 'Workbench', 'Normalización'] },
        { id: 'sis-502', code: 'SIS-502', name: 'Estructuras de Datos y Algoritmos', credits: 4, family: 'Desarrollo Backend y APIs', tools: ['Java', 'C++', 'Algoritmos'] },
        { id: 'sis-503', code: 'SIS-503', name: 'Redes de Computadores I', credits: 3, family: 'Redes, Comunicaciones y Telecomunicaciones', tools: ['Cisco Packet Tracer', 'TCP/IP', 'Wireshark'] },
        { id: 'mat-504', code: 'MAT-504', name: 'Estadística y Probabilidades', credits: 3, family: 'Formación General e Institucional', tools: ['R'] },
      ],
    },
    {
      semesterNumber: 6,
      label: 'Semestre VI',
      subjects: [
        { id: 'sis-601', code: 'SIS-601', name: 'Programación Web y Servicios REST', credits: 4, family: 'Desarrollo Frontend Web', tools: ['JavaScript', 'HTML/CSS', 'APIs REST', 'Node.js'] },
        { id: 'sis-602', code: 'SIS-602', name: 'Arquitectura y Patrones de Software', credits: 3, family: 'Desarrollo Backend y APIs', tools: ['Microservicios', 'Clean Architecture', 'UML'] },
        { id: 'sis-603', code: 'SIS-603', name: 'Seguridad Informática y Criptografía', credits: 3, family: 'Seguridad Informática y Ciberseguridad', tools: ['Criptografía', 'OWASP'] },
        { id: 'adm-604', code: 'ADM-604', name: 'Formulación y Gestión de Proyectos', credits: 3, family: 'Gestión de Proyectos y Metodologías Ágiles', tools: ['Scrum', 'Jira'] },
      ],
    },
  ],
  vacanciesDemand: [
    { skill: 'JavaScript', vacanciesCount: 58, category: 'frontend' },
    { skill: 'SQL', vacanciesCount: 51, category: 'database' },
    { skill: 'Python', vacanciesCount: 44, category: 'backend' },
    { skill: 'Git', vacanciesCount: 39, category: 'tools' },
    { skill: 'APIs REST', vacanciesCount: 33, category: 'backend' },
    { skill: 'PostgreSQL', vacanciesCount: 35, category: 'database' },
    { skill: 'Docker', vacanciesCount: 31, category: 'devops' },
    { skill: 'AWS', vacanciesCount: 24, category: 'cloud' },
    { skill: 'Power BI', vacanciesCount: 22, category: 'bi' },
    { skill: 'React', vacanciesCount: 28, category: 'frontend' },
  ],
};

const electronicaPensum = {
  id: 'prog-02',
  programCode: 'SNIES 10453',
  programName: 'Ingeniería Electrónica',
  faculty: 'Facultad de Ciencias Naturales e Ingenierías',
  version: 'Pensum 2021 (En proceso de renovación)',
  lastUpdated: '12 de Febrero de 2021',
  totalSemesters: 10,
  totalCredits: 162,
  semesters: [
    {
      semesterNumber: 4,
      label: 'Semestre IV',
      subjects: [
        { id: 'ele-401', code: 'ELE-401', name: 'Circuitos Eléctricos y Medidas', credits: 4, family: 'Electrónica, Automatización e Instrumentación', tools: ['Multímetro', 'Osciloscopio', 'Proteus'] },
        { id: 'ele-402', code: 'ELE-402', name: 'Dispositivos Semiconductores', credits: 3, family: 'Electrónica, Automatización e Instrumentación', tools: ['Diodos', 'Transistores'] },
      ],
    },
    {
      semesterNumber: 6,
      label: 'Semestre VI',
      subjects: [
        { id: 'ele-601', code: 'ELE-601', name: 'Microcontroladores y Sistemas Digitales', credits: 4, family: 'Electrónica, Automatización e Instrumentación', tools: ['Arduino', 'C Embedded', 'Microchips PIC'] },
        { id: 'ele-602', code: 'ELE-602', name: 'Instrumentación y Control Industrial', credits: 3, family: 'Electrónica, Automatización e Instrumentación', tools: ['Sensores', 'Transmisores'] },
      ],
    },
  ],
  vacanciesDemand: [
    { skill: 'Circuitos', vacanciesCount: 17, category: 'hardware' },
    { skill: 'Microcontroladores', vacanciesCount: 15, category: 'hardware' },
    { skill: 'Instrumentación', vacanciesCount: 12, category: 'hardware' },
    { skill: 'PLC (Siemens/Allen Bradley)', vacanciesCount: 26, category: 'automation' },
    { skill: 'IoT (Internet de las Cosas)', vacanciesCount: 21, category: 'embedded' },
    { skill: 'Python', vacanciesCount: 18, category: 'software' },
    { skill: 'Inglés B2', vacanciesCount: 14, category: 'languages' },
  ],
};

const softwarePensum = {
  id: 'prog-03',
  programCode: 'SNIES 53401',
  programName: 'Tecnología en Desarrollo de Sistemas Informáticos',
  faculty: 'Facultad de Ciencias Naturales e Ingenierías',
  version: 'Pensum 2023 (Aprobado MEN)',
  lastUpdated: '20 de Enero de 2023',
  totalSemesters: 6,
  totalCredits: 98,
  semesters: [
    {
      semesterNumber: 1,
      label: 'Semestre I',
      subjects: [
        { id: 'tds-101', code: 'TDS-101', name: 'Lógica de Programación', credits: 3, family: 'Desarrollo Backend y APIs', tools: ['Python', 'Pseudocódigo'] },
        { id: 'tds-102', code: 'TDS-102', name: 'Introducción al Desarrollo Web', credits: 3, family: 'Desarrollo Frontend Web', tools: ['HTML/CSS', 'JavaScript'] },
        { id: 'tds-103', code: 'TDS-103', name: 'Fundamentos de Bases de Datos', credits: 3, family: 'Bases de Datos Relacionales (SQL)', tools: ['MySQL', 'SQL'] },
      ],
    },
    {
      semesterNumber: 4,
      label: 'Semestre IV',
      subjects: [
        { id: 'tds-401', code: 'TDS-401', name: 'Desarrollo Frontend Moderno', credits: 4, family: 'Desarrollo Frontend Web', tools: ['React', 'JavaScript', 'TailwindCSS'] },
        { id: 'tds-402', code: 'TDS-402', name: 'Servicios Backend y APIs', credits: 4, family: 'Desarrollo Backend y APIs', tools: ['Node.js', 'Express', 'Postman'] },
        { id: 'tds-403', code: 'TDS-403', name: 'Control de Versiones y Metodologías Ágiles', credits: 3, family: 'Gestión de Proyectos y Metodologías Ágiles', tools: ['Git', 'GitHub', 'Scrum'] },
      ],
    },
  ],
  vacanciesDemand: [
    { skill: 'JavaScript', vacanciesCount: 52, category: 'frontend' },
    { skill: 'React', vacanciesCount: 46, category: 'frontend' },
    { skill: 'Node.js', vacanciesCount: 38, category: 'backend' },
    { skill: 'SQL', vacanciesCount: 35, category: 'database' },
    { skill: 'Git', vacanciesCount: 32, category: 'tools' },
    { skill: 'PostgreSQL', vacanciesCount: 26, category: 'database' },
    { skill: 'Docker', vacanciesCount: 22, category: 'devops' },
  ],
};

const gestionPensum = {
  id: 'prog-04',
  programCode: 'SNIES 53402',
  programName: 'Tecnología en Gestión Empresarial',
  faculty: 'Facultad de Ciencias Socioeconómicas y Empresariales',
  version: 'Pensum 2023 (Aprobado MEN)',
  lastUpdated: '10 de Marzo de 2023',
  totalSemesters: 6,
  totalCredits: 96,
  semesters: [
    {
      semesterNumber: 1,
      label: 'Semestre I',
      subjects: [
        { id: 'ges-101', code: 'GES-101', name: 'Fundamentos de Administración', credits: 3, family: 'Administración y Gestión Empresarial', tools: ['Procesos Administrativos', 'Modelo Canvas'] },
        { id: 'con-102', code: 'CON-102', name: 'Contabilidad Básica', credits: 3, family: 'Contabilidad, Nómina y Sistemas ERP', tools: ['Contabilidad', 'Cuentas T', 'Siigo'] },
        { id: 'mat-103', code: 'MAT-103', name: 'Matemática Financiera', credits: 3, family: 'Formación General e Institucional', tools: ['Excel Financiero', 'Interés Compuesto'] },
      ],
    },
    {
      semesterNumber: 4,
      label: 'Semestre IV',
      subjects: [
        { id: 'ges-401', code: 'GES-401', name: 'Gestión de Proyectos Empresariales', credits: 3, family: 'Gestión de Proyectos y Metodologías Ágiles', tools: ['Metodología PMI', 'MS Project', 'Asana'] },
        { id: 'mkt-402', code: 'MKT-402', name: 'Comportamiento del Consumidor y Ventas', credits: 3, family: 'Marketing Digital y Gestión Comercial', tools: ['Atención al Cliente', 'HubSpot CRM', 'Fidelización'] },
        { id: 'ges-403', code: 'GES-403', name: 'Legislación Laboral y Nómina', credits: 3, family: 'Contabilidad, Nómina y Sistemas ERP', tools: ['Liquidación de Nómina', 'Prestaciones', 'Seguridad Social'] },
      ],
    },
  ],
  vacanciesDemand: [
    { skill: 'Gestión de proyectos', vacanciesCount: 36, category: 'management' },
    { skill: 'Atención al cliente', vacanciesCount: 34, category: 'sales' },
    { skill: 'Contabilidad básica', vacanciesCount: 21, category: 'accounting' },
    { skill: 'Excel avanzado', vacanciesCount: 28, category: 'tools' },
    { skill: 'Inglés B2', vacanciesCount: 25, category: 'languages' },
    { skill: 'Power BI', vacanciesCount: 20, category: 'analytics' },
    { skill: 'CRM (HubSpot/Salesforce)', vacanciesCount: 16, category: 'sales' },
  ],
};

const contabilidadPensum = {
  id: 'prog-05',
  programCode: 'SNIES 53403',
  programName: 'Tecnología en Contabilidad y Finanzas',
  faculty: 'Facultad de Ciencias Socioeconómicas y Empresariales',
  version: 'Pensum 2023 (Aprobado MEN)',
  lastUpdated: '18 de Mayo de 2023',
  totalSemesters: 6,
  totalCredits: 98,
  semesters: [
    {
      semesterNumber: 1,
      label: 'Semestre I',
      subjects: [
        { id: 'con-101', code: 'TCF-101', name: 'Contabilidad General y Fundamentos NIIF', credits: 4, family: 'Contabilidad, Nómina y Sistemas ERP', tools: ['Siigo', 'Cuentas T', 'NIIF'] },
        { id: 'con-102', code: 'TCF-102', name: 'Matemática Comercial y Financiera', credits: 3, family: 'Formación General e Institucional', tools: ['Excel Financiero'] },
        { id: 'con-103', code: 'TCF-103', name: 'Fundamentos de Administración y Empresa', credits: 3, family: 'Administración y Gestión Empresarial', tools: ['Procesos Administrativos'] },
      ],
    },
    {
      semesterNumber: 4,
      label: 'Semestre IV',
      subjects: [
        { id: 'con-401', code: 'TCF-401', name: 'Contabilidad de Costos y Presupuestos', credits: 4, family: 'Contabilidad, Nómina y Sistemas ERP', tools: ['Excel Avanzado', 'Costos ABC', 'Presupuestos'] },
        { id: 'con-402', code: 'TCF-402', name: 'Legislación Tributaria e Impuestos Nacionales', credits: 4, family: 'Contabilidad, Nómina y Sistemas ERP', tools: ['Muisca DIAN', 'Retención en la Fuente', 'IVA y Renta'] },
        { id: 'con-403', code: 'TCF-403', name: 'Software Contable y Financiero en la Nube', credits: 3, family: 'Contabilidad, Nómina y Sistemas ERP', tools: ['Siigo Nube', 'SAP FI', 'World Office'] },
      ],
    },
    {
      semesterNumber: 6,
      label: 'Semestre VI',
      subjects: [
        { id: 'con-601', code: 'TCF-601', name: 'Auditoría Financiera y Control Interno', credits: 4, family: 'Contabilidad, Nómina y Sistemas ERP', tools: ['Control Interno', 'Revisoría Fiscal', 'Papeles de Trabajo'] },
        { id: 'con-602', code: 'TCF-602', name: 'Análisis de Estados Financieros e Indicadores', credits: 3, family: 'Contabilidad, Nómina y Sistemas ERP', tools: ['Power BI', 'Excel Financiero', 'Indicadores de Liquidez'] },
        { id: 'con-603', code: 'TCF-603', name: 'Liquidación de Nómina y Seguridad Social', credits: 3, family: 'Contabilidad, Nómina y Sistemas ERP', tools: ['Planilla PILA', 'Nómina Electrónica', 'Siigo'] },
      ],
    },
  ],
  vacanciesDemand: [
    { skill: 'Siigo / Siigo Nube', vacanciesCount: 42, category: 'accounting' },
    { skill: 'Liquidación de nómina y PILA', vacanciesCount: 38, category: 'accounting' },
    { skill: 'Declaración de renta e IVA', vacanciesCount: 35, category: 'tax' },
    { skill: 'Excel avanzado (tablas dinámicas)', vacanciesCount: 40, category: 'tools' },
    { skill: 'Normas NIIF para PYMES', vacanciesCount: 29, category: 'accounting' },
    { skill: 'SAP FI / Business One', vacanciesCount: 24, category: 'erp' },
    { skill: 'Conciliaciones bancarias', vacanciesCount: 31, category: 'finance' },
  ],
};

export const initialInstitutionPensums = {
  // Mapeo por IDs de programa estándar
  'prog-01': sistemasPensum,
  'prog-02': electronicaPensum,
  'prog-03': softwarePensum,
  'prog-04': gestionPensum,
  'prog-05': contabilidadPensum,

  // Mapeo por alias de texto
  sistemas: sistemasPensum,
  electronica: electronicaPensum,
  gestion: gestionPensum,
  software: softwarePensum,
  contabilidad: contabilidadPensum,
  finanzas: contabilidadPensum,
};
