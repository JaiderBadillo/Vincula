import { useEffect, useState } from 'react';
import { authService, extractErrorMessage } from '../../services/authService.js';

const API = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function privacyRequest(path = '', method = 'GET', payload) {
  const response = await fetch(`${API}/auth/cuenta/configuracion${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${authService.getToken()}`,
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, 'No fue posible procesar la solicitud.'));
  }
  return data;
}

function formatDataPreview(datos) {
  if (!datos) return 'Sin registros en esta categoría.';
  if (Array.isArray(datos)) {
    if (datos.length === 0) return 'Sin registros almacenados actualmente.';
    return JSON.stringify(datos, null, 2);
  }
  if (typeof datos === 'object' && Object.keys(datos).length === 0) {
    return 'Sin registros almacenados actualmente.';
  }
  return JSON.stringify(datos, null, 2);
}

export default function PrivacyAndDataPanel({ role }) {
  const [dataReport, setDataReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selección de categorías para descargar (Caso de uso: Descargar datos personales <<include>> Seleccionar los datos)
  const [selectedCategories, setSelectedCategories] = useState({
    cuenta: true,
    perfil: true,
    documentos: true,
    actividad: true,
  });
  const [downloadFormat, setDownloadFormat] = useState('json'); // 'json' | 'txt'
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Estado para Solicitar supresión de datos <<include>> Eliminar cuenta
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [confirmWord, setConfirmWord] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    privacyRequest('/mis-datos')
      .then((res) => {
        if (!cancelled) {
          setDataReport(res);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleCategory(catId) {
    setSelectedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  }

  function handleDownloadPersonalData() {
    setError('');
    setSuccess('');
    if (!dataReport || !Array.isArray(dataReport.tratamiento_resumen)) return;

    const chosen = dataReport.tratamiento_resumen.filter((cat) => selectedCategories[cat.id]);
    if (chosen.length === 0) {
      setError('Selecciona al menos una categoría de datos para descargar.');
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    let blob;
    let filename;

    if (downloadFormat === 'json') {
      const exportPayload = {
        plataforma: 'Vincula - Red de Talento Universitario',
        fecha_exportacion: dataReport.generado_en || new Date().toISOString(),
        titular: dataReport.titular,
        categorias_seleccionadas: chosen.map((c) => ({
          id: c.id,
          categoria: c.titulo,
          que_datos_almacena_vincula: c.que_tenemos,
          finalidad_y_uso_en_vincula: c.que_hacemos,
          datos_registrados: c.datos,
        })),
      };
      blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      filename = `mis-datos-vincula-${timestamp}.json`;
    } else {
      const lines = [
        '====================================================================',
        'INFORME DE TRANSPARENCIA Y DATOS PERSONALES — PLATAFORMA VINCULA',
        '====================================================================',
        `Fecha de generación: ${new Date().toLocaleString('es-CO')}`,
        `Titular: ${dataReport.titular?.nombre || ''} (${dataReport.titular?.correo || ''})`,
        `Rol en el sistema: ${dataReport.titular?.rol || ''}`,
        '',
      ];
      chosen.forEach((c, idx) => {
        lines.push(`${idx + 1}. ${c.titulo.toUpperCase()}`);
        lines.push(`   - ¿Qué datos tiene Vincula?: ${c.que_tenemos}`);
        lines.push(`   - ¿Qué hace Vincula con ellos?: ${c.que_hacemos}`);
        lines.push('   - Datos almacenados actualmente:');
        lines.push(
          formatDataPreview(c.datos)
            .split('\n')
            .map((l) => `     ${l}`)
            .join('\n')
        );
        lines.push('');
      });
      blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      filename = `mis-datos-vincula-${timestamp}.txt`;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccess(`Se descargó tu archivo (${filename}) con ${chosen.length} categoría(s) seleccionada(s).`);
  }

  async function handleDeleteAccount(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (confirmWord.trim().toUpperCase() !== 'ELIMINAR') {
      setError('Debes escribir exactamente la palabra ELIMINAR para confirmar la supresión de tu cuenta.');
      return;
    }
    if (!currentPassword) {
      setError('Ingresa tu contraseña actual para autorizar la eliminación de la cuenta.');
      return;
    }

    setDeleting(true);
    try {
      await privacyRequest('/eliminar-cuenta', 'POST', {
        contrasena_actual: currentPassword,
        confirmacion: confirmWord.trim().toUpperCase(),
        motivo: deleteReason.trim() || undefined,
      });
      authService.logout();
      try {
        localStorage.removeItem('vincula.profile.v1');
      } catch {
        // noop
      }
      window.location.assign('/login?logout=1');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  const isSuperAdmin = role === 'vincula_admin' || dataReport?.titular?.rol === 'superadmin_vincula';

  if (loading) {
    return (
      <div className="rounded-2xl border border-sand-line bg-cream/30 p-6 text-center text-sm text-secondary">
        <i className="bx bx-loader-alt bx-spin mr-2 text-lg text-green" />
        Consultando el inventario de tus datos personales en Vincula…
      </div>
    );
  }

  const categories = dataReport?.tratamiento_resumen || [];

  return (
    <div className="space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-terracotta/30 bg-terracotta/10 p-3 text-xs font-semibold text-terracotta-dark"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-green/25 bg-green/10 p-3 text-xs font-semibold text-green-dark"
        >
          {success}
        </p>
      )}

      {/* ─── 1. Transparencia: ¿Qué datos tiene Vincula y qué hace con ellos? ─── */}
      <section className="space-y-3">
        <div>
          <h3 className="m-0 text-lg font-bold text-ink">
            ¿Qué datos tiene Vincula sobre ti y qué hace con ellos?
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-secondary">
            En cumplimiento del derecho de Habeas Data (Ley 1581 de 2012), aquí puedes consultar qué
            información almacena Vincula en su base de datos, con qué finalidad se procesa cada bloque y
            seleccionar los datos que deseas descargar en tu dispositivo.
          </p>
        </div>

        <div className="space-y-3">
          {categories.map((cat) => {
            const isSelected = Boolean(selectedCategories[cat.id]);
            const isExpanded = expandedCategory === cat.id;
            return (
              <div
                key={cat.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  isSelected ? 'border-green/40 bg-green/5' : 'border-sand-line bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCategory(cat.id)}
                      className="mt-1 size-4 accent-green cursor-pointer"
                    />
                    <div className="space-y-1.5">
                      <span className="block text-sm font-bold text-ink">{cat.titulo}</span>
                      <p className="m-0 text-xs leading-relaxed text-ink/90">
                        <strong className="text-cocoa">Qué tenemos:</strong> {cat.que_tenemos}
                      </p>
                      <p className="m-0 text-xs leading-relaxed text-secondary">
                        <strong className="text-green-dark">Qué hacemos con esto:</strong> {cat.que_hacemos}
                      </p>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                    className="shrink-0 rounded-lg border border-sand-line bg-white px-2.5 py-1.5 text-[0.7rem] font-bold text-ink hover:bg-sand/50 transition-colors cursor-pointer"
                  >
                    {isExpanded ? 'Ocultar datos' : 'Ver mis datos'}
                  </button>
                </div>

                {isExpanded && (
                  <pre className="mt-3 max-h-48 overflow-auto rounded-xl border border-sand-line bg-white p-3 font-mono text-[0.68rem] leading-relaxed text-ink">
                    {formatDataPreview(cat.datos)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 2. Descargar datos personales (<<include>> Seleccionar los datos) ─── */}
      <section className="rounded-2xl border border-sand-line bg-cream/40 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="m-0 text-sm font-bold text-ink flex items-center gap-1.5">
              <i className="bx bx-download text-base text-green-dark" />
              <span>Descargar mis datos personales</span>
            </h4>
            <p className="m-0 mt-0.5 text-xs text-secondary">
              Marca arriba las categorías que deseas incluir y elige el formato de exportación.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value)}
              aria-label="Formato de descarga"
              className="rounded-xl border border-sand-line bg-white px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-green cursor-pointer"
            >
              <option value="json">Formato JSON (.json)</option>
              <option value="txt">Resumen legible (.txt)</option>
            </select>

            <button
              type="button"
              onClick={handleDownloadPersonalData}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-dark px-4 py-2 text-xs font-bold text-white hover:bg-green transition-colors cursor-pointer"
            >
              <i className="bx bx-export text-sm" />
              <span>Descargar datos seleccionados</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── 3. Solicitar supresión de datos (<<include>> Eliminar cuenta) ─── */}
      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="m-0 text-sm font-bold text-rose-900 flex items-center gap-1.5">
              <i className="bx bx-trash text-base text-rose-700" />
              <span>Solicitar supresión de datos y eliminar cuenta</span>
            </h4>
            <p className="m-0 text-xs leading-relaxed text-rose-800">
              Al solicitar la supresión de tus datos, Vincula eliminará de forma permanente tu cuenta de
              acceso, tu perfil, tus postulaciones activas y los documentos asociados. Esta acción no se
              puede deshacer.
            </p>
          </div>

          {!isSuperAdmin && !showDeleteForm && (
            <button
              type="button"
              onClick={() => {
                setShowDeleteForm(true);
                setError('');
                setSuccess('');
              }}
              className="shrink-0 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
            >
              Solicitar supresión / Eliminar cuenta
            </button>
          )}
        </div>

        {isSuperAdmin && (
          <p className="m-0 rounded-xl border border-rose-200 bg-white/80 p-3 text-xs text-rose-900">
            La cuenta principal de Superadministrador de la plataforma está protegida contra eliminación
            para garantizar la continuidad operativa de Vincula.
          </p>
        )}

        {!isSuperAdmin && showDeleteForm && (
          <form
            onSubmit={handleDeleteAccount}
            className="mt-3 space-y-3 rounded-xl border border-rose-200 bg-white p-4"
          >
            <p className="m-0 text-xs font-bold text-rose-900">
              Confirmación de supresión definitiva de cuenta
            </p>

            <label className="grid gap-1 text-xs font-semibold text-ink">
              Motivo de la solicitud (opcional)
              <input
                type="text"
                maxLength={500}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ej. Ya no requiero usar la bolsa de empleo..."
                className="w-full rounded-xl border border-sand-line bg-white px-3 py-2 text-xs text-ink outline-none focus:border-rose-500"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-ink">
                Escribe ELIMINAR para confirmar
                <input
                  type="text"
                  required
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  placeholder="ELIMINAR"
                  className="w-full rounded-xl border border-sand-line bg-white px-3 py-2 text-xs font-bold uppercase text-ink outline-none focus:border-rose-500"
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold text-ink">
                Tu contraseña actual
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full rounded-xl border border-sand-line bg-white px-3 py-2 text-xs text-ink outline-none focus:border-rose-500"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteForm(false);
                  setConfirmWord('');
                  setCurrentPassword('');
                  setDeleteReason('');
                }}
                className="rounded-xl border border-sand-line bg-white px-3.5 py-2 text-xs font-semibold text-secondary hover:bg-sand/40 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={deleting || confirmWord.trim().toUpperCase() !== 'ELIMINAR' || !currentPassword}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {deleting ? 'Eliminando cuenta…' : 'Confirmar y eliminar mi cuenta'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
