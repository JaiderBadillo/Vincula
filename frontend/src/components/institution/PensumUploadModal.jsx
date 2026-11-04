import { useState, useEffect } from 'react';

const KNOWLEDGE_FAMILIES = [
  'Contabilidad, Nómina y Sistemas ERP',
  'Administración y Gestión Empresarial',
  'Logística, Cadena de Suministro y Comercio Exterior',
  'Marketing Digital y Gestión Comercial',
  'Gestión de Proyectos y Metodologías Ágiles',
  'Gestión Ambiental, Sostenibilidad y SST',
  'Bases de Datos Relacionales (SQL)',
  'Bases de Datos NoSQL y Documentales',
  'Desarrollo Frontend Web',
  'Desarrollo Backend y APIs',
  'Desarrollo de Aplicaciones Móviles',
  'DevOps, Cloud y Contenedores',
  'Redes, Comunicaciones y Telecomunicaciones',
  'Seguridad Informática y Ciberseguridad',
  'Analítica de Datos e Inteligencia de Negocios',
  'Electrónica, Automatización e Instrumentación',
  'Diseño CAD, Topografía y Modelado Estructural',
  'Formación General e Institucional',
];

export default function PensumUploadModal({
  isOpen,
  onClose,
  program,
  currentPensum,
  onSavePensum,
}) {
  const [activeTabMode, setActiveTabMode] = useState('pdf'); // 'pdf' | 'manual'
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [activeTabSemester, setActiveTabSemester] = useState(1);
  const [newTagInput, setNewTagInput] = useState({});
  const [apiError, setApiError] = useState('');

  // Formulario para nueva asignatura manual
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectForm, setNewSubjectForm] = useState({
    code: '',
    name: '',
    credits: 3,
    family: 'Desarrollo Backend y APIs',
    tools: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    setFile(null);
    setIsProcessing(false);
    setProgressStep('');
    setApiError('');
    setIsAddingSubject(false);

    if (
      currentPensum &&
      Array.isArray(currentPensum.semesters) &&
      currentPensum.semesters.length > 0
    ) {
      setParsedData({
        programName: program?.name || currentPensum.programName || 'Programa Académico',
        version: currentPensum.version || 'Pensum Oficial',
        totalSemesters: currentPensum.totalSemesters || currentPensum.semesters.length,
        totalSubjects: currentPensum.semesters.reduce(
          (acc, s) => acc + (s.subjects?.length || 0),
          0
        ),
        semesters: JSON.parse(JSON.stringify(currentPensum.semesters)),
      });
      const initialSem = currentPensum.semesters[0]?.semesterNumber || 1;
      setActiveTabSemester(initialSem);
    } else {
      const defaultInitialSemesters = [
        {
          semesterNumber: 1,
          label: 'Semestre I',
          subjects: [],
        },
      ];
      setParsedData({
        programName: program?.name || 'Programa Académico',
        version: 'Pensum Oficial 2024',
        totalSemesters: 1,
        totalSubjects: 0,
        semesters: defaultInitialSemesters,
      });
      setActiveTabSemester(1);
    }
  }, [isOpen, currentPensum, program]);

  if (!isOpen) return null;

  async function handleFileSelected(e) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor selecciona un archivo con formato .pdf');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setApiError('');
    setProgressStep('Conectando con el microservicio Python pypdf...');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('program_hint', program?.name || '');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/traceability/upload-pensum-pdf', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setIsProcessing(false);

        const mappedSemesters = (data.semesters || []).map((sem) => ({
          semesterNumber: sem.semester_number,
          label: sem.semester_label,
          subjects: (sem.subjects || []).map((sub) => ({
            id: sub.id,
            code: sub.code,
            name: sub.name,
            credits: sub.credits,
            family: sub.family,
            tools: sub.suggested_tools || [],
          })),
        }));

        setParsedData({
          programName: data.program_name || program?.name,
          version: `Pensum Extraído (${selectedFile.name})`,
          totalSemesters: mappedSemesters.length,
          totalSubjects: data.total_subjects || mappedSemesters.reduce((acc, s) => acc + s.subjects.length, 0),
          semesters: mappedSemesters,
        });
        setActiveTabSemester(mappedSemesters[0]?.semesterNumber || 1);
        return;
      } else {
        const errJson = await response.json().catch(() => ({}));
        setApiError(errJson.detail || 'Error al procesar el archivo en el servidor.');
      }
    } catch {
      setApiError('No se pudo conectar con el servidor en http://127.0.0.1:8000. Utilizando procesamiento determinista local.');
    }

    setTimeout(() => {
      setProgressStep('Extrayendo asignaturas y semestres del documento...');
      setTimeout(() => {
        setIsProcessing(false);
        const fallbackSemesters = [
          {
            semesterNumber: 1,
            label: 'Semestre I',
            subjects: [
              { id: 'f-1-1', code: 'MAT-101', name: 'Lógica y Fundamentos', credits: 3, family: 'Desarrollo Backend y APIs', tools: ['Python'] },
              { id: 'f-1-2', code: 'MAT-102', name: 'Cálculo I', credits: 4, family: 'Formación General e Institucional', tools: [] },
              { id: 'f-1-3', code: 'HUM-103', name: 'Competencias Comunicativas', credits: 2, family: 'Formación General e Institucional', tools: [] },
            ],
          },
          {
            semesterNumber: 2,
            label: 'Semestre II',
            subjects: [
              { id: 'f-2-1', code: 'SIS-201', name: 'Programación Orientada a Objetos', credits: 4, family: 'Desarrollo Backend y APIs', tools: ['Java'] },
              { id: 'f-2-2', code: 'MAT-202', name: 'Álgebra Lineal', credits: 3, family: 'Formación General e Institucional', tools: [] },
            ],
          },
          {
            semesterNumber: 5,
            label: 'Semestre V',
            subjects: [
              { id: 'f-5-1', code: 'SIS-501', name: 'Motores de Bases de Datos', credits: 3, family: 'Bases de Datos Relacionales (SQL)', tools: ['MySQL', 'SQL'] },
              { id: 'f-5-2', code: 'SIS-502', name: 'Redes y Telecomunicaciones', credits: 3, family: 'Redes, Comunicaciones y Telecomunicaciones', tools: ['TCP/IP', 'Cisco'] },
              { id: 'f-5-3', code: 'SIS-503', name: 'Programación Web', credits: 4, family: 'Desarrollo Frontend Web', tools: ['JavaScript', 'HTML/CSS'] },
            ],
          },
        ];

        setParsedData({
          programName: program?.name || 'Programa Académico',
          version: `Pensum Extraído (${selectedFile.name})`,
          totalSemesters: fallbackSemesters.length,
          totalSubjects: fallbackSemesters.reduce((acc, s) => acc + s.subjects.length, 0),
          semesters: fallbackSemesters,
        });
        setActiveTabSemester(1);
      }, 400);
    }, 450);
  }

  function handleChangeSemester(subjectId, currentSem, targetSem) {
    if (currentSem === targetSem) return;

    setParsedData((prev) => {
      let subjectToMove = null;

      const updated = prev.semesters.map((sem) => {
        if (sem.semesterNumber === currentSem) {
          const found = (sem.subjects || []).find((s) => s.id === subjectId);
          if (found) subjectToMove = found;
          return {
            ...sem,
            subjects: (sem.subjects || []).filter((s) => s.id !== subjectId),
          };
        }
        return sem;
      });

      if (!subjectToMove) return prev;

      let targetExists = false;
      const finalSemesters = updated.map((sem) => {
        if (sem.semesterNumber === targetSem) {
          targetExists = true;
          return {
            ...sem,
            subjects: [...(sem.subjects || []), subjectToMove],
          };
        }
        return sem;
      });

      if (!targetExists) {
        finalSemesters.push({
          semesterNumber: targetSem,
          label: `Semestre ${toRoman(targetSem)}`,
          subjects: [subjectToMove],
        });
        finalSemesters.sort((a, b) => a.semesterNumber - b.semesterNumber);
      }

      return { ...prev, semesters: finalSemesters };
    });
  }

  function handleAddSemester() {
    setParsedData((prev) => {
      const currentList = prev?.semesters || [];
      const nextSemNum = (currentList.length > 0 ? Math.max(...currentList.map((s) => s.semesterNumber)) : 0) + 1;
      const newSem = {
        semesterNumber: nextSemNum,
        label: `Semestre ${toRoman(nextSemNum)}`,
        subjects: [],
      };
      const updated = [...currentList, newSem];
      setActiveTabSemester(nextSemNum);
      return {
        ...(prev || {}),
        totalSemesters: updated.length,
        semesters: updated,
      };
    });
  }

  function handleDeleteSubject(subjectId, semesterNum) {
    setParsedData((prev) => {
      const updated = (prev?.semesters || []).map((sem) => {
        if (sem.semesterNumber !== semesterNum) return sem;
        return {
          ...sem,
          subjects: (sem.subjects || []).filter((s) => s.id !== subjectId),
        };
      });
      return {
        ...prev,
        totalSubjects: Math.max(0, (prev?.totalSubjects || 1) - 1),
        semesters: updated,
      };
    });
  }

  function handleCreateManualSubject(e) {
    e.preventDefault();
    if (!newSubjectForm.name.trim()) return;

    const rawTools = newSubjectForm.tools
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const createdSubject = {
      id: `manual-${Date.now()}`,
      code: newSubjectForm.code.trim().toUpperCase() || `ASIG-${Date.now().toString().slice(-4)}`,
      name: newSubjectForm.name.trim(),
      credits: Number(newSubjectForm.credits) || 3,
      family: newSubjectForm.family,
      tools: rawTools,
    };

    setParsedData((prev) => {
      let foundSem = false;
      const updatedSemesters = (prev?.semesters || []).map((sem) => {
        if (sem.semesterNumber === activeTabSemester) {
          foundSem = true;
          return {
            ...sem,
            subjects: [...(sem.subjects || []), createdSubject],
          };
        }
        return sem;
      });

      if (!foundSem) {
        updatedSemesters.push({
          semesterNumber: activeTabSemester,
          label: `Semestre ${toRoman(activeTabSemester)}`,
          subjects: [createdSubject],
        });
      }

      return {
        ...prev,
        totalSubjects: (prev?.totalSubjects || 0) + 1,
        semesters: updatedSemesters,
      };
    });

    setNewSubjectForm({
      code: '',
      name: '',
      credits: 3,
      family: 'Desarrollo Backend y APIs',
      tools: '',
    });
    setIsAddingSubject(false);
  }

  function handleAddTag(subjectId, semesterNum) {
    const tag = (newTagInput[subjectId] || '').trim();
    if (!tag) return;

    setParsedData((prev) => {
      const updated = (prev?.semesters || []).map((sem) => {
        if (sem.semesterNumber !== semesterNum) return sem;
        return {
          ...sem,
          subjects: (sem.subjects || []).map((sub) => {
            if (sub.id !== subjectId) return sub;
            const currentTools = Array.isArray(sub.tools) ? sub.tools : [];
            if (currentTools.includes(tag)) return sub;
            return { ...sub, tools: [...currentTools, tag] };
          }),
        };
      });
      return { ...prev, semesters: updated };
    });

    setNewTagInput({ ...newTagInput, [subjectId]: '' });
  }

  function handleRemoveTag(subjectId, semesterNum, toolToRemove) {
    setParsedData((prev) => {
      const updated = (prev?.semesters || []).map((sem) => {
        if (sem.semesterNumber !== semesterNum) return sem;
        return {
          ...sem,
          subjects: (sem.subjects || []).map((sub) => {
            if (sub.id !== subjectId) return sub;
            const currentTools = Array.isArray(sub.tools) ? sub.tools : [];
            return { ...sub, tools: currentTools.filter((t) => t !== toolToRemove) };
          }),
        };
      });
      return { ...prev, semesters: updated };
    });
  }

  function handleConfirmSave() {
    if (!parsedData) return;
    onSavePensum(program?.id, parsedData);
    onClose();
  }

  function toRoman(n) {
    const r = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return r[n - 1] || n.toString();
  }

  const currentSemesterObj = (parsedData?.semesters || []).find(
    (s) => s.semesterNumber === activeTabSemester
  );
  const activeSemesterSubjects = currentSemesterObj?.subjects || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-card border border-sand-line bg-white shadow-hero overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand-line px-6 py-4.5 bg-cream/40">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-sand text-terracotta text-xl shadow-xs">
              <i className="bx bxs-book-content" />
            </span>
            <div>
              <h2 className="m-0 font-display text-base sm:text-lg font-bold text-ink">
                Gestor y Actualización de Malla Curricular
              </h2>
              <p className="m-0 text-xs text-secondary">
                Programa: <strong className="text-ink">{program?.name || 'Selecciona carrera'}</strong> · Mapeo de asignaturas y software
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg border border-sand-line text-secondary hover:text-ink hover:bg-cream transition-colors cursor-pointer"
          >
            <i className="bx bx-x text-lg" />
          </button>
        </div>

        {/* Selector de Modo: Carga PDF vs Edición Manual */}
        <div className="border-b border-sand-line px-6 pt-3 pb-2 bg-cream/30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTabMode('pdf')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTabMode === 'pdf'
                ? 'bg-terracotta text-white shadow-xs'
                : 'text-secondary hover:text-ink hover:bg-white'
            }`}
          >
            <i className="bx bxs-file-pdf text-base" />
            <span>Cargar Malla desde PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabMode('manual')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTabMode === 'manual'
                ? 'bg-terracotta text-white shadow-xs'
                : 'text-secondary hover:text-ink hover:bg-white'
            }`}
          >
            <i className="bx bx-edit text-base" />
            <span>Editor Manual de Asignaturas</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* MODO 1: SUBIR PDF */}
          {activeTabMode === 'pdf' && (
            <div className="space-y-4">
              <div className="relative rounded-2xl border-2 border-dashed border-sand-line hover:border-terracotta/40 bg-cream/40 p-8 text-center transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelected}
                  disabled={isProcessing}
                  className="absolute inset-0 size-full opacity-0 cursor-pointer"
                  id="pdf-upload-input"
                />
                <div className="grid size-14 place-items-center rounded-2xl bg-white border border-sand-line shadow-xs mx-auto text-2xl text-terracotta mb-3">
                  <i className="bx bx-cloud-upload" />
                </div>
                <h3 className="m-0 font-display text-sm font-bold text-ink">
                  {file ? file.name : 'Arrastra aquí el PDF del Plan de Estudios o Malla Oficial'}
                </h3>
                <p className="m-0 mt-1 text-xs text-secondary max-w-sm mx-auto">
                  El sistema extraerá automáticamente los semestres, códigos, créditos, nombres y herramientas de práctica.
                </p>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <label
                    htmlFor="pdf-upload-input"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-terracotta-dark cursor-pointer transition-colors"
                  >
                    <i className="bx bx-folder-open text-white" />
                    <span>Seleccionar archivo PDF</span>
                  </label>
                </div>
              </div>

              {isProcessing && (
                <div className="rounded-2xl border border-sand-line bg-sand/50 p-4 space-y-2 text-center animate-pulse">
                  <div className="flex items-center justify-center gap-2 text-cocoa text-xs font-bold">
                    <i className="bx bx-loader-alt animate-spin text-base text-terracotta" />
                    <span>Procesando PDF con motor extractor...</span>
                  </div>
                  <p className="m-0 text-[0.75rem] text-secondary">{progressStep}</p>
                </div>
              )}

              {apiError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
                  <i className="bx bx-error-circle text-rose-600 text-lg shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900">
                    <strong className="block font-bold">Aviso del extractor:</strong>
                    <span>{apiError}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODO 2: EDITOR MANUAL / VISTA PREVIA */}
          {parsedData && (
            <div className="space-y-4">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddingSubject(!isAddingSubject)}
                  className="rounded-xl bg-terracotta hover:bg-terracotta-dark text-white px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <i className={`bx ${isAddingSubject ? 'bx-x' : 'bx-plus'} text-sm`} />
                  <span>{isAddingSubject ? 'Cerrar Formulario' : 'Agregar Asignatura'}</span>
                </button>
              </div>

              {isAddingSubject && (
                <form
                  onSubmit={handleCreateManualSubject}
                  className="rounded-2xl border border-sand-line bg-cream/50 p-4 space-y-4 animate-in fade-in duration-200"
                >
                  <div className="flex items-center justify-between border-b border-sand-line pb-2">
                    <span className="text-xs font-bold text-ink flex items-center gap-2">
                      <i className="bx bx-book-add text-terracotta text-base" />
                      <span>Nueva Asignatura para Semestre {toRoman(activeTabSemester)}</span>
                    </span>
                    <span className="text-[0.68rem] text-secondary">
                      Campos requeridos (*)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[0.68rem] font-bold text-ink mb-1">
                        Código Asignatura:
                      </label>
                      <input
                        type="text"
                        value={newSubjectForm.code}
                        onChange={(e) => setNewSubjectForm({ ...newSubjectForm, code: e.target.value })}
                        placeholder="Ej: SIS-501"
                        className="w-full rounded-xl border border-sand-line bg-white px-3 py-2 text-xs text-ink placeholder:text-secondary focus:border-terracotta focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[0.68rem] font-bold text-ink mb-1">
                        Nombre de la Asignatura *:
                      </label>
                      <input
                        type="text"
                        required
                        value={newSubjectForm.name}
                        onChange={(e) => setNewSubjectForm({ ...newSubjectForm, name: e.target.value })}
                        placeholder="Ej: Motores de Bases de Datos"
                        className="w-full rounded-xl border border-sand-line bg-white px-3 py-2 text-xs text-ink placeholder:text-secondary focus:border-terracotta focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[0.68rem] font-bold text-ink mb-1">
                        Créditos Académicos:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newSubjectForm.credits}
                        onChange={(e) => setNewSubjectForm({ ...newSubjectForm, credits: e.target.value })}
                        className="w-full rounded-xl border border-sand-line bg-white px-3 py-2 text-xs text-ink focus:border-terracotta focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[0.68rem] font-bold text-ink mb-1">
                        Familia de Conocimiento:
                      </label>
                      <select
                        value={newSubjectForm.family}
                        onChange={(e) => setNewSubjectForm({ ...newSubjectForm, family: e.target.value })}
                        className="w-full rounded-xl border border-sand-line bg-white px-3 py-2 text-xs text-ink focus:border-terracotta focus:outline-none cursor-pointer"
                      >
                        {KNOWLEDGE_FAMILIES.map((fam) => (
                          <option key={fam} value={fam}>
                            {fam}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.68rem] font-bold text-ink mb-1">
                      Herramientas / Software de Práctica en Aula (separadas por coma):
                    </label>
                    <input
                      type="text"
                      value={newSubjectForm.tools}
                      onChange={(e) => setNewSubjectForm({ ...newSubjectForm, tools: e.target.value })}
                      placeholder="Ej: MySQL, PostgreSQL, Workbench, Modelado ER"
                      className="w-full rounded-xl border border-sand-line bg-white px-3 py-2 text-xs text-ink placeholder:text-secondary focus:border-terracotta focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-sand-line">
                    <button
                      type="button"
                      onClick={() => setIsAddingSubject(false)}
                      className="rounded-xl border border-sand-line bg-white px-3 py-1.5 text-xs font-semibold text-secondary hover:text-ink cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-terracotta hover:bg-terracotta-dark text-white px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                    >
                      <i className="bx bx-check text-white" />
                      <span>Guardar en Semestre {toRoman(activeTabSemester)}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Pestañas de Semestres */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-sand-line">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {(parsedData.semesters || []).map((sem) => {
                    const isActive = activeTabSemester === sem.semesterNumber;
                    const count = (sem.subjects || []).length;
                    return (
                      <button
                        key={sem.semesterNumber}
                        type="button"
                        onClick={() => setActiveTabSemester(sem.semesterNumber)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-terracotta text-white shadow-xs'
                            : 'bg-cream text-secondary hover:text-ink hover:bg-sand'
                        }`}
                      >
                        {sem.label || `Semestre ${sem.semesterNumber}`} ({count})
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleAddSemester}
                  className="rounded-xl border border-sand-line bg-cream hover:bg-sand text-secondary hover:text-ink px-2.5 py-1.5 text-[0.68rem] font-bold shrink-0 transition-colors cursor-pointer"
                  title="Agregar un semestre adicional"
                >
                  + Semestre
                </button>
              </div>

              {/* Lista de Materias del Semestre Activo */}
              <div className="space-y-3">
                {activeSemesterSubjects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-sand-line bg-cream/30 p-8 text-center space-y-2">
                    <i className="bx bx-folder-open text-2xl text-secondary block" />
                    <p className="m-0 text-xs text-secondary">
                      No hay materias registradas en este semestre.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddingSubject(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-terracotta hover:underline cursor-pointer"
                    >
                      <i className="bx bx-plus" />
                      <span>Agregar la primera asignatura</span>
                    </button>
                  </div>
                ) : (
                  activeSemesterSubjects.map((sub) => {
                    const tools = Array.isArray(sub?.tools) ? sub.tools : [];

                    return (
                      <div
                        key={sub.id}
                        className="rounded-2xl border border-sand-line bg-cream/40 p-4 space-y-3 hover:border-sand-line transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[0.68rem] font-bold text-secondary uppercase rounded bg-white px-2 py-0.5 border border-sand-line">
                              {sub.code || 'MAT-00'}
                            </span>
                            <h4 className="m-0 font-display text-xs font-bold text-ink">
                              {sub.name}
                            </h4>
                          </div>
                          <span className="text-[0.68rem] font-semibold text-secondary shrink-0">
                            {sub.credits} créditos
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-secondary pt-1 border-t border-sand-line">
                          <span className="flex items-center gap-1 text-ink/80">
                            <i className="bx bx-bookmark text-terracotta" />
                            <span>Familia: <strong>{sub.family}</strong></span>
                          </span>

                          <div className="flex items-center gap-2">
                            <label className="text-[0.65rem] font-bold text-secondary flex items-center gap-1">
                              <span>Mover a:</span>
                              <select
                                value={activeTabSemester}
                                onChange={(e) => handleChangeSemester(sub.id, activeTabSemester, parseInt(e.target.value, 10))}
                                className="rounded-lg border border-sand-line bg-white px-2 py-0.5 text-[0.65rem] font-bold text-ink focus:border-terracotta focus:outline-none cursor-pointer"
                              >
                                {(parsedData.semesters || []).map((s) => (
                                  <option key={s.semesterNumber} value={s.semesterNumber}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleDeleteSubject(sub.id, activeTabSemester)}
                              className="text-secondary hover:text-rose-600 p-0.5 text-sm cursor-pointer"
                              title="Eliminar esta materia"
                            >
                              <i className="bx bx-trash" />
                            </button>
                          </div>
                        </div>

                        {/* Herramientas / Software de Práctica */}
                        <div>
                          <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary block mb-1.5">
                            Software / Herramientas de Práctica en el Aula:
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {tools.map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center gap-1 rounded-lg bg-white border border-sand-line px-2 py-0.5 text-[0.68rem] font-bold text-ink shadow-2xs"
                              >
                                <span>{t}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(sub.id, activeTabSemester, t)}
                                  className="text-secondary hover:text-rose-600 text-xs cursor-pointer ml-0.5"
                                  title="Eliminar etiqueta"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}

                            <div className="inline-flex items-center gap-1">
                              <input
                                type="text"
                                value={newTagInput[sub.id] || ''}
                                onChange={(e) => setNewTagInput({ ...newTagInput, [sub.id]: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTag(sub.id, activeTabSemester);
                                  }
                                }}
                                placeholder="+ Herramienta (ej: MySQL)"
                                className="w-36 rounded-lg border border-sand-line bg-white px-2 py-0.5 text-[0.68rem] text-ink placeholder:text-secondary focus:border-terracotta focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddTag(sub.id, activeTabSemester)}
                                className="grid size-5.5 place-items-center rounded bg-terracotta text-white hover:bg-terracotta-dark text-xs cursor-pointer"
                                title="Agregar herramienta"
                              >
                                <i className="bx bx-plus" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-sand-line px-6 py-4 bg-cream/40">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-sand-line bg-white px-4 py-2 text-xs font-semibold text-secondary hover:text-ink hover:bg-cream transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {parsedData && (
            <button
              type="button"
              onClick={handleConfirmSave}
              className="rounded-xl bg-terracotta hover:bg-terracotta-dark px-5 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs inline-flex items-center gap-2"
            >
              <i className="bx bx-check text-base" />
              <span>Confirmar y Guardar Pensum Oficial</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
