/**
 * Fotografías del portal de empresas (Pexels, tonos cálidos).
 * Se centralizan aquí para cambiarlas en un solo lugar.
 */
const pexels = (id, w = 1400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&q=80`;

export const companyPhotos = {
  perfil: { src: pexels(3184339), alt: 'Equipo de trabajo reunido alrededor de una mesa de madera', position: 'object-[center_35%]' },
  perfilCover: { src: pexels(3182812, 900), alt: 'Equipo sonriendo frente a un computador', position: 'object-center' },
  reclutadores: { src: pexels(3184360), alt: 'Equipo de selección revisando hojas de vida en una mesa', position: 'object-[center_40%]' },
  sedes: { src: pexels(1181396), alt: 'Sala de juntas luminosa de una oficina', position: 'object-center' },
  vacantes: { src: pexels(3184611), alt: 'Profesional sonriendo frente a su portátil', position: 'object-[center_30%]' },
  convenios: { src: pexels(3184465), alt: 'Apretón de manos para cerrar un convenio', position: 'object-center' },
  actividad: { src: pexels(3184292), alt: 'Equipo analizando gráficas de resultados', position: 'object-center' },
  configuracion: { src: pexels(3184454), alt: 'Escritorio con portátil y libreta', position: 'object-center' },
  talento: { src: pexels(3184291, 800), alt: 'Equipo recibiendo a un nuevo integrante', position: 'object-center' },
};

