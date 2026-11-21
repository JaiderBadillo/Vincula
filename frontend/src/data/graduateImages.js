/**
 * Fotografías del portal de egresados (Pexels). Se centralizan aquí, como en companyImages e institutionImages.
 */
const pexels = (id, w = 1400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&q=80`;

export const graduatePhotos = {
  inicio: { src: pexels(7972741), alt: 'Tres graduados sonriendo con sus diplomas y birretes', position: 'object-[center_30%]' },
  vacantes: { src: pexels(6893949), alt: 'Mujer joven buscando oportunidades en su portátil, sentada en un sofá', position: 'object-[center_35%]' },
  postulaciones: { src: pexels(4342496), alt: 'Candidata atendiendo una entrevista de trabajo', position: 'object-[center_40%]' },
};
