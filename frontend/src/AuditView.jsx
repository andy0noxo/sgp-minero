import React, { useState } from 'react';

const mockLogs = [
  {
    id: 'LOG-9401',
    timestamp: '2026-09-28 01:35:12',
    user: 'Ángel Frei (admin)',
    rut: '18.452.931-K',
    action: 'Generación y descarga de nómina consolidada',
    module: 'Reportes y Nóminas',
    ip: '192.168.1.45',
    status: 'success', // success | warning | danger
    hash: 'a1b4...8f2d (AES-128)',
    details: 'Exportación de manifiesto mensual en formato XLSX con 148 registros.'
  },
  {
    id: 'LOG-9400',
    timestamp: '2026-09-28 01:15:40',
    user: 'Ángel Frei (admin)',
    rut: '18.452.931-K',
    action: 'Aprobación en lote de pasajes mineros',
    module: 'Validación de Pasajes',
    ip: '192.168.1.45',
    status: 'success',
    hash: 'f9c0...3e11 (AES-128)',
    details: 'Se autorizaron 3 pasajes pendientes para el Turno 7x7 Faena Cordillera.'
  },
  {
    id: 'LOG-9399',
    timestamp: '2026-09-28 00:52:18',
    user: 'Bernardo Díaz (cargador)',
    rut: '17.220.104-5',
    action: 'Carga masiva de nómina Excel',
    module: 'Carga Masiva',
    ip: '192.168.1.88',
    status: 'warning',
    hash: '4d8a...991c (AES-128)',
    details: 'Archivo procesado con 2 advertencias de traslape horario de turnos.'
  },
  {
    id: 'LOG-9398',
    timestamp: '2026-09-27 23:40:05',
    user: 'Usuario Desconocido',
    rut: '14.882.301-2',
    action: 'Intento de acceso no autorizado (Login fallido)',
    module: 'Autenticación',
    ip: '200.75.12.90',
    status: 'danger',
    hash: 'e210...7a44 (AES-128)',
    details: '3 intentos consecutivos con contraseña incorrecta. IP bloqueada preventivamente.'
  },
  {
    id: 'LOG-9397',
    timestamp: '2026-09-27 22:10:33',
    user: 'Ángel Frei (admin)',
    rut: '18.452.931-K',
    action: 'Inicio de sesión exitoso con MFA',
    module: 'Autenticación',
    ip: '192.168.1.45',
    status: 'success',
    hash: '77bc...19d0 (AES-128)',
    details: 'Autenticación mediante credenciales corporativas y token seguro.'
  }
];

const AuditView = () => {
  const [logs, setLogs] = useState(mockLogs);
  const [filterModule, setFilterModule] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const handleExportAudit = () => {
    alert('Exportando registro de auditoría certificado (Ley 19.628 / AES-128) en formato .CSV cifrado.');
  };

  const filteredLogs = logs.filter((log) => {
    const matchesModule = filterModule === 'all' || log.module === filterModule;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip.includes(searchTerm);
    return matchesModule && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Registro de Auditoría y Trazabilidad</h2>
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
          className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-sm"
        >
          <span>🔒</span>
          <span>Exportar Pistas de Auditoría (.CSV)</span>
        </button>
      </div>

      {/* KPI Cards de Seguridad y Eventos */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Total Eventos Registrados</span>
          <p className="text-2xl font-bold text-white mt-1">1,429</p>
          <span className="text-[10px] text-slate-500">Log acumulado mes activo</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-emerald-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-emerald-400">Operaciones Exitosas</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">1,418</p>
          <span className="text-[10px] text-slate-500">99.2% de conformidad</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-amber-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-amber-400">Advertencias de Turno</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">9</p>
          <span className="text-[10px] text-slate-500">Observaciones en nómina</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-rose-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-rose-400">Eventos de Seguridad</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">2</p>
          <span className="text-[10px] text-slate-500">Intentos de acceso denegados</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2 w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar por usuario, IP, ID o acción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos los módulos</option>
            <option value="Autenticación">Autenticación</option>
            <option value="Carga Masiva">Carga Masiva</option>
            <option value="Validación de Pasajes">Validación de Pasajes</option>
            <option value="Reportes y Nóminas">Reportes y Nóminas</option>
          </select>

          <div className="flex items-center space-x-1">
            {['all', 'success', 'warning', 'danger'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filterStatus === st
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'all' ? 'Todos' : st === 'success' ? 'Éxito' : st === 'warning' ? 'Alerta' : 'Crítico'}
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
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-amber-400">{log.id}</td>
                  <td className="p-3 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="p-3">
                    <p className="font-semibold text-white">{log.user}</p>
                    <p className="text-[10px] text-slate-400 font-mono">IP: {log.ip}</p>
                  </td>
                  <td className="p-3">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-medium border border-slate-700">
                      {log.module}
                    </span>
                    <p className="text-slate-200 font-medium mt-1">{log.action}</p>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditView;