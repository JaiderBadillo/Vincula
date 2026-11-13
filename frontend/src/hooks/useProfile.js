import { useCallback, useEffect, useState } from 'react';
import { initialProfile } from '../data/profile.js';
import { authService } from '../services/authService.js';
import { graduateProfileService } from '../services/graduateProfileService.js';

const STORAGE_KEY = 'vincula.profile.draft.v2';
const SYNC_EVENT = 'vincula:profile-updated';
const SERVER_FIELDS = ['fullName', 'headline', 'location', 'email', 'phone', 'about', 'openToWork', 'openToWorkVisibility', 'graduationYear', 'program', 'cvs'];

function accountId() {
  const user = authService.getCurrentUser();
  return user?.id || user?.id_usuario || null;
}

function fromServer(data) {
  return {
    fullName: data.nombre_completo || '', headline: data.titular_profesional || '',
    location: data.ciudad || '', email: data.correo || '', phone: data.telefono || '',
    about: data.biografia || '', program: data.carrera || '',
    graduationYear: data.ano_graduacion || '',
    openToWork: Boolean(data.disponible_para_trabajar),
    openToWorkVisibility: data.visibilidad_disponibilidad || 'recruiters',
    photo: data.url_avatar || null, cover: data.url_portada || null,
    cvs: data.cvs || [],
  };
}

function readProfile() {
  if (typeof window === 'undefined') return initialProfile;
  try {
    const id = accountId();
    if (!id) return initialProfile;
    const raw = window.localStorage.getItem(`${STORAGE_KEY}.${id}`);
    const draft = raw ? JSON.parse(raw) : {};
    SERVER_FIELDS.forEach((key) => { delete draft[key]; });
    return { ...initialProfile, ...draft };
  } catch {
    return initialProfile;
  }
}

function writeProfile(profile) {
  try {
    const id = accountId();
    if (id) {
      const draft = { ...profile };
      SERVER_FIELDS.forEach((key) => { delete draft[key]; });
      window.localStorage.setItem(`${STORAGE_KEY}.${id}`, JSON.stringify(draft));
    }
  } catch {
    // Si el almacenamiento está lleno o bloqueado, el perfil sigue funcionando en memoria.
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { profile, accountId: accountId() } }));
    });
  }
}

export function useProfile() {
  const [profile, setProfile] = useState(readProfile);
  const [loading, setLoading] = useState(Boolean(accountId()));
  const [loadError, setLoadError] = useState('');
  const id = accountId();

  useEffect(() => {
    let active = true;
    if (!id) { setLoading(false); return undefined; }
    setLoading(true);
    graduateProfileService.get().then((data) => {
      if (!active) return;
      const merged = { ...readProfile(), ...fromServer(data) };
      setProfile(merged);
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { profile: merged, accountId: id } }));
      setLoadError('');
    }).catch((error) => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    function handleSync(event) {
      if (event.detail?.accountId === accountId()) setProfile(event.detail.profile ?? readProfile());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const updateProfile = useCallback((updater) => {
    setProfile((current) => {
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      writeProfile(next);
      return next;
    });
  }, []);

  const resetProfile = useCallback(() => {
    const id = accountId();
    if (id) window.localStorage.removeItem(`${STORAGE_KEY}.${id}`);
    setProfile(initialProfile);
  }, []);

  return { profile, updateProfile, resetProfile, loading, loadError };
}

/** Reduce una imagen a un dataURL JPEG liviano para poder guardarla en localStorage. */
export function resizeImage(file, maxSize = 360, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

export function computeProfileStrength(profile) {
  const checks = [
    { id: 'photo', label: 'Foto de perfil', points: 15, done: Boolean(profile.photo) },
    { id: 'headline', label: 'Titular profesional', points: 10, done: profile.headline?.trim().length > 10 },
    { id: 'about', label: 'Resumen "Sobre mí"', points: 10, done: profile.about?.trim().length > 60 },
    { id: 'cv', label: 'Hoja de vida cargada', points: 20, done: profile.cvs?.length > 0 },
    { id: 'skills', label: 'Al menos 5 habilidades', points: 15, done: profile.skills?.length >= 5 },
    { id: 'experience', label: 'Experiencia o formación', points: 10, done: profile.experience?.length > 0 },
    { id: 'preferences', label: 'Preferencias laborales', points: 10, done: profile.preferences?.modes?.length > 0 },
    { id: 'links', label: 'Enlace profesional', points: 5, done: Object.values(profile.links ?? {}).some((v) => v?.trim()) },
    { id: 'languages', label: 'Idiomas', points: 5, done: profile.languages?.length > 0 },
  ];
  const score = checks.reduce((sum, c) => sum + (c.done ? c.points : 0), 0);
  return { score, checks };
}
