import React, { useState, useEffect, useCallback } from 'react';
import { getAuditLogs, downloadAuditCsv } from './api';

const AuditView = () => {
  const [logs, setLogs] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    exitosas: 0,
    fallidos: 0,
    seguridad: 0,
    advertencias: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    page_size: 25,
  });
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState(null);

  // Auto-dismiss Toast
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadLogs = useCallback(
    async (
      searchQuery = searchTerm,
      moduleVal = filterModule,
      statusVal = filterStatus,
      pageVal = pagination.page
    ) => {
      try {
        setLoading(true);
        const params = { page: pageVal };
        if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();
        if (moduleVal && moduleVal !== 'all') params.modulo = moduleVal;
        if (statusVal && statusVal !== 'all') params.status = statusVal;

        const response = await getAuditLogs(params);
        const data = response?.data || {};
        setLogs(data.results || []);
        if (data.pagination) setPagination(data.pagination);
        if (data.counts) setCounts(data.counts);
      } catch (err) {
        const msg =
          err.error?.message ||
          err.message ||
          'No fue posible cargar las pistas de auditoría.';
        setToast({ type: 'error', title: 'Error de conexión', message: msg });
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filterModule, filterStatus, pagination.page]
  );

  // Carga reactiva con debounce para búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      loadLogs(searchTerm, filterModule, filterStatus, 1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm, filterModule, filterStatus, loadLogs]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
    loadLogs(searchTerm, filterModule, filterStatus, newPage);
  };

  const handleExportAudit = async () => {
    try {
      setIsExporting(true);
      const params = {};
      if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();
      if (filterModule && filterModule !== 'all') params.modulo = filterModule;
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;

      await downloadAuditCsv(params);
      setToast({
        type: 'success',
        title: 'Exportación completada',
        message:
          'Pistas de auditoría certificadas (Ley 19.628 / UTF-8 BOM) descargadas exitosamente.',
      });
      // Recargar para reflejar el evento EXPORTAR_AUDITORIA en el historial
      await loadLogs();
    } catch (err) {
      const msg =
        err.error?.message ||
        err.message ||
        'Error al exportar archivo de auditoría.';
      setToast({ type: 'error', title: 'Error de exportación', message: msg });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto relative">
      {/* Toast Notification */}
      {toast && (
        <aside
          role="alert"
          className={`fixed top-6 right-6 z-50 bg-slate-900 border rounded-xl shadow-2xl p-4 flex items-start gap-3 max-w-sm transition-all ${
            toast.type === 'error'
              ? 'border-l-4 border-rose-500 border-rose-500/30 text-rose-200'
              : 'border-l-4 border-emerald-500 border-emerald-500/30 text-emerald-200'
          }`}
        >
          <div
            className={`flex-shrink-0 mt-0.5 ${
              toast.type === 'error' ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {toast.type === 'error' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-white">{toast.title}</h4>
            <p className="text-xs mt-0.5 opacity-90">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-1 text-xs"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </aside>
      )}

      {/* Encabezado del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Registro de Auditoría y Trazabilidad
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Solo Administrador
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historial inmutable de eventos del sistema bajo cumplimiento de Ley 19.628 y verificación criptográfica AES-128.
          </p>
        </div>
        <button
          onClick={handleExportAudit}
          disabled={isExporting}
          className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          <span>🔒</span>
          <span>
            {isExporting ? 'Generando CSV...' : 'Exportar Pistas de Auditoría (.CSV)'}
          </span>
        </button>
      </div>

      {/* KPI Cards de Seguridad y Eventos */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-slate-400">
            Total Eventos Registrados
          </span>
          <p className="text-2xl font-bold text-white mt-1">{counts.total}</p>
          <span className="text-[10px] text-slate-500">Log acumulado en BD</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-emerald-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-emerald-400">
            Operaciones Conformes
          </span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{counts.exitosas}</p>
          <span className="text-[10px] text-slate-500">
            {counts.total > 0
              ? `${((counts.exitosas / counts.total) * 100).toFixed(1)}% de conformidad`
              : '100% de conformidad'}
          </span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-amber-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-amber-400">
            Advertencias de Turno
          </span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{counts.advertencias}</p>
          <span className="text-[10px] text-slate-500">Observaciones en nómina</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-rose-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-rose-400">
            Eventos de Seguridad
          </span>
          <p className="text-2xl font-bold text-rose-400 mt-1">{counts.seguridad}</p>
          <span className="text-[10px] text-slate-500">Intentos de acceso denegados</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2 w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar por usuario, IP, acción o detalle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos los módulos</option>
            <option value="AUTENTICACION">Autenticación</option>
            <option value="INGESTA">Carga Masiva (Ingesta)</option>
            <option value="MAESTRO_PERSONAS">Maestro de Personas</option>
            <option value="USUARIOS">Gestión de Usuarios</option>
            <option value="AUDITORIA">Auditoría</option>
          </select>

          <div className="flex items-center space-x-1">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'success', label: 'Conforme' },
              { id: 'warning', label: 'Alerta' },
              { id: 'danger', label: 'Crítico' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filterStatus === st.id
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Eventos de Auditoría */}
      <div className="border border-slate-800 bg-slate-900/50 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">ID Evento</th>
                <th className="p-3">Fecha / Hora</th>
                <th className="p-3">Usuario / Origen</th>
                <th className="p-3">Módulo & Acción</th>
                <th className="p-3">Detalle Operativo</th>
                <th className="p-3">Firma Criptográfica</th>
                <th className="p-3 text-right">Nivel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                      <svg
                        className="w-4 h-4 text-amber-500 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      <span>Cargando pistas de auditoría desde PostgreSQL...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    No se encontraron registros de auditoría que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-amber-400 text-[11px]" title={log.id}>
                      LOG-{log.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="p-3 text-slate-400 whitespace-nowrap text-[11px]">
                      {log.timestamp}
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-white">{log.user}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        RUT: {log.rut} · IP: {log.ip}
                      </p>
                    </td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-medium border border-slate-700">
                        {log.module}
                      </span>
                      <p className="text-slate-200 font-medium mt-1">
                        {log.action}
                      </p>
                    </td>
                    <td className="p-3 text-slate-400 max-w-xs text-[11px] leading-relaxed">
                      {log.details}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {log.hash}
                    </td>
                    <td className="p-3 text-right">
                      {log.status === 'success' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          ● Conforme
                        </span>
                      )}
                      {log.status === 'warning' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          ● Advertencia
                        </span>
                      )}
                      {log.status === 'danger' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          ● Crítico
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pagination.pages > 1 && (
          <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Mostrando {logs.length} de {pagination.total} eventos registrados
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <span className="px-2 font-medium text-slate-300">
                Página {pagination.page} de {pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditView;
