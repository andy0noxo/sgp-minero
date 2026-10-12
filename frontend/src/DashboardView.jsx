import React, { useEffect, useState } from 'react';
import { getDashboardRecords } from './api';

export default function DashboardView() {
  const [filters, setFilters] = useState({ from: '', to: '', centro_costo: '', page: 1, page_size: 25 });
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

  useEffect(() => { loadRecords(); }, []);

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
        <label className="text-xs text-slate-400">Centro de costo<input value={filters.centro_costo} onChange={(e) => updateFilter('centro_costo', e.target.value)} className="input-dark" /></label>
        <button onClick={() => loadRecords()} className="self-end px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg">Aplicar filtros</button>
      </div>
      {error && <p className="p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-xs text-rose-300">{error}</p>}
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        {loading ? <p className="p-6 text-sm text-slate-400">Cargando registros...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase"><tr><th className="p-3">Fila</th><th className="p-3">RUT</th><th className="p-3">Nombre</th><th className="p-3">Estado</th><th className="p-3">Procesamiento</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {result.results.map((record) => (
                  <tr key={record.id}><td className="p-3">{record.fila_origen}</td><td className="p-3">{record.datos.rut || '—'}</td><td className="p-3">{record.datos.nombre_completo || '—'}</td><td className="p-3">{record.estado_validacion}</td><td className="p-3">{new Date(record.fecha_procesamiento).toLocaleString('es-CL')}</td></tr>
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
