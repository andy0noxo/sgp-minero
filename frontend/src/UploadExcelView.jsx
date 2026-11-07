import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getMasterPeople, getUploadHeaders, importMasterPeople, processUpload } from './api';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_MIMES = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel']);

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function checkRutFormat(val) {
  if (!val || typeof val !== 'string') return false;
  const clean = val.replace(/[^0-9kK]/g, '');
  return clean.length >= 8 && clean.length <= 9;
}

export default function UploadExcelView({ role }) {
  const isAdmin = role === 'Administrador';
  const { faena } = useOutletContext();

  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [fileSummary, setFileSummary] = useState(null);
  const [columnSamples, setColumnSamples] = useState({});
  const [previewRows, setPreviewRows] = useState([]);
  const [mapping, setMapping] = useState({ map_rut: '', map_nombre: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [masterData, setMasterData] = useState({ results: [], pagination: { page: 1, pages: 0, total: 0 } });
  const [masterFilters, setMasterFilters] = useState({ search: '', estado: '', page: 1, page_size: 25 });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const rejectFile = (title, message) => {
    setFile(null);
    setHeaders([]);
    setFileSummary(null);
    setColumnSamples({});
    setPreviewRows([]);
    setMapping({ map_rut: '', map_nombre: '' });
    setResult(null);
    setCurrentStep(1);
    setError(message);
    setToast({ title, message });
  };

  const selectFile = (candidate) => {
    if (!candidate) return;

    if (candidate.size === 0) {
      return rejectFile('Archivo vacío', 'El archivo seleccionado está vacío (0 bytes).');
    }

    if (candidate.size > MAX_FILE_SIZE) {
      return rejectFile(
        'Límite de tamaño excedido',
        `El archivo (${formatFileSize(candidate.size)}) supera el límite de 10 MB.`
      );
    }

    const lowerName = candidate.name.toLowerCase();
    const hasXlsxExt = lowerName.endsWith('.xlsx');
    const hasCsvExt = lowerName.endsWith('.csv');
    const validXLSX = hasXlsxExt && (!candidate.type || candidate.type === XLSX_MIME);
    const validCSV = hasCsvExt && (!candidate.type || CSV_MIMES.has(candidate.type));

    if (isAdmin) {
      if (!validXLSX && !validCSV) {
        return rejectFile(
          'Formato no permitido',
          'Solo se permiten archivos CSV o XLSX estandarizados.'
        );
      }
    } else if (!validXLSX) {
      return rejectFile(
        'Formato no permitido',
        'Solo se permiten planillas Excel (.xlsx).'
      );
    }

    setFile(candidate);
    setHeaders([]);
    setFileSummary(null);
    setColumnSamples({});
    setPreviewRows([]);
    setMapping({ map_rut: '', map_nombre: '' });
    setResult(null);
    setCurrentStep(1);
    setError('');
    setToast(null);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); selectFile(e.dataTransfer.files[0]); };

  const resetForm = () => {
    setFile(null);
    setHeaders([]);
    setFileSummary(null);
    setColumnSamples({});
    setPreviewRows([]);
    setMapping({ map_rut: '', map_nombre: '' });
    setResult(null);
    setCurrentStep(1);
    setError('');
    setToast(null);
  };

  const readHeaders = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setToast(null);
    try {
      const response = await getUploadHeaders(file);
      const data = response.data || {};
      setHeaders(data.headers || []);
      setFileSummary(data.file_summary || null);
      setColumnSamples(data.column_samples || {});
      setPreviewRows(data.preview_rows || []);
      setMapping({ map_rut: '', map_nombre: '' });
      setCurrentStep(2);
    } catch (requestError) {
      setError(requestError.message);
      setToast({ title: 'Error al leer archivo', message: requestError.message });
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError('');
    setToast(null);
    try {
      const response = isAdmin ? await importMasterPeople(file) : await processUpload(file, mapping);
      setResult(response.data);
      if (isAdmin) {
        await loadMasterPeople();
      } else {
        setCurrentStep(4);
      }
    } catch (requestError) {
      setError(requestError.message);
      setToast({ title: 'Error al procesar archivo', message: requestError.message });
    } finally {
      setLoading(false);
    }
  };

  const loadMasterPeople = async (filters = { ...masterFilters, faena }) => {
    setLoading(true);
    try {
      const response = await getMasterPeople(filters);
      setMasterData(response.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadMasterPeople({ ...masterFilters, faena, page: 1 });
  }, [isAdmin, faena]);

  const updateMasterFilter = (key, value) => {
    const nextPage = key === 'page' ? Number(value) : 1;
    const next = { ...masterFilters, [key]: value, page: nextPage };
    setMasterFilters(next);
    loadMasterPeople({ ...next, faena, page: nextPage });
  };

  const isMappingComplete = Boolean(mapping.map_rut && mapping.map_nombre);
  const isSameColumnSelected = Boolean(isMappingComplete && mapping.map_rut === mapping.map_nombre);
  const isMappingValid = Boolean(isMappingComplete && !isSameColumnSelected);
  const canSubmit = isAdmin ? Boolean(file) : Boolean(file && headers.length > 0 && isMappingValid);

  const dynamicColumns = headers.filter((h) => h !== mapping.map_rut && h !== mapping.map_nombre);

  const stepperSteps = [
    { num: 1, title: '1. Archivo Excel', desc: 'Subida e inspección' },
    { num: 2, title: '2. Comparar Encabezados', desc: 'Mapeo con muestras reales' },
    { num: 3, title: '3. Vista Previa Tabla', desc: 'Estructura final a subir' },
    { num: 4, title: '4. Pipeline y Resultado', desc: 'Trazabilidad y resumen' },
  ];

  return (
    <section className="space-y-6 max-w-5xl mx-auto relative">
      {toast && (
        <aside
          role="alert"
          className="fixed top-6 right-6 z-50 bg-slate-900 border-l-4 border-rose-500 border border-rose-500/30 rounded-xl shadow-2xl p-4 flex items-start gap-3 max-w-sm animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex-shrink-0 text-rose-400 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-white">{toast.title}</h4>
            <p className="text-xs text-rose-200/90 mt-0.5">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-1 text-xs"
            aria-label="Cerrar alerta"
          >
            ✕
          </button>
        </aside>
      )}

      <header className="pb-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">
            {isAdmin ? 'Mantenedor masivo de personas' : 'Asistente de Carga de Nóminas de Pasajes'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Sincroniza el maestro de trabajadores mediante CSV o Excel.'
              : 'Flujo guiado paso a paso con inspección, comparación visual de encabezados, previsualización y trazabilidad del pipeline.'}
          </p>
        </div>
        {!isAdmin && file && (
          <button
            type="button"
            onClick={resetForm}
            className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
          >
            Reiniciar proceso
          </button>
        )}
      </header>

      {/* Stepper Visual en 4 Etapas (Solo Cargador) */}
      {!isAdmin && (
        <nav aria-label="Progreso del asistente de carga" className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <ol className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stepperSteps.map((st) => {
              const isActive = currentStep === st.num;
              const isDone = currentStep > st.num || (result && st.num <= 4);
              const canClick =
                (st.num === 1) ||
                (st.num === 2 && headers.length > 0) ||
                (st.num === 3 && isMappingValid) ||
                (st.num === 4 && result);

              return (
                <li
                  key={st.num}
                  onClick={() => canClick && setCurrentStep(st.num)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    canClick ? 'cursor-pointer hover:border-slate-600' : 'cursor-not-allowed opacity-60'
                  } ${
                    isActive
                      ? 'bg-amber-600/15 border-amber-500/80 shadow-md shadow-amber-950/20'
                      : isDone
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive
                          ? 'bg-amber-500 text-slate-950'
                          : isDone
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isDone ? '✓' : st.num}
                    </span>
                    <span className={`text-xs font-bold ${isActive ? 'text-amber-400' : isDone ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {st.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 pl-7 truncate">{st.desc}</p>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* VISTA DEL ADMINISTRADOR (MANTENEDOR MASIVO) */}
      {isAdmin && !result && (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${
              isDragging
                ? 'border-amber-500 bg-amber-900/20 scale-[1.01]'
                : error && !file
                  ? 'border-rose-500/80 bg-rose-950/20'
                  : file
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-slate-700 bg-slate-900/30'
            }`}
          >
            <p className="text-sm text-slate-300">
              Arrastra el archivo de nómina maestra aquí o{' '}
              <label className="text-amber-400 underline cursor-pointer">
                explora
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => {
                    selectFile(e.target.files[0]);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-xs text-slate-500 mt-2">Máximo 10 MB · Archivos CSV o XLSX con campos rut, nombre_completo, faena, centro_costo</p>
          </div>

          {file && (
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs font-bold">
                  ✓
                </span>
                <div>
                  <p className="text-sm text-white font-medium">{file.name}</p>
                  <p className="text-[11px] text-slate-400">{formatFileSize(file.size)} · Archivo validado y listo para sincronizar</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={loading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-xs font-bold text-white rounded-lg transition-colors inline-flex items-center gap-2 shadow-lg shadow-amber-900/20"
                >
                  {loading && (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {loading ? 'Sincronizando...' : 'Sincronizar nómina maestra'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Quitar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* VISTA DEL CARGADOR (PASO 1: SUBIDA E INSPECCIÓN) */}
      {!isAdmin && currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${
              isDragging
                ? 'border-amber-500 bg-amber-900/20 scale-[1.01]'
                : error && !file
                  ? 'border-rose-500/80 bg-rose-950/20'
                  : file
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-slate-700 bg-slate-900/30'
            }`}
          >
            <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl mb-3">
              📁
            </div>
            <p className="text-sm text-slate-300 font-medium">
              Arrastra la nómina Excel de pasajes aquí o{' '}
              <label className="text-amber-400 underline cursor-pointer hover:text-amber-300">
                selecciona un archivo
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => {
                    selectFile(e.target.files[0]);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-xs text-slate-500 mt-2">Formato oficial: .xlsx (Excel OpenXML) · Tamaño máximo: 10 MB</p>
          </div>

          {file && (
            <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-4 shadow-xl">
              <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-sm font-bold">
                    📊
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{file.name}</h3>
                    <p className="text-[11px] text-slate-400">
                      Peso: <span className="text-slate-200 font-semibold">{formatFileSize(file.size)}</span> · Tipo MIME: <span className="font-mono text-emerald-400">application/vnd.openxmlformats</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-rose-400 transition-colors"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Ficha técnica de inspección */}
              {fileSummary ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Filas</p>
                      <p className="text-xl font-black text-amber-400 mt-0.5">{fileSummary.total_rows}</p>
                      <p className="text-[10px] text-slate-500">Filas leídas en Excel</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Columnas</p>
                      <p className="text-xl font-black text-sky-400 mt-0.5">{fileSummary.total_columns}</p>
                      <p className="text-[10px] text-slate-500">Encabezados detectados</p>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Filas Útiles</p>
                      <p className="text-xl font-black text-emerald-400 mt-0.5">{fileSummary.non_empty_rows}</p>
                      <p className="text-[10px] text-slate-500">Con datos válidos</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-amber-900/20 inline-flex items-center gap-2 cursor-pointer"
                    >
                      Continuar al Mapeo de Encabezados →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                  <p className="text-xs text-slate-400">
                    Inspecciona la estructura interna de la planilla para extraer encabezados y muestras de datos.
                  </p>
                  <button
                    type="button"
                    onClick={readHeaders}
                    disabled={loading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-amber-900/20 inline-flex items-center justify-center gap-2"
                  >
                    {loading && (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    {loading ? 'Inspeccionando archivo...' : 'Inspeccionar estructura y encabezados'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VISTA DEL CARGADOR (PASO 2: COMPARADOR VISUAL DE ENCABEZADOS) */}
      {!isAdmin && currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-5">
            <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Comparador de Encabezados (Esquema vs Excel)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Empareja los campos obligatorios del sistema observando las muestras reales leídas directamente de la planilla.
                </p>
              </div>
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                  isMappingValid
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {isMappingValid ? '✓ Mapeo Preparado' : 'Campos obligatorios pendientes'}
              </span>
            </div>

            {/* Panel Comparativo 2 Columnas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bloque RUT */}
              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="text-amber-400">*</span> Campo Obligatorio 1: RUT Pasajero
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                    🔒 Cifrado AES-128
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Identificador chileno del trabajador minero. Se sanitiza, se valida matemáticamente con Módulo 11 y se cifra con Fernet.
                </p>
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Seleccionar columna de tu Excel:
                  </label>
                  <select
                    value={mapping.map_rut}
                    onChange={(e) => setMapping({ ...mapping, map_rut: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Elige la columna que contiene el RUT --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Muestras reales de la columna seleccionada */}
                <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                    Muestras reales detectadas:
                  </p>
                  {mapping.map_rut && columnSamples[mapping.map_rut]?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {columnSamples[mapping.map_rut].map((s, idx) => (
                        <span key={idx} className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      {mapping.map_rut ? 'Sin datos de muestra' : 'Selecciona una columna para ver sus valores reales'}
                    </p>
                  )}
                </div>
              </div>

              {/* Bloque Nombre Completo */}
              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="text-amber-400">*</span> Campo Obligatorio 2: Nombre Completo
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                    🔒 Cifrado AES-128
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Nombre del pasajero. Se estandariza en Unicode (sin tildes/espacios múltiples), se coteja con Maestro_Personas y se cifra.
                </p>
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Seleccionar columna de tu Excel:
                  </label>
                  <select
                    value={mapping.map_nombre}
                    onChange={(e) => setMapping({ ...mapping, map_nombre: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Elige la columna con el Nombre Completo --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Muestras reales de la columna seleccionada */}
                <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                    Muestras reales detectadas:
                  </p>
                  {mapping.map_nombre && columnSamples[mapping.map_nombre]?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {columnSamples[mapping.map_nombre].map((s, idx) => (
                        <span key={idx} className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      {mapping.map_nombre ? 'Sin datos de muestra' : 'Selecciona una columna para ver sus valores reales'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Alerta de columna idéntica */}
            {isSameColumnSelected && (
              <p className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <span>⚠️</span> La columna de RUT y la columna de Nombre Completo no pueden ser la misma ({mapping.map_rut}).
              </p>
            )}

            {/* Columnas Dinámicas preservadas en JSONB */}
            <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">📦</span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Columnas Dinámicas Adicionales Detectadas ({dynamicColumns.length})
                </h4>
              </div>
              <p className="text-[11px] text-slate-400">
                Estas columnas no se descartan: se empaquetarán y preservarán íntegramente en la estructura no normalizada <span className="font-mono text-amber-400">JSONB</span> de PostgreSQL para fines de reportería y auditoría.
              </p>
              {dynamicColumns.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {dynamicColumns.map((col) => (
                    <span key={col} className="px-2.5 py-1 rounded bg-slate-800/90 text-[11px] text-slate-300 border border-slate-700">
                      {col}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No hay columnas dinámicas adicionales.</p>
              )}
            </div>

            {/* Navegación Paso 2 */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
              >
                ← Volver a inspección
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={!isMappingValid}
                className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all inline-flex items-center gap-2 ${
                  isMappingValid
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                Continuar a Vista Previa →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA DEL CARGADOR (PASO 3: PREVISUALIZACIÓN DE TABLA FINAL A SUBIR) */}
      {!isAdmin && currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Previsualización de la Tabla Estandarizada a Subir</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifica cómo interpretará y estructurará el sistema la información antes de persistirla en la base de datos.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Mostrando {previewRows.length} filas de muestra
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Faena destino: {faena || 'Detectada automáticamente'}
                </span>
              </div>
            </div>

            {/* Tabla de previsualización */}
            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="p-3 w-16 font-mono text-slate-500"># Fila</th>
                      <th className="p-3 font-semibold text-amber-400">
                        RUT (Col: {mapping.map_rut})
                      </th>
                      <th className="p-3 font-semibold text-sky-400">
                        Nombre Completo (Col: {mapping.map_nombre})
                      </th>
                      {dynamicColumns.map((col) => (
                        <th key={col} className="p-3 font-normal text-slate-400">
                          {col} <span className="text-[10px] text-slate-500 font-mono">(JSONB)</span>
                        </th>
                      ))}
                      <th className="p-3 font-semibold text-emerald-400">Destino / Seguridad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {previewRows.map((row) => {
                      const rutVal = row.data[mapping.map_rut] || '';
                      const nombreVal = row.data[mapping.map_nombre] || '';
                      const isFormatOk = checkRutFormat(rutVal);

                      return (
                        <tr key={row.fila} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-mono text-slate-500">#{row.fila}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-white">{rutVal || '—'}</span>
                              {rutVal && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                    isFormatOk
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}
                                >
                                  {isFormatOk ? '✓ Módulo 11 OK' : '⚠️ Formato atípico'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-medium text-slate-200">{nombreVal || '—'}</td>
                          {dynamicColumns.map((col) => (
                            <td key={col} className="p-3 text-slate-400">
                              {row.data[col] || '—'}
                            </td>
                          ))}
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/30">
                              🔒 Fernet AES + JSONB
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aviso normativo previo a confirmación */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 space-y-1">
              <p className="font-bold text-amber-300 flex items-center gap-2">
                <span>🛡️</span> Garantía de Seguridad y Cumplimiento Normativo (Ley N° 19.628)
              </p>
              <p className="text-[11px] text-slate-300">
                Al confirmar, el backend procesará el archivo en milisegundos aplicando: 1) Limpieza y sanitización de celdas con Pandas, 2) Validación matemática del dígito verificador Módulo 11, 3) Cotejo contra el Maestro de Personas con inyección de Faena oficial, 4) Cifrado simétrico AES-128 con firma HMAC-SHA256 y persistencia atómica en PostgreSQL.
              </p>
            </div>

            {/* Navegación Paso 3 */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={loading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
              >
                ← Volver a ajustar encabezados
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={loading || !canSubmit}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-amber-900/30 inline-flex items-center gap-2 cursor-pointer"
              >
                {loading && (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {loading ? 'Ejecutando pipeline y validaciones...' : 'Confirmar y Procesar en Servidor 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULTADOS / PASO 4: TRAZABILIDAD DEL PIPELINE + RESUMEN SGP-22 */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isAdmin ? (
            <>
              {/* Desglose BUG-01 / SGP-23 para Administrador */}
              <div
                role="status"
                className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-xs text-emerald-300"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span>
                  <strong>Sincronización de nómina:</strong> {result.total_creados ?? 0} registros creados y {result.total_actualizados ?? 0} registros actualizados{result.total_errores > 0 ? ` (${result.total_errores} rechazados)` : ''}.
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-1 p-5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col justify-center">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Estado</p>
                  <p className={`text-base font-bold mt-1 ${result.total_errores > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {result.total_errores > 0 ? 'Sincronización Parcial' : 'Sincronización Completada'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Total: {result.total_filas ?? ((result.total_creados ?? 0) + (result.total_actualizados ?? 0) + (result.total_errores ?? 0))} filas
                  </p>
                </div>
                <div className="p-5 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-center">
                  <p className="text-3xl font-black text-emerald-500">{result.total_creados ?? 0}</p>
                  <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest mt-1">Nuevos Creados</p>
                </div>
                <div className="p-5 bg-sky-950/20 border border-sky-900/50 rounded-xl text-center">
                  <p className="text-3xl font-black text-sky-400">{result.total_actualizados ?? 0}</p>
                  <p className="text-[10px] text-sky-400/80 uppercase tracking-widest mt-1">Actualizados</p>
                </div>
                <div className="p-5 bg-rose-950/20 border border-rose-900/50 rounded-xl text-center">
                  <p className="text-3xl font-black text-rose-500">{result.total_errores ?? 0}</p>
                  <p className="text-[10px] text-rose-400/80 uppercase tracking-widest mt-1">Rechazados</p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* SGP-30: Panel Visual de las 4 Etapas Internas del Pipeline */}
              {result.pipeline_trace && (
                <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4 shadow-xl">
                  <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>⚙️</span> Trazabilidad del Pipeline Backend (4 Fases Ejecutadas)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Métricas operacionales y de seguridad obtenidas durante el procesamiento en el servidor.
                      </p>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                      Transacción Atómica PostgreSQL
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Fase 1 */}
                    <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">Fase 1: Pandas</span>
                        <span className="text-xs">🧹</span>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-bold">
                        {result.pipeline_trace.filas_leidas_excel} filas leídas
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {result.pipeline_trace.filas_vacias_ignoradas} descartadas por vacías
                      </p>
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono mt-1">
                        Lectura dtype=object
                      </span>
                    </div>

                    {/* Fase 2 */}
                    <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">Fase 2: Módulo 11</span>
                        <span className="text-xs">🧮</span>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-bold">
                        {result.pipeline_trace.aprobadas_modulo11} RUTs válidos
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {result.pipeline_trace.rechazadas_modulo11} con DV erróneo
                      </p>
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono mt-1">
                        Algoritmo matemático
                      </span>
                    </div>

                    {/* Fase 3 */}
                    <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">Fase 3: Maestro</span>
                        <span className="text-xs">🔍</span>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-bold">
                        {result.pipeline_trace.aprobadas_maestro_y_faena} validados con faena
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {result.pipeline_trace.rechazadas_maestro} no habilitados / sin match
                      </p>
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono mt-1">
                        Cruce Unicode estricto
                      </span>
                    </div>

                    {/* Fase 4 */}
                    <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">Fase 4: Fernet AES</span>
                        <span className="text-xs">🔐</span>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-bold">
                        {result.pipeline_trace.campos_pii_cifrados_fernet} campos cifrados
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 truncate" title={result.pipeline_trace.ejemplo_token_cifrado}>
                        Muestra: {result.pipeline_trace.ejemplo_token_cifrado || 'gAAAAAB...'}
                      </p>
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono mt-1">
                        Ley 19.628 · JSONB
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SGP-22: Tarjetas de resumen del lote */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-2 p-5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col justify-center">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Estado del lote</p>
                  <p className={`text-lg font-bold mt-1 ${result.total_errores > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {result.total_errores > 0 ? 'Procesamiento Parcial (HTTP 207)' : 'Procesamiento Exitoso (HTTP 200)'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Lote ID: <span className="font-mono text-slate-400">{result.lote_id}</span>
                  </p>
                </div>
                <div className="p-5 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-center">
                  <p className="text-3xl font-black text-emerald-500">{result.total_procesados ?? 0}</p>
                  <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest mt-1">Cargas Exitosas</p>
                </div>
                <div className="p-5 bg-rose-950/20 border border-rose-900/50 rounded-xl text-center">
                  <p className="text-3xl font-black text-rose-500">{result.total_errores ?? 0}</p>
                  <p className="text-[10px] text-rose-400/80 uppercase tracking-widest mt-1">Rechazados</p>
                </div>
              </div>
            </>
          )}

          {/* SGP-22: Detalle de Errores por Fila Excel */}
          {result.detalle_errores?.length > 0 && (
            <div className="border border-rose-900/30 rounded-xl overflow-hidden shadow-lg shadow-rose-950/20">
              <div className="bg-rose-950/40 border-b border-rose-900/30 px-4 py-3 flex justify-between items-center">
                <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                  Detalle de Registros Rechazados ({result.detalle_errores.length})
                </h3>
                <span className="text-[10px] text-rose-400 font-mono">Tolerancia parcial a fallos activa</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-500 sticky top-0">
                    <tr>
                      <th className="p-3 w-28 font-medium">Fila Excel</th>
                      <th className="p-3 font-medium">Código / Motivo del Rechazo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 bg-slate-900/30">
                    {result.detalle_errores.map((item, idx) => (
                      <tr key={`${item.fila}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-mono text-rose-400/90 font-semibold">#{item.fila}</td>
                        <td className="p-3">
                          <span className="font-semibold text-rose-300">{item.code ? `[${item.code}] ` : ''}</span>
                          <span>{item.message}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              onClick={resetForm}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors border border-slate-700 cursor-pointer"
            >
              Cargar nueva planilla
            </button>
          </div>
        </div>
      )}

      {/* Mantenedor Masivo (Oculto para Cargadores, visible para Administrador) */}
      {isAdmin && (
        <section className="space-y-4 pt-8 border-t border-slate-800 mt-8">
          <h3 className="text-sm font-bold text-white mb-4">Directorio Maestro Actual</h3>
          <div className="flex flex-wrap gap-4 items-end bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <label className="text-xs text-slate-400 flex-1 min-w-[200px]">
              Buscar RUT o nombre
              <input
                value={masterFilters.search}
                onChange={(e) => updateMasterFilter('search', e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                placeholder="Ej: 12345678-9"
              />
            </label>
            <label className="text-xs text-slate-400 w-40">
              Estado
              <select
                value={masterFilters.estado}
                onChange={(e) => updateMasterFilter('estado', e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500 text-xs"
              >
                <option value="">Todos</option>
                <option value="habilitado">Habilitados</option>
                <option value="inhabilitado">Inhabilitados</option>
              </select>
            </label>
            <div className="pb-2 text-xs text-slate-500">
              Faena filtrada: <span className="text-amber-400 font-semibold">{faena || 'Todas'}</span>
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-4 font-medium">RUT</th>
                    <th className="p-4 font-medium">Nombre</th>
                    <th className="p-4 font-medium">Faena</th>
                    <th className="p-4 font-medium">Centro de costo</th>
                    <th className="p-4 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/20">
                  {masterData.results.map((person) => (
                    <tr key={person.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono">{person.rut}</td>
                      <td className="p-4 font-medium text-slate-200">{person.nombre_completo}</td>
                      <td className="p-4">{person.faena}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-800 rounded text-[10px]">{person.centro_costo}</span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border ${
                            person.estado_habilitacion
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              person.estado_habilitacion ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {person.estado_habilitacion ? 'Habilitado' : 'Inhabilitado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!masterData.results.length && (
              <div className="p-10 text-center flex flex-col items-center justify-center bg-slate-900/20">
                <span className="text-3xl mb-3 opacity-50">📭</span>
                <p className="text-sm text-slate-400">No hay personas registradas para los filtros seleccionados.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
            <span>
              Total de registros: <strong className="text-slate-200">{masterData.pagination.total}</strong>
            </span>
            <div className="flex items-center space-x-3">
              <button
                disabled={masterFilters.page <= 1}
                onClick={() => updateMasterFilter('page', masterFilters.page - 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded transition-colors disabled:opacity-40 disabled:hover:bg-slate-800 cursor-pointer"
              >
                Anterior
              </button>
              <span className="font-medium text-slate-300">
                Página {masterFilters.page} de {masterData.pagination.pages || 1}
              </span>
              <button
                disabled={masterFilters.page >= (masterData.pagination.pages || 1)}
                onClick={() => updateMasterFilter('page', masterFilters.page + 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded transition-colors disabled:opacity-40 disabled:hover:bg-slate-800 cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
