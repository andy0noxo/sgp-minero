import React, { useEffect, useState } from 'react';
import { getUploadDetail, getUploadHistory } from './api';

const initialResult = { results: [], pagination: { total: 0, pages: 0, page: 1 } };

function statusLabel(status) {
  return {
    COMPLETADO: 'Completado',
    COMPLETADO_CON_ERRORES: 'Completado con errores',
    FALLIDO: 'Fallido',
    PROCESANDO: 'Procesando',
  }[status] || status;
}

export default function UploadsHistoryView() {
  const [result, setResult] = useState(initialResult);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const response = await getUploadHistory({ page: nextPage, page_size: 10 });
      setResult(response.data);
      setPage(response.data.pagination.page);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1);
  }, []);

  const showDetail = async (batchId) => {
    setError('');
    try {
      const response = await getUploadDetail(batchId);
      setSelectedBatch(response.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="space-y-6 max-w-6xl mx-auto">
      <header className="pb-6 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white">Mis cargas</h2>
        <p className="text-xs text-slate-400 mt-1">Historial de nóminas procesadas por tu usuario.</p>
      </header>
      {error && <p className="p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-xs text-rose-300">{error}</p>}
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        {loading ? <p className="p-6 text-sm text-slate-400">Cargando historial...</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase">
                  <tr>
                    <th className="p-3">Archivo</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Filas</th>
                    <th className="p-3">Procesadas</th>
                    <th className="p-3">Rechazadas</th>
                    <th className="p-3">Inicio</th>
                    <th className="p-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {result.results.map((batch) => (
                    <tr key={batch.id}>
                      <td className="p-3 text-white">{batch.nombre_archivo_origen}</td>
                      <td className="p-3">{statusLabel(batch.estado)}</td>
                      <td className="p-3">{batch.total_filas}</td>
                      <td className="p-3 text-emerald-300">{batch.filas_procesadas}</td>
                      <td className="p-3 text-rose-300">{batch.filas_rechazadas}</td>
                      <td className="p-3">{new Date(batch.fecha_inicio).toLocaleString('es-CL')}</td>
                      <td className="p-3">
                        <button onClick={() => showDetail(batch.id)} className="text-amber-400 hover:text-amber-300">
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!result.results.length && <p className="p-6 text-sm text-slate-400">Todavía no tienes cargas registradas.</p>}
          </>
        )}
      </div>
      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>{result.pagination.total || 0} cargas</span>
        <div className="space-x-2">
          <button disabled={page <= 1} onClick={() => loadHistory(page - 1)} className="px-3 py-1 bg-slate-800 rounded disabled:opacity-40">Anterior</button>
          <span>Página {page}</span>
          <button disabled={page >= (result.pagination.pages || 1)} onClick={() => loadHistory(page + 1)} className="px-3 py-1 bg-slate-800 rounded disabled:opacity-40">Siguiente</button>
        </div>
      </div>
      {selectedBatch && (
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white">Detalle: {selectedBatch.nombre_archivo_origen}</h3>
            <button onClick={() => setSelectedBatch(null)} className="text-xs text-slate-400 hover:text-white">Cerrar</button>
          </div>
          <p className="text-xs text-slate-400">
            {selectedBatch.filas_procesadas} procesadas · {selectedBatch.filas_rechazadas} rechazadas
          </p>
          {selectedBatch.detalle_errores.length > 0 ? (
            <ul className="list-disc pl-5 text-xs text-rose-300 space-y-1">
              {selectedBatch.detalle_errores.map((item) => (
                <li key={`${item.fila}-${item.code}`}>Fila {item.fila}: {item.message}</li>
              ))}
            </ul>
          ) : <p className="text-xs text-emerald-300">La carga no tiene filas rechazadas.</p>}
        </div>
      )}
    </section>
  );
}
