import { useCallback, useEffect, useState } from 'react';
import { initialCompanyProfile } from '../data/companyAdminData.js';
import { authService } from '../services/authService.js';
import { companyService } from '../services/companyService.js';

const SYNC_EVENT = 'vincula:company-profile-updated';
let sharedProfile = initialCompanyProfile;
let sharedCompanyId = null;

function broadcast(profile) {
  sharedProfile = profile;
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: profile }));
}

export function useCompanyProfile() {
  const currentCompanyId = authService.getCurrentUser()?.id_entidad;
  const [profile, setProfile] = useState(
    () => currentCompanyId && sharedCompanyId === currentCompanyId ? sharedProfile : initialCompanyProfile,
  );
  const [loading, setLoading] = useState(Boolean(currentCompanyId && sharedCompanyId !== currentCompanyId));
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    const sync = (event) => setProfile(event.detail ?? initialCompanyProfile);
    window.addEventListener(SYNC_EVENT, sync);
    if (currentCompanyId) {
      companyService.getProfile().then((data) => {
        if (!active) return;
        sharedCompanyId = currentCompanyId;
        broadcast(data);
        setLoadError('');
      }).catch((error) => {
        if (active) setLoadError(error.message);
      }).finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; window.removeEventListener(SYNC_EVENT, sync); };
  }, [currentCompanyId]);

  const updateProfile = useCallback(async (updater) => {
    const next = typeof updater === 'function' ? updater(sharedProfile) : updater;
    // Durante el registro aún no hay sesión; al entrar prevalecen los datos del servidor.
    if (!authService.getToken() || !authService.getCurrentUser()?.id_entidad) {
      broadcast(next);
      return next;
    }
    const saved = await companyService.updateProfile(next);
    sharedCompanyId = authService.getCurrentUser().id_entidad;
    broadcast(saved);
    return saved;
  }, []);

  const resetProfile = useCallback(() => {
    sharedCompanyId = null;
    broadcast(initialCompanyProfile);
  }, []);

  return { companyProfile: profile, updateCompanyProfile: updateProfile, resetCompanyProfile: resetProfile, loading, loadError };
}

