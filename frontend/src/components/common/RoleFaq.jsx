import { useState } from 'react';

const common = [
  {
    question: '¿Cómo cambio mi correo o contraseña?',
    answer: 'En Configuración, abre Cuenta para cambiar tu correo o Seguridad para actualizar tu contraseña. Confirma el cambio con tu contraseña actual.',
  },
  {
    question: '¿Qué hago si olvidé mi contraseña?',
    answer: 'Desde la pantalla de inicio de sesión selecciona «¿Olvidaste tu contraseña?» y sigue las instrucciones enviadas a tu correo.',
    link: { href: '/recuperar-contrasena', label: 'Ir a recuperar contraseña' },
  },
];

const byRole = {
  graduate: {
    title: 'Egresados',
    questions: [
      { question: '¿Dónde reviso la verificación de mi cuenta?', answer: 'Consulta el estado de los documentos enviados y, si hay un rechazo, las correcciones solicitadas en Verificación de mi cuenta.', link: { href: '/dashboard/verificacion', label: 'Ver mi verificación' } },
      { question: '¿Cómo actualizo mi hoja de vida y mi perfil?', answer: 'En Mi perfil puedes editar tu información y gestionar tus hojas de vida para las postulaciones.', link: { href: '/dashboard/perfil', label: 'Ir a Mi perfil' } },
      { question: '¿Dónde veo mis postulaciones?', answer: 'En Mis postulaciones puedes consultar los procesos a los que te has presentado y su estado.', link: { href: '/dashboard/postulaciones', label: 'Ver mis postulaciones' } },
      { question: '¿Cómo busco oportunidades?', answer: 'Abre Vacantes para consultar las oportunidades publicadas y sus requisitos.', link: { href: '/dashboard/vacantes', label: 'Explorar vacantes' } },
    ],
  },
  institution_advisor: {
    title: 'Asesores IES',
    questions: [
      { question: '¿Dónde reviso las solicitudes de egresados?', answer: 'En Solicitudes de estudiantes puedes consultar los expedientes pendientes y revisar los documentos que enviaron.', link: { href: '/institucion/estudiantes/solicitudes', label: 'Ver solicitudes' } },
      { question: '¿Cómo consulto el seguimiento de egresados?', answer: 'El apartado de seguimiento reúne la información de estudiantes y egresados vinculados a tu institución.', link: { href: '/institucion/estudiantes/seguimiento', label: 'Abrir seguimiento' } },
      { question: '¿Dónde ajusto mis avisos por correo?', answer: 'En Configuración, abre Notificaciones y elige los avisos de acceso y cambios de cuenta que deseas recibir.' },
    ],
  },
  institution_admin: {
    title: 'Administradores IES',
    questions: [
      { question: '¿Dónde reviso el estado de la institución?', answer: 'En Verificación de mi cuenta puedes consultar los documentos enviados y las correcciones solicitadas si fueron rechazados.', link: { href: '/institucion/admin/verificacion', label: 'Ver mi verificación' } },
      { question: '¿Cómo gestiono asesores y sedes?', answer: 'En Asesores puedes consultar y administrar los asesores de tu institución y sus sedes de atención.', link: { href: '/institucion/admin/asesores', label: 'Gestionar asesores' } },
      { question: '¿Dónde gestiono la oferta académica?', answer: 'El apartado Programas reúne los programas registrados para tu institución.', link: { href: '/institucion/admin/programas', label: 'Ver programas' } },
    ],
  },
  company_admin: {
    title: 'Administradores de empresa',
    questions: [
      { question: '¿Dónde consulto la aprobación de mi empresa?', answer: 'En Verificación de mi cuenta puedes revisar los documentos enviados, el estado de la revisión y los motivos de rechazo si los hay.', link: { href: '/empresa/admin/verificacion', label: 'Ver mi verificación' } },
      { question: '¿Cómo edito los datos de mi empresa?', answer: 'En el perfil de empresa puedes actualizar la información y la presentación que ven los egresados.', link: { href: '/empresa/admin/perfil', label: 'Editar perfil de empresa' } },
      { question: '¿Dónde administro reclutadores?', answer: 'En Reclutadores puedes consultar y gestionar las cuentas de tu equipo de selección.', link: { href: '/empresa/admin/reclutadores', label: 'Gestionar reclutadores' } },
      { question: '¿Cómo publico una vacante?', answer: 'Desde Mis vacantes puedes crear una nueva convocatoria y consultar las que ya registraste.', link: { href: '/empresa/admin/vacantes', label: 'Ir a Mis vacantes' } },
    ],
  },
  company_recruiter: {
    title: 'Reclutadores',
    questions: [
      { question: '¿Dónde encuentro las vacantes de mi empresa?', answer: 'En Mis vacantes puedes consultar y trabajar con las convocatorias disponibles para tu cuenta.', link: { href: '/empresa/reclutador/vacantes', label: 'Ver mis vacantes' } },
      { question: '¿Cómo reviso candidatos y procesos?', answer: 'Abre Candidatos y Embudo para consultar los postulantes y su avance en los procesos.', link: { href: '/empresa/reclutador/candidatos', label: 'Ver candidatos' } },
      { question: '¿Dónde busco talento de las IES?', answer: 'El Banco de Talento IES está disponible desde el menú de selección y talento.', link: { href: '/empresa/reclutador/talento', label: 'Abrir banco de talento' } },
    ],
  },
  vincula_admin: {
    title: 'Superadministradores',
    questions: [
      { question: '¿Dónde reviso las empresas pendientes?', answer: 'En Empresas puedes consultar las solicitudes y revisar los documentos de cada organización antes de decidir.', link: { href: '/admin/empresas', label: 'Revisar empresas' } },
      { question: '¿Dónde reviso las IES pendientes?', answer: 'En Instituciones puedes consultar las solicitudes y los documentos aportados por cada IES.', link: { href: '/admin/instituciones', label: 'Revisar instituciones' } },
      { question: '¿Dónde veo las cifras de la plataforma?', answer: 'El Panel Central muestra las métricas disponibles de empresas, instituciones, vacantes y egresados.', link: { href: '/admin/dashboard', label: 'Abrir panel central' } },
    ],
  },
};

const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function RoleFaq({ role }) {
  const [query, setQuery] = useState('');
  const content = byRole[role] || { title: 'Tu cuenta', questions: [] };
  const search = normalize(query.trim());
  const groups = [
    { title: content.title, questions: content.questions },
    { title: 'Acceso y seguridad', questions: common },
  ].map(group => ({
    ...group,
    questions: group.questions.filter(item => normalize(`${item.question} ${item.answer}`).includes(search)),
  })).filter(group => group.questions.length);

  return <section aria-labelledby="faq-title" className="grid gap-5">
    <div>
      <h3 id="faq-title" className="m-0 text-lg font-bold text-ink">Preguntas frecuentes</h3>
      <p className="mt-1 text-sm text-secondary">Respuestas para tu rol y para el acceso a tu cuenta.</p>
    </div>
    <label className="grid gap-2 text-xs font-semibold text-ink">
      Buscar una pregunta
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Escribe un tema o una palabra" className="w-full rounded-xl border border-sand-line bg-white px-4 py-3 text-sm font-normal text-ink outline-none focus:border-green" />
    </label>
    {groups.length ? groups.map(group => <div key={group.title} className="grid gap-2">
      <h4 className="m-0 text-xs font-bold uppercase tracking-wide text-secondary">{group.title}</h4>
      {group.questions.map(item => <details key={item.question} className="group rounded-xl border border-sand-line bg-white open:bg-cream/30">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink marker:text-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-dark">{item.question}</summary>
        <div className="border-t border-sand-line px-4 py-3 text-sm leading-relaxed text-secondary">
          <p className="m-0">{item.answer}</p>
          {item.link && <a className="mt-3 inline-block font-semibold text-green-dark underline underline-offset-2 hover:text-green focus-visible:outline-2 focus-visible:outline-green-dark" href={item.link.href}>{item.link.label}</a>}
        </div>
      </details>)}
    </div>) : <p role="status" className="rounded-xl border border-sand-line p-4 text-sm text-secondary">No encontramos preguntas con ese término. Prueba con otra palabra.</p>}
  </section>;
}
