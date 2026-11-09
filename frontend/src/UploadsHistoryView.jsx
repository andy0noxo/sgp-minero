import React, { useEffect, useMemo, useState } from 'react';
import { getUploadDetail, getUploadHistory } from './api';

const initialResult = {
  results: [],
  pagination: { total: 0, pages: 0, page: 1 },
  summary_kpis: {
    total_lotes: 0,
    total_filas_historico: 0,
    total_aprobadas_historico: 0,
    total_rechazadas_historico: 0,
  },
};

const ROWS_PER_PAGE = 12;

function statusLabel(status) {
  return (
    {
      COMPLETADO: 'Completado',
      COMPLETADO_CON_ERRORES: 'Completado con errores',
      FALLIDO: 'Fallido',
      PROCESANDO: 'Procesando',
    }[status] || status
  );
}

function statusBadgeClass(status) {
  if (status === 'COMPLETADO') {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  }
  if (status === 'COMPLETADO_CON_ERRORES') {
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  }
  if (status === 'FALLIDO') {
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  }
  return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
}

export default function UploadsHistoryView() {
  const [result, setResult] = useState(initialResult);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Controles de la tabla de representación del archivo seleccionado
  const [rowFilter, setRowFilter] = useState('ALL'); // 'ALL' | 'APROBADO' | 'RECHAZADO'
  const [rowSearch, setRowSearch] = useState('');
  const [rowPage, setRowPage] = useState(1);

  const showDetail = async (batchId) => {
    setError('');
    setDetailLoading(true);
    try {
      const response = await getUploadDetail(batchId);
      setSelectedBatch(response.data);
      setRowFilter('ALL');
      setRowSearch('');
      setRowPage(1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadHistory = async (nextPage = page, autoSelectFirst = false) => {
    setLoading(true);
    setError('');
    try {
      const response = await getUploadHistory({ page: nextPage, page_size: 10 });
      setResult(response.data);
      setPage(response.data.pagination.page);
      if (autoSelectFirst && response.data.results?.length > 0 && !selectedBatch) {
        await showDetail(response.data.results[0].id);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1, true);
  }, []);

  const kpis = result.summary_kpis || {
    total_lotes: result.pagination?.total || 0,
    total_filas_historico: 0,
    total_aprobadas_historico: 0,
    total_rechazadas_historico: 0,
  };

  const dynamicColumns = useMemo(() => {
    if (!selectedBatch) return [];
    if (Array.isArray(selectedBatch.columnas_dinamicas) && selectedBatch.columnas_dinamicas.length > 0) {
      return selectedBatch.columnas_dinamicas;
    }
    if (Array.isArray(selectedBatch.pipeline_trace?.columnas_dinamicas_jsonb)) {
      return selectedBatch.pipeline_trace.columnas_dinamicas_jsonb;
    }
    return [];
  }, [selectedBatch]);

  const unifiedRows = useMemo(() => {
    if (!selectedBatch) return [];
    if (Array.isArray(selectedBatch.filas_tabla) && selectedBatch.filas_tabla.length > 0) {
      return selectedBatch.filas_tabla;
    }
    const rows = [];
    (selectedBatch.registros_aprobados || []).forEach((item) => {
      rows.push({
        fila: item.fila_origen,
        estado_fila: 'APROBADO',
        faena: item.faena || 'Sin asignar',
        rut_cifrado_preview: item.rut_cifrado_preview || 'gAAAAAB...',
        nombre_cifrado_preview: item.nombre_cifrado_preview || 'gAAAAAB...',
        datos_dinamicos: item.datos_dinamicos || {},
        code: 'OK',
        message: 'Identidad validada en Maestro y PII cifrada con Fernet AES-128 en JSONB.',
      });
    });
    (selectedBatch.detalle_errores || []).forEach((err) => {
      rows.push({
        fila: err.fila,
        estado_fila: 'RECHAZADO',
        faena: '—',
        rut_cifrado_preview: 'No persistido',
        nombre_cifrado_preview: 'No persistido',
        datos_dinamicos: {},
        code: err.code || 'ERROR',
        message: err.message || 'Fila rechazada en validación.',
      });
    });
    return rows.sort((a, b) => (a.fila || 0) - (b.fila || 0));
  }, [selectedBatch]);

  const filteredRows = useMemo(() => {
    const query = rowSearch.trim().toLowerCase();
    return unifiedRows.filter((row) => {
      if (rowFilter !== 'ALL' && row.estado_fila !== rowFilter) return false;
      if (!query) return true;
      const dynamicText = Object.values(row.datos_dinamicos || {})
        .map((v) => String(v ?? ''))
        .join(' ')
        .toLowerCase();
      return (
        String(row.fila).includes(query) ||
        String(row.faena || '').toLowerCase().includes(query) ||
        String(row.code || '').toLowerCase().includes(query) ||
        String(row.message || '').toLowerCase().includes(query) ||
        dynamicText.includes(query)
      );
    });
  }, [unifiedRows, rowFilter, rowSearch]);

  const totalRowPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  const paginatedRows = useMemo(() => {
    const safePage = Math.min(rowPage, totalRowPages);
    const start = (safePage - 1) * ROWS_PER_PAGE;
    return filteredRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRows, rowPage, totalRowPages]);

  const approvalPercent = useMemo(() => {
    if (!selectedBatch || !selectedBatch.total_filas) return 0;
    return Math.round((selectedBatch.filas_procesadas / selectedBatch.total_filas) * 100);
  }, [selectedBatch]);

  const inspectionSteps = [
    { num: 1, title: 'Archivo Subido', desc: 'Metadatos y estructura del Excel' },
    { num: 2, title: 'Pipeline (4 Etapas)', desc: 'Pandas, Módulo 11, Maestro y Fernet' },
    { num: 3, title: 'Resultados del Lote', desc: 'Balance de aprobados y observados' },
    { num: 4, title: 'Tabla del Archivo', desc: 'Representación fila por fila en BD' },
  ];

  return (
    <section className="space-y-6 max-w-6xl mx-auto">
      {/* ENCABEZADO */}
      <header className="pb-5 border-b border-slate-800 flex flex-wrap justify-between items-end gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Trazabilidad de Ingesta · Rol Cargador
          </span>
          <h2 className="text-xl font-bold text-white mt-2">Mis cargas y resultados de procesamiento</h2>
          <p className="text-xs text-slate-400 mt-1">
            Revisa cada archivo Excel subido, la ejecución de las 4 etapas del motor validador y la representación tabular de sus registros.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadHistory(page, false)}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
        >
          ↻ Actualizar historial
        </button>
      </header>

      {error && (
        <p className="p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-xs text-rose-300">
          {error}
        </p>
      )}

      {/* TARJETAS KPI ACUMULADAS DEL CARGADOR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Archivos Subidos</p>
          <p className="text-2xl font-black text-white mt-1">{kpis.total_lotes}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Planillas .xlsx registradas</p>
        </div>
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Filas Leídas Totales</p>
          <p className="text-2xl font-black text-sky-400 mt-1">{kpis.total_filas_historico}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Inspeccionadas con Pandas</p>
        </div>
        <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl">
          <p className="text-[10px] text-emerald-400/90 uppercase tracking-wider font-semibold">Aprobadas y Cifradas</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{kpis.total_aprobadas_historico}</p>
          <p className="text-[11px] text-emerald-500/70 mt-0.5">Persistidas en JSONB (AES-128)</p>
        </div>
        <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl">
          <p className="text-[10px] text-rose-400/90 uppercase tracking-wider font-semibold">Filas Rechazadas</p>
          <p className="text-2xl font-black text-rose-400 mt-1">{kpis.total_rechazadas_historico}</p>
          <p className="text-[11px] text-rose-500/70 mt-0.5">Detenidas por Módulo 11 / Maestro</p>
        </div>
      </div>

      {/* TABLA DE LOTES / ARCHIVOS SUBIDOS */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Historial de Plantillas Excel Subidas
            </h3>
            <p className="text-[11px] text-slate-400">
              Selecciona cualquier carga para desplegar abajo su radiografía paso a paso y su tabla de datos.
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {result.pagination.total || 0} cargas registradas
          </span>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-400">Cargando historial...</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Archivo Excel Subido</th>
                    <th className="p-3.5">Estado del Lote</th>
                    <th className="p-3.5">Balance de Filas</th>
                    <th className="p-3.5">Progreso de Validación</th>
                    <th className="p-3.5">Fecha y Hora</th>
                    <th className="p-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {result.results.map((batch) => {
                    const isSelected = selectedBatch?.id === batch.id;
                    const pct =
                      batch.total_filas > 0
                        ? Math.round((batch.filas_procesadas / batch.total_filas) * 100)
                        : 0;
                    return (
                      <tr
                        key={batch.id}
                        onClick={() => showDetail(batch.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-sm flex-shrink-0">
                              📊
                            </span>
                            <div>
                              <p className="font-bold text-white">{batch.nombre_archivo_origen}</p>
                              <p className="text-[10px] font-mono text-slate-500">
                                Lote #{String(batch.id).slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusBadgeClass(
                              batch.estado
                            )}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {statusLabel(batch.estado)}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px] border border-slate-700">
                              Total: {batch.total_filas}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[11px] border border-emerald-500/20">
                              ✓ {batch.filas_procesadas}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 font-mono text-[11px] border border-rose-500/20">
                              ✕ {batch.filas_rechazadas}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 min-w-[140px]">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-slate-400">Aprobación</span>
                            <span className="font-mono font-bold text-emerald-400">{pct}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                            <div
                              className="bg-emerald-500 h-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                            <div
                              className="bg-rose-500 h-full transition-all"
                              style={{ width: `${100 - pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-300 whitespace-nowrap">
                          {new Date(batch.fecha_inicio).toLocaleString('es-CL')}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              showDetail(batch.id);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                            }`}
                          >
                            {isSelected ? 'Inspeccionando' : 'Ver detalle'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!result.results.length && (
              <div className="p-10 text-center space-y-2">
                <p className="text-2xl">📭</p>
                <p className="text-sm text-slate-300 font-semibold">Todavía no tienes cargas registradas.</p>
                <p className="text-xs text-slate-500">
                  Cuando subas una planilla Excel en la sección &ldquo;Cargar Excel&rdquo;, aparecerá aquí con su desglose visual completo.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* PAGINACIÓN DE LOTES */}
      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>{result.pagination.total || 0} cargas en total</span>
        <div className="space-x-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => loadHistory(page - 1, false)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-40 cursor-pointer"
          >
            Anterior
          </button>
          <span>
            Página {page} de {result.pagination.pages || 1}
          </span>
          <button
            type="button"
            disabled={page >= (result.pagination.pages || 1)}
            onClick={() => loadHistory(page + 1, false)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-40 cursor-pointer"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* DETALLE VISUAL PASO A PASO DEL LOTE SELECCIONADO */}
      {detailLoading && (
        <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
          Reconstruyendo trazabilidad y tabla de registros del lote...
        </div>
      )}

      {!detailLoading && selectedBatch && (
        <div className="space-y-6 pt-4 border-t border-slate-800 animate-in fade-in duration-300">
          {/* CABECERA DEL REPORTE DE INSPECCIÓN */}
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                Radiografía Completa de la Subida
              </span>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                <span>📄</span> Detalle: {selectedBatch.nombre_archivo_origen}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBatch(null)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white rounded-lg border border-slate-700 cursor-pointer"
            >
              ✕ Cerrar inspección
            </button>
          </div>

          {/* STEPPER VISUAL DE LOS 4 BLOQUES DE INSPECCIÓN (ESTILO SGP-30) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800">
            {inspectionSteps.map((s) => (
              <div
                key={s.num}
                className="flex items-center gap-3 p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ✓
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">
                    Paso {s.num}: {s.title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* PASO 1: FICHA DEL ARCHIVO SUBIDO Y ESTRUCTURA DETECTADA */}
          <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>1️⃣</span> Paso 1: Archivo Subido y Estructura Detectada
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Información de origen del archivo Excel procesado y columnas preservadas en PostgreSQL.
                </p>
              </div>
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusBadgeClass(
                  selectedBatch.estado
                )}`}
              >
                {statusLabel(selectedBatch.estado)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                <p className="text-[10px] text-slate-400 uppercase">Archivo Origen (.xlsx)</p>
                <p className="text-xs font-bold text-white truncate mt-1" title={selectedBatch.nombre_archivo_origen}>
                  {selectedBatch.nombre_archivo_origen}
                </p>
                <p className="text-[10px] font-mono text-slate-500 mt-1">
                  ID: {selectedBatch.id}
                </p>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                <p className="text-[10px] text-slate-400 uppercase">Fecha de Procesamiento</p>
                <p className="text-xs font-bold text-sky-400 mt-1">
                  {new Date(selectedBatch.fecha_inicio).toLocaleString('es-CL')}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Término:{' '}
                  {selectedBatch.fecha_termino
                    ? new Date(selectedBatch.fecha_termino).toLocaleTimeString('es-CL')
                    : 'Inmediato'}
                </p>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                <p className="text-[10px] text-slate-400 uppercase">Campos del Esquema de Pasajes</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    🔒 RUT (AES-128)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30">
                    🔒 Nombre (AES-128)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    ✈️ Fecha Vuelo
                  </span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                <p className="text-[10px] text-slate-400 uppercase">
                  Columnas Dinámicas JSONB ({dynamicColumns.length})
                </p>
                {dynamicColumns.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {dynamicColumns.map((col) => (
                      <span
                        key={col}
                        className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-200 border border-slate-700 font-mono"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    Solo columnas base obligatorias
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* PASO 2: TRAZABILIDAD DE LAS 4 ETAPAS DEL PIPELINE BACKEND */}
          {selectedBatch.pipeline_trace && (
            <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4 shadow-xl">
              <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>2️⃣</span> Paso 2: Trazabilidad del Pipeline Backend (4 Fases Ejecutadas)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Desglose técnico de lo ocurrido internamente con el archivo durante la ingesta.
                  </p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Transacción Atómica PostgreSQL
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Fase 1: Pandas</span>
                    <span className="text-xs">🧹</span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-bold">
                    {selectedBatch.pipeline_trace.filas_leidas_excel} filas leídas
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {selectedBatch.pipeline_trace.filas_vacias_ignoradas} descartadas por vacías
                  </p>
                  <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono mt-1">
                    Lectura dtype=object
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Fase 2: Módulo 11</span>
                    <span className="text-xs">🧮</span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-bold">
                    {selectedBatch.pipeline_trace.aprobadas_modulo11} RUTs válidos
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {selectedBatch.pipeline_trace.rechazadas_modulo11} con DV erróneo
                  </p>
                  <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono mt-1">
                    Algoritmo matemático
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Fase 3: Maestro</span>
                    <span className="text-xs">🔍</span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-bold">
                    {selectedBatch.pipeline_trace.aprobadas_maestro_y_faena} validados con faena
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {selectedBatch.pipeline_trace.rechazadas_maestro} no habilitados / sin match
                  </p>
                  <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono mt-1">
                    Cruce Unicode estricto
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Fase 4: Fernet AES</span>
                    <span className="text-xs">🔐</span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-bold">
                    {selectedBatch.pipeline_trace.campos_pii_cifrados_fernet} campos cifrados
                  </p>
                  <p
                    className="text-[10px] font-mono text-slate-400 truncate"
                    title={selectedBatch.pipeline_trace.ejemplo_token_cifrado}
                  >
                    Muestra: {selectedBatch.pipeline_trace.ejemplo_token_cifrado || 'gAAAAAB...'}
                  </p>
                  <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono mt-1">
                    Ley 19.628 · JSONB
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: RESULTADOS DE LA SUBIDA (TARJETAS DE BALANCE DEL LOTE) */}
          <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>3️⃣</span> Paso 3: Resultados de la Subida
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedBatch.filas_procesadas} procesadas · {selectedBatch.filas_rechazadas} rechazadas
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {approvalPercent}% de aprobación efectiva
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2 md:col-span-1 p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Respuesta de Ingesta</p>
                <p
                  className={`text-sm font-bold mt-1 ${
                    selectedBatch.filas_rechazadas > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {selectedBatch.filas_rechazadas > 0
                    ? 'Procesamiento Parcial (HTTP 207)'
                    : 'Procesamiento Exitoso (HTTP 200)'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Tolerancia parcial a fallos</p>
              </div>
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
                <p className="text-2xl font-black text-white">{selectedBatch.total_filas}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Filas en Excel</p>
              </div>
              <div className="p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-center">
                <p className="text-2xl font-black text-emerald-400">{selectedBatch.filas_procesadas}</p>
                <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest mt-1">Aprobadas en BD</p>
              </div>
              <div className="p-4 bg-rose-950/20 border border-rose-900/50 rounded-xl text-center">
                <p className="text-2xl font-black text-rose-400">{selectedBatch.filas_rechazadas}</p>
                <p className="text-[10px] text-rose-400/80 uppercase tracking-widest mt-1">Rechazadas</p>
              </div>
            </div>
          </div>

          {/* PASO 4: REPRESENTACIÓN EN TABLA DEL ARCHIVO SUBIDO */}
          <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-4 shadow-xl">
            <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>4️⃣</span> Paso 4: Representación en Tabla de los Registros del Archivo
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualización fila por fila del archivo subido con sus columnas dinámicas, faena asignada, resguardo criptográfico Fernet y diagnóstico de validación.
                </p>
              </div>

              {/* Pestañas de filtro rápido */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setRowFilter('ALL');
                    setRowPage(1);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    rowFilter === 'ALL'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todas ({unifiedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRowFilter('APROBADO');
                    setRowPage(1);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    rowFilter === 'APROBADO'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  ✓ Aprobadas ({selectedBatch.filas_procesadas})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRowFilter('RECHAZADO');
                    setRowPage(1);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    rowFilter === 'RECHAZADO'
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-400 hover:bg-rose-500/10'
                  }`}
                >
                  ✕ Rechazadas ({selectedBatch.filas_rechazadas})
                </button>
              </div>
            </div>

            {/* Buscador dentro de la tabla del lote */}
            <div className="flex flex-wrap justify-between items-center gap-3">
              <input
                type="text"
                value={rowSearch}
                onChange={(e) => {
                  setRowSearch(e.target.value);
                  setRowPage(1);
                }}
                placeholder="Buscar por # fila, faena, código de rechazo o valor de columna dinámica..."
                className="flex-1 min-w-[240px] bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <span className="text-[11px] text-slate-400">
                Mostrando <strong className="text-white">{filteredRows.length}</strong> de{' '}
                {unifiedRows.length} filas del archivo
              </span>
            </div>

            {/* Tabla unificada del archivo */}
            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-black/20">
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-3 w-20 font-mono text-slate-500"># Fila Excel</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-amber-400">RUT (Protección PII)</th>
                      <th className="p-3 text-sky-400">Nombre (Protección PII)</th>
                      <th className="p-3 text-emerald-400">Fecha Vuelo</th>
                      <th className="p-3 text-emerald-400">Faena Asignada</th>
                      {dynamicColumns.map((col) => (
                        <th key={col} className="p-3 font-normal text-slate-300">
                          {col} <span className="text-[10px] text-slate-500 font-mono">(JSONB)</span>
                        </th>
                      ))}
                      <th className="p-3">Diagnóstico / Trazabilidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {paginatedRows.map((row, idx) => {
                      const isApproved = row.estado_fila === 'APROBADO';
                      return (
                        <tr
                          key={`${row.fila}-${row.estado_fila}-${idx}`}
                          className={
                            isApproved
                              ? 'hover:bg-slate-800/30 transition-colors'
                              : 'bg-rose-950/15 hover:bg-rose-950/25 transition-colors'
                          }
                        >
                          <td className="p-3 font-mono font-bold text-slate-400">#{row.fila}</td>
                          <td className="p-3">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                ✓ APROBADO
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                ✕ RECHAZADO
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {isApproved ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                title="Token cifrado con Fernet AES-128-CBC + HMAC-SHA256"
                              >
                                🔒 {row.rut_cifrado_preview}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">No persistido</span>
                            )}
                          </td>
                          <td className="p-3">
                            {isApproved ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20"
                                title="Token cifrado con Fernet AES-128-CBC + HMAC-SHA256"
                              >
                                🔒 {row.nombre_cifrado_preview}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">No persistido</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-emerald-300">
                            {isApproved ? (row.fecha_vuelo || '—') : '—'}
                          </td>
                          <td className="p-3">
                            {isApproved ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium">
                                {row.faena}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          {dynamicColumns.map((col) => (
                            <td key={col} className="p-3 text-slate-300">
                              {isApproved ? (row.datos_dinamicos?.[col] ?? '—') : '—'}
                            </td>
                          ))}
                          <td className="p-3">
                            {isApproved ? (
                              <span className="text-[11px] text-emerald-300/90">
                                {row.message}
                              </span>
                            ) : (
                              <span className="text-[11px] text-rose-300">
                                <strong className="font-mono text-rose-400">
                                  [{row.code}]
                                </strong>{' '}
                                Fila {row.fila}: {row.message}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!paginatedRows.length && (
                <p className="p-6 text-center text-xs text-slate-400">
                  No hay filas que coincidan con el filtro seleccionado.
                </p>
              )}
            </div>

            {/* Paginación de la tabla de registros del lote */}
            {filteredRows.length > ROWS_PER_PAGE && (
              <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                <span>
                  Página {rowPage} de {totalRowPages} ({filteredRows.length} filas)
                </span>
                <div className="space-x-2">
                  <button
                    type="button"
                    disabled={rowPage <= 1}
                    onClick={() => setRowPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-40 cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={rowPage >= totalRowPages}
                    onClick={() => setRowPage((p) => Math.min(totalRowPages, p + 1))}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-40 cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {/* Resumen de errores para compatibilidad visual rápida */}
            {selectedBatch.detalle_errores?.length === 0 && (
              <p className="text-xs text-emerald-300 font-medium">
                ✓ La carga no tiene filas rechazadas. Todos los registros del archivo fueron validados y cifrados exitosamente.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
