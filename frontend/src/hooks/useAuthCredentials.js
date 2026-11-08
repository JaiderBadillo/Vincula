import { useCallback, useEffect, useState } from 'react';

export const AUTH_CREDENTIALS_STORAGE_KEY = 'vincula.auth.credentials.v1';
export const AUTH_CREDENTIALS_SYNC_EVENT = 'vincula:auth-credentials-updated';
export const COMPANY_PERSONA_STORAGE_KEY = 'vincula.company.active-persona';
export const COMPANY_PERSONA_SYNC_EVENT = 'vincula:company-persona-updated';

export const INITIAL_CREDENTIALS = {
  graduate: {
    roleId: 'graduate',
    roleLabel: 'Egresado',
    category: 'Egresados y Graduados',
    name: 'Jaider Niño',
    email: 'egresado@correo.uts.edu.co',
    password: 'Egresado123*',
    lastChanged: 'Hoy',
    portalRoute: '/dashboard',
  },
  institution_advisor: {
    roleId: 'institution_advisor',
    roleLabel: 'Asesor IES',
    category: 'Institución de Educación Superior',
    name: 'Coordinación de Egresados UTS',
    email: 'ies@uts.edu.co',
    password: 'IesAdmin123*',
    lastChanged: 'Hoy',
    portalRoute: '/institucion/dashboard',
  },
  institution_admin: {
    roleId: 'institution_admin',
    roleLabel: 'Administrador IES',
    category: 'Institución de Educación Superior',
    name: 'Unidades Tecnológicas de Santander',
    email: 'ies@uts.edu.co',
    password: 'IesAdmin123*',
    lastChanged: 'Hoy',
    portalRoute: '/institucion/admin/perfil',
  },
  company_admin: {
    roleId: 'company_admin',
    roleLabel: 'Administrador de Empresa (Aprobada)',
    category: 'Empresas y Empleadores',
    name: 'Tech Innovations SAS',
    email: 'empresa@techinnovations.co',
    password: 'Empresa123*',
    lastChanged: 'Hoy',
    portalRoute: '/empresa/admin/perfil',
  },
  company_quarantine: {
    roleId: 'company_quarantine',
    roleLabel: 'Empresa en Cuarentena (SLA 72h)',
    category: 'Empresas y Empleadores',
    name: 'Startup en Espera SAS',
    email: 'empresa.nueva@startup.co',
    password: 'Empresa123*',
    lastChanged: 'Hoy',
    portalRoute: '/empresa/admin/actividad',
  },
  company_recruiter: {
    roleId: 'company_recruiter',
    roleLabel: 'Reclutador',
    category: 'Empresas y Empleadores',
    name: 'Carlos Andrés Rueda',
    email: 'empresa@techinnovations.co',
    password: 'Empresa123*',
    lastChanged: 'Hoy',
    portalRoute: '/empresa/reclutador/dashboard',
  },
  vincula_admin: {
    roleId: 'vincula_admin',
    roleLabel: 'Administrador Vincula',
    category: 'Plataforma Central Vincula',
    name: 'Super Administrador Vincula',
    email: 'admin@vincula.com.co',
    password: 'Admin123*',
    lastChanged: 'Hoy',
    portalRoute: '/admin/dashboard',
  },
};

function readCredentials() {
  if (typeof window === 'undefined') return INITIAL_CREDENTIALS;
  try {
    const raw = window.localStorage.getItem(AUTH_CREDENTIALS_STORAGE_KEY);
    if (!raw) return INITIAL_CREDENTIALS;
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_CREDENTIALS,
      ...parsed,
    };
  } catch {
    return INITIAL_CREDENTIALS;
  }
}

function writeCredentials(credentials) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTH_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
    window.dispatchEvent(new CustomEvent(AUTH_CREDENTIALS_SYNC_EVENT, { detail: credentials }));
  } catch {
    // Fallback silencioso si localStorage está bloqueado
  }
}

function readCompanyPersona() {
  if (typeof window === 'undefined') return 'company_admin';
  try {
    return window.localStorage.getItem(COMPANY_PERSONA_STORAGE_KEY) || 'company_admin';
  } catch {
    return 'company_admin';
  }
}

function writeCompanyPersona(persona) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COMPANY_PERSONA_STORAGE_KEY, persona);
    window.dispatchEvent(new CustomEvent(COMPANY_PERSONA_SYNC_EVENT, { detail: persona }));
  } catch {
    // Fallback silencioso
  }
}

export function useAuthCredentials() {
  const [credentials, setCredentials] = useState(readCredentials);
  const [companyPersona, setCompanyPersonaState] = useState(readCompanyPersona);

  useEffect(() => {
    function handleSync(event) {
      if (event.detail) {
        setCredentials(event.detail);
      } else {
        setCredentials(readCredentials());
      }
    }

    function handlePersonaSync(event) {
      if (event.detail) {
        setCompanyPersonaState(event.detail);
      } else {
        setCompanyPersonaState(readCompanyPersona());
      }
    }

    window.addEventListener(AUTH_CREDENTIALS_SYNC_EVENT, handleSync);
    window.addEventListener(COMPANY_PERSONA_SYNC_EVENT, handlePersonaSync);
    return () => {
      window.removeEventListener(AUTH_CREDENTIALS_SYNC_EVENT, handleSync);
      window.removeEventListener(COMPANY_PERSONA_SYNC_EVENT, handlePersonaSync);
    };
  }, []);

  const getCredentials = useCallback(
    (roleId) => {
      return credentials[roleId] || INITIAL_CREDENTIALS[roleId] || null;
    },
    [credentials]
  );

  const updateCredentials = useCallback((roleId, { email, currentPassword, newPassword }) => {
    const current = readCredentials();
    const target = current[roleId] || INITIAL_CREDENTIALS[roleId];
    if (!target) return { ok: false, error: 'Rol no encontrado' };

    // Si intenta cambiar la contraseña, validar que la contraseña actual coincida
    if (newPassword && newPassword.trim()) {
      if (currentPassword && currentPassword !== target.password) {
        return { ok: false, error: 'La contraseña actual no es correcta.' };
      }
    }

    const trimmedEmail = email ? email.trim() : target.email;
    const nowFormatted = new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    const updatedRoleCreds = {
      ...target,
      email: trimmedEmail,
      password: newPassword && newPassword.trim() ? newPassword.trim() : target.password,
      lastChanged: newPassword && newPassword.trim() ? nowFormatted : target.lastChanged,
    };

    const nextCredentials = {
      ...current,
      [roleId]: updatedRoleCreds,
    };

    writeCredentials(nextCredentials);

    // Sincronizar en cascada con el perfil respectivo para mantener consistencia de email
    syncWithRelatedProfiles(roleId, trimmedEmail);

    return { ok: true, credentials: updatedRoleCreds };
  }, []);

  const setCompanyPersona = useCallback((persona) => {
    writeCompanyPersona(persona);
    setCompanyPersonaState(persona);
  }, []);

  return {
    credentials,
    getCredentials,
    updateCredentials,
    companyPersona,
    setCompanyPersona,
  };
}

/**
 * Propaga el correo actualizado a las fuentes de datos del respectivo portal
 */
function syncWithRelatedProfiles(roleId, newEmail) {
  if (typeof window === 'undefined') return;

  try {
    if (roleId === 'graduate') {
      const raw = window.localStorage.getItem('vincula.profile.v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.email = newEmail;
        window.localStorage.setItem('vincula.profile.v1', JSON.stringify(parsed));
        window.dispatchEvent(new CustomEvent('vincula:profile-updated', { detail: parsed }));
      }
    } else if (roleId === 'institution_admin') {
      const raw = window.localStorage.getItem('vincula.institution.profile.v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.contactEmail = newEmail;
        window.localStorage.setItem('vincula.institution.profile.v1', JSON.stringify(parsed));
        window.dispatchEvent(new CustomEvent('vincula:institution-profile-updated', { detail: parsed }));
      }
    } else if (roleId === 'company_admin') {
      const raw = window.localStorage.getItem('vincula.company.profile.v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.contactEmail = newEmail;
        window.localStorage.setItem('vincula.company.profile.v1', JSON.stringify(parsed));
        window.dispatchEvent(new CustomEvent('vincula:company-profile-updated', { detail: parsed }));
      }
    } else if (roleId === 'company_recruiter') {
      const raw = window.localStorage.getItem('vincula.company.recruiters.v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed[0].email = newEmail;
          window.localStorage.setItem('vincula.company.recruiters.v3', JSON.stringify(parsed));
          window.dispatchEvent(new CustomEvent('vincula:company-recruiters-updated', { detail: parsed }));
        }
      }
    }
  } catch {
    // Silencioso
  }
}

