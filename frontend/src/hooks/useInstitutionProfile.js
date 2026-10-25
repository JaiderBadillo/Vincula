import { useCallback, useEffect, useState } from 'react';
import { initialInstitutionProfile } from '../data/institutionAdminData.js';

const STORAGE_KEY = 'vincula.institution.profile.v1';
const SYNC_EVENT = 'vincula:institution-profile-updated';

function readProfile() {
  if (typeof window === 'undefined') return initialInstitutionProfile;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...initialInstitutionProfile, ...JSON.parse(raw) } : initialInstitutionProfile;
  } catch {
    return initialInstitutionProfile;
  }
}

function writeProfile(profile) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // safe fallback
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: profile }));
    });
  }
}

export function useInstitutionProfile() {
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
    writeProfile(initialInstitutionProfile);
    setProfile(initialInstitutionProfile);
  }, []);

  return { institutionProfile: profile, updateInstitutionProfile: updateProfile, resetInstitutionProfile: resetProfile };
}
