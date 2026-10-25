import { useState } from 'react';
import { Field, Modal, PrimaryButton, SecondaryButton, inputClass } from './ui.jsx';

export default function EditBasicsModal({ profile, onSave, onClose }) {
  const [draft, setDraft] = useState({
    fullName: profile.fullName,
    headline: profile.headline,
    location: profile.location,
    graduationYear: profile.graduationYear,
    email: profile.email,
    phone: profile.phone,
    about: profile.about,
    links: { ...profile.links },
  });

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const setLink = (key) => (e) => setDraft((d) => ({ ...d, links: { ...d.links, [key]: e.target.value } }));
  const valid = draft.fullName.trim() && draft.headline.trim() && /\S+@\S+\.\S+/.test(draft.email);

  return (
    <Modal
      title="Editar datos básicos"
      subtitle="Esta información es la primera que ven los reclutadores."
      onClose={onClose}
      footer={(
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton icon="bx-check" disabled={!valid} onClick={() => onSave(draft)}>Guardar cambios</PrimaryButton>
        </>
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo"><input className={inputClass} value={draft.fullName} onChange={set('fullName')} /></Field>
        <Field label="Ciudad de residencia"><input className={inputClass} value={draft.location} onChange={set('location')} /></Field>
        <div className="sm:col-span-2">
          <Field label="Titular profesional" hint={`${draft.headline.length}/120 · Ej.: "Tecnólogo en Sistemas · Desarrollador Frontend"`}>
            <input className={inputClass} maxLength={120} value={draft.headline} onChange={set('headline')} />
          </Field>
        </div>
        <Field label="Correo de contacto"><input type="email" className={inputClass} value={draft.email} onChange={set('email')} /></Field>
        <Field label="Teléfono / WhatsApp"><input className={inputClass} value={draft.phone} onChange={set('phone')} /></Field>
        <Field label="Año de grado"><input className={inputClass} inputMode="numeric" maxLength={4} value={draft.graduationYear} onChange={set('graduationYear')} /></Field>
        <div className="sm:col-span-2">
          <Field label="Sobre mí" hint={`${draft.about.length}/600 · Cuenta en qué eres bueno y qué tipo de reto buscas.`}>
            <textarea rows={4} maxLength={600} className={`${inputClass} resize-y`} value={draft.about} onChange={set('about')} />
          </Field>
        </div>
        <Field label="LinkedIn"><input className={inputClass} placeholder="linkedin.com/in/usuario" value={draft.links.linkedin} onChange={setLink('linkedin')} /></Field>
        <Field label="GitHub / Behance"><input className={inputClass} placeholder="github.com/usuario" value={draft.links.github} onChange={setLink('github')} /></Field>
        <div className="sm:col-span-2">
          <Field label="Portafolio o sitio web"><input className={inputClass} placeholder="miportafolio.com" value={draft.links.portfolio} onChange={setLink('portfolio')} /></Field>
        </div>
      </div>
    </Modal>
  );
}
