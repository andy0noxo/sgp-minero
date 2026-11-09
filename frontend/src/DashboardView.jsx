import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getDashboardRecords } from './api';

const PAGE_SIZE = 50;

function csvValue(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function cleanDateString(val) {
  if (!val) return '—';
  const text = String(val).trim();
  if (text.length === 19 && (text.endsWith(' 00:00:00') || text.endsWith('T00:00:00'))) {
    return text.slice(0, 10);
  }
  return text || '—';
}

function getFlightDate(record) {
  const data = record.datos || {};
  const direct =
    data.fecha_vuelo ||
    data.Fecha_Vuelo ||
    data.FECHA_VUELO ||
    data.fecha_viaje ||
    data.Fecha_Viaje ||
    data.fecha ||
    data.Fecha ||
    data.FECHA;
  if (direct) return cleanDateString(direct);
  const matchingKey = Object.keys(data).find((k) => k.toLowerCase().includes('fecha'));
  return matchingKey ? cleanDateString(data[matchingKey]) : '—';
}

function exportCsv(records) {
  const headers = ['Archivo', 'Fila Excel', 'RUT', 'Nombre', 'Faena', 'Fecha vuelo', 'Estado', 'Cargador responsable', 'Procesamiento'];
  const rows = records.map((record) => [
    record.nombre_archivo_origen,
    record.fila_origen,
    record.datos?.rut || '—',
    record.datos?.nombre_completo || '—',
    record.datos?.faena || '—',
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

export default function DashboardView({ faena: propFaena }) {
  const outlet = useOutletContext();
  const contextFaena = outlet?.faena;
  const activeFaena = contextFaena !== undefined ? contextFaena : (propFaena || '');

  const [filters, setFilters] = useState({
    from: '',
    to: '',
    faena: activeFaena,
    centro_costo: '',
    estado: '',
    page: 1,
    page_size: PAGE_SIZE,
  });
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
    const nextFilters = { ...filters, faena: activeFaena, page: 1 };
    setFilters(nextFilters);
    loadRecords(nextFilters);
  }, [activeFaena]);

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
          <button onClick={() => loadRecords(filters)} className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-500 transition-colors">Aplicar filtros</button>
          <button onClick={() => exportCsv(result.results)} disabled={!result.results.length} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40">Exportar CSV</button>
        </div>
      </div>
      {error && <p className="p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-xs text-rose-300">{error}</p>}
      <div className="border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
        {loading ? <p className="p-6 text-sm text-slate-400">Cargando registros...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider"><tr><th className="p-3 font-medium">Archivo</th><th className="p-3 font-medium">Fila</th><th className="p-3 font-medium">RUT</th><th className="p-3 font-medium">Nombre</th><th className="p-3 font-medium">Faena</th><th className="p-3 font-medium">Fecha vuelo</th><th className="p-3 font-medium">Estado</th><th className="p-3 font-medium">Cargador</th><th className="p-3 font-medium">Procesamiento</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {result.results.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">{record.nombre_archivo_origen}</td>
                    <td className="p-3 font-mono">#{record.fila_origen}</td>
                    <td className="p-3 font-mono">{record.datos?.rut || '—'}</td>
                    <td className="p-3 font-medium text-slate-200">{record.datos?.nombre_completo || '—'}</td>
                    <td className="p-3">{record.datos?.faena || '—'}</td>
                    <td className="p-3">{getFlightDate(record)}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${record.estado_validacion === 'APROBADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {record.estado_validacion}
                      </span>
                    </td>
                    <td className="p-3">{record.cargador_responsable}</td>
                    <td className="p-3 text-slate-400">{new Date(record.fecha_procesamiento).toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!result.results.length && <p className="p-6 text-sm text-slate-400 text-center">No hay registros para los filtros seleccionados.</p>}
          </div>
        )}
      </div>
      <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
        <span>Total: <strong className="text-slate-200">{result.pagination.total || 0}</strong> registros</span>
        <div className="flex items-center space-x-3">
          <button disabled={filters.page <= 1} onClick={() => { const next = { ...filters, page: filters.page - 1 }; setFilters(next); loadRecords(next); }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded transition-colors disabled:opacity-40">Anterior</button>
          <span className="font-medium text-slate-300">Página {filters.page} de {result.pagination.pages || 1}</span>
          <button disabled={filters.page >= (result.pagination.pages || 1)} onClick={() => { const next = { ...filters, page: filters.page + 1 }; setFilters(next); loadRecords(next); }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded transition-colors disabled:opacity-40">Siguiente</button>
        </div>
      </div>
    </section>
  );
}
