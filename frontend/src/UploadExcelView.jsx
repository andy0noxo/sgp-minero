import React, { useEffect, useState } from 'react';
import { getMasterPeople, getUploadHeaders, importMasterPeople, processUpload } from './api';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function UploadExcelView({ role, faena }) {
  const isAdmin = role === 'Administrador';
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({ map_rut: '', map_nombre: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [masterData, setMasterData] = useState({ results: [], pagination: { page: 1, pages: 0, total: 0 } });
  const [masterFilters, setMasterFilters] = useState({ search: '', estado: '', page: 1, page_size: 25 });

  const selectFile = (candidate) => {
    if (!candidate) return;
    if (candidate.size > MAX_FILE_SIZE) return setError('El archivo supera el límite de 10 MB.');
    const allowed = isAdmin ? /\.(csv|xlsx)$/i : /\.xlsx$/i;
    if (!allowed.test(candidate.name)) return setError(isAdmin ? 'Solo se permiten archivos CSV o XLSX.' : 'Solo se permiten archivos XLSX.');
    setFile(candidate); setHeaders([]); setResult(null); setError('');
  };

  const readHeaders = async () => {
    setLoading(true); setError('');
    try {
      const response = await getUploadHeaders(file);
      setHeaders(response.data.headers);
      setMapping({ map_rut: '', map_nombre: '' });
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  };

  const submit = async () => {
    setLoading(true); setError('');
    try {
      const response = isAdmin ? await importMasterPeople(file) : await processUpload(file, mapping);
      setResult(response.data);
      if (isAdmin) await loadMasterPeople();
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
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

  return (
    <section className="space-y-6 max-w-5xl mx-auto">
      <header className="pb-6 border-b border-slate-800"><h2 className="text-xl font-bold text-white">{isAdmin ? 'Mantenedor masivo de personas' : 'Carga de nóminas de pasajes'}</h2><p className="text-xs text-slate-400 mt-1">{isAdmin ? 'Sincroniza el maestro mediante CSV o Excel.' : 'Carga una nómina XLSX y mapea sus columnas antes de procesarla.'}</p></header>
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectFile(e.dataTransfer.files[0]); }} className="border-2 border-dashed border-slate-700 rounded-xl p-10 text-center bg-slate-900/30">
        <p className="text-sm text-slate-300">Arrastra el archivo aquí o <label className="text-amber-400 underline cursor-pointer">explora<input type="file" accept={isAdmin ? '.csv,.xlsx' : '.xlsx'} onChange={(e) => selectFile(e.target.files[0])} className="hidden" /></label></p>
        <p className="text-xs text-slate-500 mt-2">Máximo 10 MB · {isAdmin ? 'CSV o XLSX' : 'XLSX'}</p>
      </div>
      {file && <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex justify-between items-center"><span className="text-sm text-white">{file.name}</span>{!isAdmin && <button onClick={readHeaders} disabled={loading} className="px-4 py-2 bg-slate-800 text-xs text-white rounded-lg">Leer encabezados</button>}</div>}
      {!isAdmin && headers.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-xl"><label className="text-xs text-slate-400">Columna RUT<select value={mapping.map_rut} onChange={(e) => setMapping({ ...mapping, map_rut: e.target.value })} className="input-dark"><option value="">Seleccionar...</option>{headers.map((header) => <option key={header}>{header}</option>)}</select></label><label className="text-xs text-slate-400">Columna nombre<select value={mapping.map_nombre} onChange={(e) => setMapping({ ...mapping, map_nombre: e.target.value })} className="input-dark"><option value="">Seleccionar...</option>{headers.map((header) => <option key={header}>{header}</option>)}</select></label></div>}
      {error && <p className="p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-xs text-rose-300">{error}</p>}
      {file && (isAdmin || (mapping.map_rut && mapping.map_nombre && mapping.map_rut !== mapping.map_nombre)) && <button onClick={submit} disabled={loading} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg">{loading ? 'Procesando...' : 'Procesar archivo'}</button>}
      {result && (
        <div className={`p-4 rounded-xl text-sm ${
          result.total_errores > 0
            ? 'bg-amber-950/30 border border-amber-800 text-amber-300'
            : 'bg-emerald-950/30 border border-emerald-800 text-emerald-300'
        }`}>
          <p>{result.total_errores > 0 ? 'Procesamiento parcial' : 'Procesamiento completado'}</p>
          <p>Filas: {result.total_filas}</p>
          <p>Procesadas/creadas: {result.total_procesados ?? result.total_creados}</p>
          <p>Actualizadas: {result.total_actualizados ?? 0}</p>
          <p>Errores: {result.total_errores}</p>
          {result.detalle_errores?.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {result.detalle_errores.map((item) => (
                <li key={`${item.fila}-${item.code}`}>Fila {item.fila}: {item.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {isAdmin && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-xs text-slate-400">Buscar RUT o nombre<input value={masterFilters.search} onChange={(e) => updateMasterFilter('search', e.target.value)} className="input-dark" /></label>
            <label className="text-xs text-slate-400">Estado<select value={masterFilters.estado} onChange={(e) => updateMasterFilter('estado', e.target.value)} className="input-dark"><option value="">Todos</option><option value="habilitado">Habilitados</option><option value="inhabilitado">Inhabilitados</option></select></label>
            <span className="text-xs text-slate-500 pb-2">Faena activa: {faena}</span>
          </div>
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase"><tr><th className="p-3">RUT</th><th className="p-3">Nombre</th><th className="p-3">Faena</th><th className="p-3">Centro de costo</th><th className="p-3">Estado</th></tr></thead>
              <tbody className="divide-y divide-slate-800">{masterData.results.map((person) => <tr key={person.id}><td className="p-3">{person.rut}</td><td className="p-3">{person.nombre_completo}</td><td className="p-3">{person.faena}</td><td className="p-3">{person.centro_costo}</td><td className="p-3">{person.estado_habilitacion ? 'Habilitado' : 'Inhabilitado'}</td></tr>)}</tbody>
            </table>
            {!masterData.results.length && <p className="p-6 text-sm text-slate-400">No hay personas para los filtros seleccionados.</p>}
          </div>
          <div className="flex justify-between text-xs text-slate-400"><span>{masterData.pagination.total} personas</span><div className="space-x-2"><button disabled={masterFilters.page <= 1} onClick={() => { const next = { ...masterFilters, page: masterFilters.page - 1 }; setMasterFilters(next); loadMasterPeople({ ...next, faena }); }} className="px-3 py-1 bg-slate-800 rounded disabled:opacity-40">Anterior</button><span>Página {masterFilters.page}</span><button disabled={masterFilters.page >= (masterData.pagination.pages || 1)} onClick={() => { const next = { ...masterFilters, page: masterFilters.page + 1 }; setMasterFilters(next); loadMasterPeople({ ...next, faena }); }} className="px-3 py-1 bg-slate-800 rounded disabled:opacity-40">Siguiente</button></div></div>
        </section>
      )}
    </section>
  );
}
