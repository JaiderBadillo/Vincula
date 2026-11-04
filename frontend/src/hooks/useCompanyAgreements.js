import { useCallback, useEffect, useState } from 'react';
import { initialAgreements, REGIONAL_INSTITUTIONS, AGREEMENT_TYPES } from '../data/companyAgreementsData.js';

const STORAGE_KEY = 'vincula.company.agreements.v2';
const LEGACY_KEYS = ['vincula.company.agreements.v1'];
const SYNC_EVENT = 'vincula:company-agreements-updated';

function readAgreements() {
  if (typeof window === 'undefined') return initialAgreements;
  try {
    LEGACY_KEYS.forEach((k) => {
      if (window.localStorage.getItem(k)) window.localStorage.removeItem(k);
    });
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : initialAgreements;
  } catch {
    return initialAgreements;
  }
}

function writeAgreements(list) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // safe fallback
  }
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: list }));
    });
  }
}

export function useCompanyAgreements() {
  const [agreements, setAgreements] = useState(readAgreements);

  useEffect(() => {
    function handleSync(event) {
      setAgreements(event.detail ?? readAgreements());
    }
    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  /**
   * Radica una nueva solicitud de convenio con una IES (UTS por defecto u otra regional).
   * Queda en estado 'en_revision'.
   */
  const requestAgreement = useCallback((formData) => {
    const inst = REGIONAL_INSTITUTIONS.find((i) => i.id === formData.institutionId) || REGIONAL_INSTITUTIONS[0];
    const typeObj = AGREEMENT_TYPES.find((t) => t.id === formData.typeKey) || AGREEMENT_TYPES[0];
    const today = new Date().toISOString().slice(0, 10);
    const id = `agr-cenit-${Date.now().toString().slice(-4)}`;
    const randomCode = Math.floor(100 + Math.random() * 900);
    const agreementCode = `SOL-${inst.shortName}-${new Date().getFullYear()}-${randomCode}`;

    const newAgreement = {
      id,
      institutionId: inst.id,
      institutionName: inst.name,
      institutionShort: inst.shortName,
      institutionLogo: inst.logo,
      agreementCode,
      title: formData.title || `${typeObj.name} con ${inst.shortName}`,
      typeKey: formData.typeKey || 'alianza_preferente',
      typeLabel: typeObj.name,
      status: 'en_revision',
      signedAt: null,
      expiresAt: null,
      requestedAt: today,
      requestedDurationYears: Number(formData.durationYears) || 2,
      estimatedVacancies: Number(formData.estimatedVacancies) || 4,
      legalRepresentative: formData.legalRepresentative || 'Carlos Andrés Rueda (Cenit)',
      coordinatorIES: inst.coordinator,
      contactCompany: {
        name: formData.contactName || 'Carlos Andrés Rueda',
        role: formData.contactRole || 'Gerente General',
        email: formData.contactEmail || 'talento@cenit-transporte.com',
        phone: formData.contactPhone || '+57 (607) 633 4000',
      },
      targetFaculties: formData.targetFaculties?.length
        ? formData.targetFaculties
        : ['Facultad de Ciencias Naturales e Ingenierías'],
      targetPrograms: formData.targetPrograms?.length
        ? formData.targetPrograms
        : ['Ingeniería de Sistemas', 'Tecnología en Desarrollo de Sistemas Informáticos'],
      metrics: {
        hiredGraduates: 0,
        activeVacancies: 0,
        retentionRate: 0,
        internsCount: 0,
      },
      description: formData.description || 'Solicitud de convenio interinstitucional radicada a través de Vincula Empresas.',
      documents: (formData.documents || []).map((doc, idx) => ({
        id: `doc-${id}-${idx + 1}`,
        title: doc.title,
        type: doc.type || 'Soporte Legal',
        fileName: doc.fileName || `Documento_${idx + 1}.pdf`,
        fileSize: doc.fileSize || '1.8 MB',
        uploadDate: today,
        status: 'en_revision',
      })),
      timeline: [
        {
          date: today,
          event: `Solicitud radicada a la Dirección de Extensión de ${inst.shortName} (Radicado ${agreementCode})`,
        },
      ],
    };

    setAgreements((prev) => {
      const next = [newAgreement, ...prev];
      writeAgreements(next);
      return next;
    });

    return newAgreement;
  }, []);

  /**
   * Radica la solicitud de renovación para un convenio vigente o por renovar.
   */
  const requestRenewal = useCallback((agreementId, { notes, durationYears = 2, additionalDocs = [] } = {}) => {
    const today = new Date().toISOString().slice(0, 10);

    setAgreements((prev) => {
      const next = prev.map((agr) => {
        if (agr.id !== agreementId) return agr;

        const newDocs = additionalDocs.map((doc, idx) => ({
          id: `doc-ren-${agr.id}-${idx + 1}`,
          title: doc.title || 'Soporte de Renovación',
          type: 'Soporte Renovación',
          fileName: doc.fileName || 'Soporte_Renovacion.pdf',
          fileSize: doc.fileSize || '1.5 MB',
          uploadDate: today,
          status: 'en_revision',
        }));

        const renewalEvent = {
          date: today,
          event: `Solicitud formal de prórroga/renovación por ${durationYears} año(s) remitida a la IES${notes ? ` · Nota: ${notes}` : ''}`,
        };

        return {
          ...agr,
          status: 'en_revision',
          renewalPending: true,
          renewalRequestedAt: today,
          renewalNotes: notes || '',
          requestedDurationYears: durationYears,
          documents: [...newDocs, ...agr.documents],
          timeline: [renewalEvent, ...agr.timeline],
        };
      });

      writeAgreements(next);
      return next;
    });
  }, []);

  /**
   * Sube un documento o anexo a un convenio existente.
   */
  const uploadDocument = useCallback((agreementId, docData) => {
    const today = new Date().toISOString().slice(0, 10);

    setAgreements((prev) => {
      const next = prev.map((agr) => {
        if (agr.id !== agreementId) return agr;

        const newDoc = {
          id: `doc-${agr.id}-${Date.now().toString().slice(-4)}`,
          title: docData.title || 'Anexo legal',
          type: docData.type || 'Anexo',
          fileName: docData.fileName || 'Anexo_Legal.pdf',
          fileSize: docData.fileSize || '2.0 MB',
          uploadDate: today,
          status: 'en_revision',
        };

        const timelineEvent = {
          date: today,
          event: `Nuevo documento anexo adjuntado: ${newDoc.title} (${newDoc.fileName})`,
        };

        return {
          ...agr,
          documents: [newDoc, ...agr.documents],
          timeline: [timelineEvent, ...agr.timeline],
        };
      });

      writeAgreements(next);
      return next;
    });
  }, []);

  /**
   * Cancela una solicitud en revisión.
   */
  const cancelRequest = useCallback((agreementId) => {
    setAgreements((prev) => {
      const next = prev.filter((agr) => agr.id !== agreementId);
      writeAgreements(next);
      return next;
    });
  }, []);

  /**
   * Restablece los convenios al estado semilla.
   */
  const resetAgreements = useCallback(() => {
    writeAgreements(initialAgreements);
    setAgreements(initialAgreements);
  }, []);

  return {
    agreements,
    requestAgreement,
    requestRenewal,
    uploadDocument,
    cancelRequest,
    resetAgreements,
  };
}

