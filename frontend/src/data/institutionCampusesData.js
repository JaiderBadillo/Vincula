/**
 * Catálogo de Sedes y Campus Institucionales
 * Vincula - Portal de Administración IES
 */

export const initialCampuses = [
  {
    id: 'sede-bga-principal',
    name: 'Sede Principal - Ciudadela Universitaria',
    shortName: 'Bucaramanga (Principal)',
    city: 'Bucaramanga',
    department: 'Santander',
    address: 'Calle de los Estudiantes # 9-82, Ciudadela Real de Minas',
    phone: '+57 (607) 680 0600',
    email: 'sedebucaramanga@institucion.edu.co',
    isMain: true,
    status: 'active',
    description: 'Sede central de rectoría, facultades académicas y centro principal de atención a egresados.',
  },
  {
    id: 'sede-barrancabermeja',
    name: 'Sede Regional Barrancabermeja',
    shortName: 'Barrancabermeja',
    city: 'Barrancabermeja',
    department: 'Santander',
    address: 'Carrera 28 # 45-12, Barrio Palmira',
    phone: '+57 (607) 622 1540',
    email: 'sedebarranca@institucion.edu.co',
    isMain: false,
    status: 'active',
    description: 'Polo regional del Magdalena Medio enfocado en programas tecnológicos e ingeniería petroquímica.',
  },
  {
    id: 'sede-piedecuesta',
    name: 'Extensión Regional Piedecuesta',
    shortName: 'Piedecuesta',
    city: 'Piedecuesta',
    department: 'Santander',
    address: 'Calle 10 # 8-34, Centro Histórico',
    phone: '+57 (607) 655 4210',
    email: 'sedepiedecuesta@institucion.edu.co',
    isMain: false,
    status: 'active',
    description: 'Extensión metropolitana sur orientada a formación tecnológica y articulación empresarial.',
  },
  {
    id: 'sede-velez',
    name: 'Extensión Regional Vélez',
    shortName: 'Vélez',
    city: 'Vélez',
    department: 'Santander',
    address: 'Carrera 5 # 7-18, Barrio El Carmen',
    phone: '+57 (607) 756 3120',
    email: 'sedevelez@institucion.edu.co',
    isMain: false,
    status: 'active',
    description: 'Extensión provincial que cubre la provincia de Vélez y municipios aledaños de Boyacá.',
  },
];
