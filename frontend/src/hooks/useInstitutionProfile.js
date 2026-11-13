import { useCallback, useEffect, useState } from 'react';
import { initialInstitutionProfile } from '../data/institutionAdminData.js';
import { authService } from '../services/authService.js';
import { institutionService } from '../services/institutionService.js';

const SYNC_EVENT = 'vincula:institution-profile-updated';
let sharedProfile = initialInstitutionProfile;
let sharedId = null;

function broadcast(profile) {
  sharedProfile = profile;
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: profile }));
}

export function useInstitutionProfile() {
  const currentId = authService.getCurrentUser()?.id_entidad;
  const [profile, setProfile] = useState(() => currentId && sharedId === currentId ? sharedProfile : initialInstitutionProfile);
  const [loading, setLoading] = useState(Boolean(currentId && sharedId !== currentId));
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    const sync = (event) => setProfile(event.detail ?? initialInstitutionProfile);
    window.addEventListener(SYNC_EVENT, sync);
    if (currentId) {
      institutionService.getProfile().then((data) => {
        if (!active) return;
        sharedId = currentId;
        broadcast(data);
        setLoadError('');
      }).catch((error) => { if (active) setLoadError(error.message); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; window.removeEventListener(SYNC_EVENT, sync); };
  }, [currentId]);

  const updateProfile = useCallback(async (updater) => {
    const next = typeof updater === 'function' ? updater(sharedProfile) : updater;
    if (!authService.getToken() || !authService.getCurrentUser()?.id_entidad) {
      broadcast(next);
      return next;
    }
    const result = await institutionService.updateProfile(next);
    sharedId = authService.getCurrentUser().id_entidad;
    broadcast(result);
    return result;
  }, []);

  const resetProfile = useCallback(() => {
    sharedId = null;
    broadcast(initialInstitutionProfile);
  }, []);

  return { institutionProfile: profile, updateInstitutionProfile: updateProfile, resetInstitutionProfile: resetProfile, loading, loadError };
}
