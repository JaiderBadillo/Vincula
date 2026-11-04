import { useCallback, useEffect, useState } from 'react';
import { initialCompanyProfile } from '../data/companyAdminData.js';

const STORAGE_KEY = 'vincula.company.profile.v1';
const SYNC_EVENT = 'vincula:company-profile-updated';

function readProfile() {
  if (typeof window === 'undefined') return initialCompanyProfile;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialCompanyProfile;
    const stored = JSON.parse(raw);
    return {
      ...initialCompanyProfile,
      ...stored,
      legalRepresentative: {
        ...initialCompanyProfile.legalRepresentative,
        ...(stored.legalRepresentative || {}),
      },
    };
  } catch {
    return initialCompanyProfile;
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

export function useCompanyProfile() {
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
    writeProfile(initialCompanyProfile);
    setProfile(initialCompanyProfile);
  }, []);

  return { companyProfile: profile, updateCompanyProfile: updateProfile, resetCompanyProfile: resetProfile };
}

