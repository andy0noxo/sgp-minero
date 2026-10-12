import React, { useEffect, useState } from 'react';
import { getDashboardRecords } from './api';

const PAGE_SIZE = 50;

function csvValue(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function getFlightDate(record) {
  const data = record.datos || {};
  return data.fecha_vuelo || data.fecha || data.Fecha || data.FECHA || '—';
}

function exportCsv(records) {
  const headers = ['Archivo', 'Fila Excel', 'RUT', 'Nombre', 'Fecha vuelo', 'Estado', 'Cargador responsable', 'Procesamiento'];
  const rows = records.map((record) => [
    record.nombre_archivo_origen,
    record.fila_origen,
    record.datos.rut,
    record.datos.nombre_completo,
    getFlightDate(record),
    record.estado_validacion,
    record.cargador_responsable,
    record.fecha_procesamiento,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DashboardView({ faena }) {
  const [filters, setFilters] = useState({ from: '', to: '', faena, centro_costo: '', estado: '', page: 1, page_size: PAGE_SIZE });
  const [result, setResult] = useState({ results: [], pagination: { total: 0, pages: 0 } });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadRecords = async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getDashboardRecords(nextFilters);
      setResult(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextFilters = { ...filters, faena, page: 1 };
    setFilters(nextFilters);
    loadRecords(nextFilters);
  }, [faena]);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));

  return (
    <section className="space-y-6 max-w-6xl mx-auto">
      <header className="pb-6 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white">Dashboard corporativo</h2>
        <p className="text-xs text-slate-400 mt-1">Consulta de registros procesados para auditoría.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <label className="text-xs text-slate-400">Desde<input type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} className="input-dark" /></label>
        <label className="text-xs text-slate-400">Hasta<input type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} className="input-dark" /></label>
        <label className="text-xs text-slate-400">Faena<select value={filters.faena} onChange={(e) => updateFilter('faena', e.target.value)} className="input-dark"><option value="">Todas</option><option value="Faena Cordillera">Faena Cordillera</option><option value="Faena Norte">Faena Norte</option><option value="Faena Central">Faena Central</option></select></label>
        <label className="text-xs text-slate-400">Centro de costo<input value={filters.centro_costo} onChange={(e) => updateFilter('centro_costo', e.target.value)} className="input-dark" /></label>
        <label className="text-xs text-slate-400">Estado<select value={filters.estado} onChange={(e) => updateFilter('estado', e.target.value)} className="input-dark"><option value="">Todos</option><option value="APROBADO">Aprobado</option><option value="RECHAZADO">Rechazado</option></select></label>
        <div className="flex gap-2 items-end md:col-span-4">
          <button onClick={() => loadRecords()} className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg">Aplicar filtros</button>
          <button onClick={() => exportCsv(result.results)} disabled={!result.results.length} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-40">Exportar CSV</button>
        </div>
      </div>
      {error && <p className="p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-xs text-rose-300">{error}</p>}
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        {loading ? <p className="p-6 text-sm text-slate-400">Cargando registros...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase"><tr><th className="p-3">Archivo</th><th className="p-3">Fila</th><th className="p-3">RUT</th><th className="p-3">Nombre</th><th className="p-3">Faena</th><th className="p-3">Fecha vuelo</th><th className="p-3">Estado</th><th className="p-3">Cargador</th><th className="p-3">Procesamiento</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {result.results.map((record) => (
                  <tr key={record.id}><td className="p-3">{record.nombre_archivo_origen}</td><td className="p-3">{record.fila_origen}</td><td className="p-3">{record.datos.rut || '—'}</td><td className="p-3">{record.datos.nombre_completo || '—'}</td><td className="p-3">{record.datos.faena || '—'}</td><td className="p-3">{getFlightDate(record)}</td><td className="p-3">{record.estado_validacion}</td><td className="p-3">{record.cargador_responsable}</td><td className="p-3">{new Date(record.fecha_procesamiento).toLocaleString('es-CL')}</td></tr>
                ))}
              </tbody>
            </table>
            {!result.results.length && <p className="p-6 text-sm text-slate-400">No hay registros para los filtros seleccionados.</p>}
          </div>
        )}
      </div>
      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>{result.pagination.total || 0} registros</span>
        <div className="space-x-2"><button disabled={filters.page <= 1} onClick={() => { const next = { ...filters, page: filters.page - 1 }; setFilters(next); loadRecords(next); }} className="px-3 py-1 bg-slate-800 rounded disabled:opacity-40">Anterior</button><span>Página {filters.page}</span><button disabled={filters.page >= (result.pagination.pages || 1)} onClick={() => { const next = { ...filters, page: filters.page + 1 }; setFilters(next); loadRecords(next); }} className="px-3 py-1 bg-slate-800 rounded disabled:opacity-40">Siguiente</button></div>
      </div>
    </section>
  );
}
