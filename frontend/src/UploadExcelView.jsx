import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getMasterPeople, getUploadHeaders, importMasterPeople, processUpload } from './api';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_MIMES = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel']);

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export default function UploadExcelView({ role }) {
  const isAdmin = role === 'Administrador';
  
  // Extraemos la faena inyectada por el MainLayout a través del React Router
  const { faena } = useOutletContext();
  
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({ map_rut: '', map_nombre: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // Estado para animar el drag & drop

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
    setMapping({ map_rut: '', map_nombre: '' });
    setResult(null);
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

    // Validación estricta de extensión + MIME type en cliente (SGP-15)
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
    setMapping({ map_rut: '', map_nombre: '' });
    setResult(null);
    setError('');
    setToast(null);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); selectFile(e.dataTransfer.files[0]); };

  const resetForm = () => {
    setFile(null);
    setHeaders([]);
    setMapping({ map_rut: '', map_nombre: '' });
    setResult(null);
    setError('');
    setToast(null);
  };

  const readHeaders = async () => {
    setLoading(true); setError(''); setToast(null);
    try {
      const response = await getUploadHeaders(file);
      setHeaders(response.data.headers);
      setMapping({ map_rut: '', map_nombre: '' });
    } catch (requestError) {
      setError(requestError.message);
      setToast({ title: 'Error al leer encabezados', message: requestError.message });
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true); setError(''); setToast(null);
    try {
      const response = isAdmin ? await importMasterPeople(file) : await processUpload(file, mapping);
      setResult(response.data);
      if (isAdmin) await loadMasterPeople();
    } catch (requestError) {
      setError(requestError.message);
      setToast({ title: 'Error al procesar archivo', message: requestError.message });
    } finally { setLoading(false); }
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
    const next = { ...masterFilters, [key]: value, page: 1 };
    setMasterFilters(next);
    loadMasterPeople({ ...next, faena });
  };

  const isMappingComplete = Boolean(mapping.map_rut && mapping.map_nombre);
  const isSameColumnSelected = Boolean(isMappingComplete && mapping.map_rut === mapping.map_nombre);
  const isMappingValid = Boolean(isMappingComplete && !isSameColumnSelected);
  const canSubmit = isAdmin ? Boolean(file) : Boolean(file && headers.length > 0 && isMappingValid);

  return (
    <section className="space-y-6 max-w-5xl mx-auto relative">
      {toast && (
        <aside
          role="alert"
          className="fixed top-6 right-6 z-50 bg-slate-900 border-l-4 border-rose-500 border border-rose-500/30 rounded-xl shadow-2xl p-4 flex items-start gap-3 max-w-sm"
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

      <header className="pb-6 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white">{isAdmin ? 'Mantenedor masivo de personas' : 'Carga de nóminas de pasajes'}</h2>
        <p className="text-xs text-slate-400 mt-1">{isAdmin ? 'Sincroniza el maestro de trabajadores mediante CSV o Excel.' : 'Carga una nómina XLSX y mapea sus columnas antes de procesarla.'}</p>
      </header>

      {!result && (
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
              Arrastra el archivo aquí o{' '}
              <label className="text-amber-400 underline cursor-pointer">
                explora
                <input
                  type="file"
                  accept={isAdmin ? '.csv,.xlsx' : '.xlsx'}
                  onChange={(e) => {
                    selectFile(e.target.files[0]);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-xs text-slate-500 mt-2">Máximo 10 MB · {isAdmin ? 'CSV o XLSX' : 'XLSX'}</p>
          </div>

          {file && (
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                {loading ? (
                  <svg
                    className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    ✓
                  </span>
                )}
                <div>
                  <p className="text-sm text-white font-medium">{file.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {formatFileSize(file.size)} ·{' '}
                    {loading
                      ? 'Procesando en curso...'
                      : headers.length > 0
                        ? `${headers.length} columnas detectadas`
                        : 'Archivo validado y listo'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isAdmin && headers.length === 0 && (
                  <button
                    onClick={readHeaders}
                    disabled={loading}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs text-white rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    {loading && (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    {loading ? 'Leyendo...' : 'Extraer encabezados'}
                  </button>
                )}
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

          {!isAdmin && headers.length > 0 && (
            <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Mapeo Dinámico de Columnas
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Empareja las columnas de tu planilla Excel con los atributos obligatorios del sistema.
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isMappingValid
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {isMappingValid ? 'Mapeo Válido' : '2 campos obligatorios requeridos'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-xs text-slate-300 font-semibold">
                  Columna RUT <span className="text-amber-400">*</span>
                  <select
                    value={mapping.map_rut}
                    onChange={(e) => setMapping({ ...mapping, map_rut: e.target.value })}
                    className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Seleccionar columna...</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-slate-300 font-semibold">
                  Columna Nombre Completo <span className="text-amber-400">*</span>
                  <select
                    value={mapping.map_nombre}
                    onChange={(e) => setMapping({ ...mapping, map_nombre: e.target.value })}
                    className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Seleccionar columna...</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {isSameColumnSelected && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5 pt-1">
                  <span>⚠️</span> La columna de RUT y la columna de Nombre Completo no pueden ser la misma ({mapping.map_rut}).
                </p>
              )}

              {isMappingValid && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                  <span>✓</span> Mapeo preparado: RUT → "{mapping.map_rut}" · Nombre → "{mapping.map_nombre}".
                </p>
              )}
            </div>
          )}

          {error && <p className="p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-xs text-rose-300 flex items-center gap-2">⚠️ {error}</p>}

          {file && (isAdmin || headers.length > 0) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={submit}
                disabled={loading || !canSubmit}
                className={`w-full md:w-auto px-6 py-2.5 text-sm font-bold rounded-lg transition-all shadow-lg inline-flex items-center justify-center gap-2 ${
                  canSubmit && !loading
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60 shadow-none'
                }`}
              >
                {loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {loading ? 'Procesando validaciones...' : 'Procesar archivo'}
              </button>

              {!isAdmin && headers.length > 0 && !canSubmit && (
                <span className="text-xs text-slate-400">
                  {isSameColumnSelected
                    ? 'Corrige el emparejamiento para habilitar el procesamiento.'
                    : 'Empareja ambas columnas obligatorias (RUT y Nombre) para procesar la nómina.'}
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* SGP-22: Tabla Estructurada de Retroalimentación */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-2 p-5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col justify-center">
              <p className="text-sm text-slate-400 font-medium">Estado del lote</p>
              <p className={`text-lg font-bold ${result.total_errores > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {result.total_errores > 0 ? 'Procesamiento Parcial' : 'Procesamiento Completado'}
              </p>
            </div>
            <div className="p-5 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-center">
              <p className="text-3xl font-black text-emerald-500">{result.total_procesados ?? result.total_creados ?? 0}</p>
              <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest mt-1">Cargas Exitosas</p>
            </div>
            <div className="p-5 bg-rose-950/20 border border-rose-900/50 rounded-xl text-center">
              <p className="text-3xl font-black text-rose-500">{result.total_errores ?? 0}</p>
              <p className="text-[10px] text-rose-400/80 uppercase tracking-widest mt-1">Rechazados</p>
            </div>
          </div>

          {result.detalle_errores?.length > 0 && (
            <div className="border border-rose-900/30 rounded-xl overflow-hidden shadow-lg shadow-rose-950/20">
              <div className="bg-rose-950/40 border-b border-rose-900/30 px-4 py-3">
                <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider">Detalle de Errores</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-500 sticky top-0">
                    <tr>
                      <th className="p-3 w-28 font-medium">Fila Excel</th>
                      <th className="p-3 font-medium">Motivo del Rechazo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 bg-slate-900/30">
                    {result.detalle_errores.map((item, idx) => (
                      <tr key={`${item.fila}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-mono text-rose-400/80">#{item.fila}</td>
                        <td className="p-3">{item.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button onClick={resetForm} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors">
              Cargar nueva planilla
            </button>
          </div>
        </div>
      )}

      {/* Mantenedor Masivo (Oculto para Cargadores) */}
      {isAdmin && (
        <section className="space-y-4 pt-8 border-t border-slate-800 mt-8">
          <h3 className="text-sm font-bold text-white mb-4">Directorio Maestro Actual</h3>
          <div className="flex flex-wrap gap-4 items-end bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <label className="text-xs text-slate-400 flex-1 min-w-[200px]">Buscar RUT o nombre
              <input value={masterFilters.search} onChange={(e) => updateMasterFilter('search', e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500" placeholder="Ej: 12345678-9" />
            </label>
            <label className="text-xs text-slate-400 w-40">Estado
              <select value={masterFilters.estado} onChange={(e) => updateMasterFilter('estado', e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500">
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
                      <td className="p-4"><span className="px-2 py-1 bg-slate-800 rounded text-[10px]">{person.centro_costo}</span></td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border ${person.estado_habilitacion ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${person.estado_habilitacion ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
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
            <span>Total de registros: <strong className="text-slate-200">{masterData.pagination.total}</strong></span>
            <div className="flex items-center space-x-3">
              <button disabled={masterFilters.page <= 1} onClick={() => updateMasterFilter('page', masterFilters.page - 1)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded transition-colors disabled:opacity-40 disabled:hover:bg-slate-800">
                Anterior
              </button>
              <span className="font-medium text-slate-300">Página {masterFilters.page} de {masterData.pagination.pages || 1}</span>
              <button disabled={masterFilters.page >= (masterData.pagination.pages || 1)} onClick={() => updateMasterFilter('page', masterFilters.page + 1)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded transition-colors disabled:opacity-40 disabled:hover:bg-slate-800">
                Siguiente
              </button>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}