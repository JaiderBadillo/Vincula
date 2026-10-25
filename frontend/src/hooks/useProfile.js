import { useCallback, useEffect, useState } from 'react';
import { initialProfile } from '../data/profile.js';

const STORAGE_KEY = 'vincula.profile.v1';
const SYNC_EVENT = 'vincula:profile-updated';

function readProfile() {
  if (typeof window === 'undefined') return initialProfile;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...initialProfile, ...JSON.parse(raw) } : initialProfile;
  } catch {
    return initialProfile;
  }
}

function writeProfile(profile) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Si el almacenamiento está lleno o bloqueado, el perfil sigue funcionando en memoria.
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: profile }));
    });
  }
}

export function useProfile() {
  const [profile, setProfile] = useState(readProfile);

  useEffect(() => {
    function handleSync(event) {
      setProfile(event.detail ?? readProfile());
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
    writeProfile(initialProfile);
    setProfile(initialProfile);
  }, []);

  return { profile, updateProfile, resetProfile };
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
