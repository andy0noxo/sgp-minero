import React, { useState } from 'react';

const mockPassages = [
  {
    id: 'PAS-8012',
    rut: '17.842.109-2',
    name: 'Carlos Mendoza Ríos',
    cargo: 'Operador Mina Subterránea',
    shift: 'Turno 7x7 A',
    route: 'Santiago (SCL) ➔ Calama (CJC)',
    transporte: 'Vuelo Chárter H-302',
    date: '2026-10-02 06:30',
    status: 'pending', // pending | approved | conflict
    detail: 'Turno saliente calza con descanso programado.'
  },
  {
    id: 'PAS-8013',
    rut: '16.320.551-K',
    name: 'Marcela Vega Pardo',
    cargo: 'Supervisora de Geotecnia',
    shift: 'Turno 4x3',
    route: 'Calama ➔ Faena Cordillera',
    transporte: 'Bus Interurbano N°14',
    date: '2026-10-02 09:15',
    status: 'approved',
    detail: 'Acreditación y examen de altura vigente.'
  },
  {
    id: 'PAS-8014',
    rut: '19.112.443-8',
    name: 'Ignacio Silva Valenzuela',
    cargo: 'Técnico Mantenedor Eléctrico',
    shift: 'Turno 7x7 B',
    route: 'Antofagasta ➔ Faena Cordillera',
    transporte: 'Transfer Privado T-08',
    date: '2026-10-02 11:00',
    status: 'conflict',
    detail: 'Alerta: Traslape de horario con descanso legal (Ley 19.628 / Faena).'
  },
  {
    id: 'PAS-8015',
    rut: '15.981.230-4',
    name: 'Esteban Morales Guzmán',
    cargo: 'Jefe de Turno Planta',
    shift: 'Turno 7x7 A',
    route: 'Santiago (SCL) ➔ Calama (CJC)',
    transporte: 'Vuelo Comercial LATAM 142',
    date: '2026-10-02 07:45',
    status: 'pending',
    detail: 'Pendiente confirmación de asiento por la aerolínea.'
  },
  {
    id: 'PAS-8016',
    rut: '18.452.931-K',
    name: 'Ángel Nicolás Frei Cepeda',
    cargo: 'Ingeniero de Operaciones QA',
    shift: 'Turno 4x3',
    route: 'Santiago ➔ Faena Cordillera',
    transporte: 'Bus Corporativo N°02',
    date: '2026-10-02 08:00',
    status: 'approved',
    detail: 'Validación biométrica y de turno correcta.'
  }
];

const ValidationView = () => {
  const [passages, setPassages] = useState(mockPassages);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const handleApprove = (id) => {
    setPassages(prev =>
      prev.map(p => (p.id === id ? { ...p, status: 'approved', detail: 'Aprobado manualmente por jefatura.' } : p))
    );
  };

  const handleReject = (id) => {
    setPassages(prev =>
      prev.map(p => (p.id === id ? { ...p, status: 'conflict', detail: 'Rechazado: Requiere regularización de jefatura.' } : p))
    );
  };

  const handleApproveAll = () => {
    setPassages(prev =>
      prev.map(p => (p.status === 'pending' ? { ...p, status: 'approved', detail: 'Aprobado en lote.' } : p))
    );
  };

  const filtered = passages.filter(item => {
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rut.includes(searchTerm) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const countPending = passages.filter(p => p.status === 'pending').length;
  const countApproved = passages.filter(p => p.status === 'approved').length;
  const countConflict = passages.filter(p => p.status === 'conflict').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Validación y Aprobación de Pasajes</h2>
          <p className="text-xs text-slate-400 mt-1">
            Supervisión de traslados, verificación de turnos mineros y autorización formal de itinerarios.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleApproveAll}
            disabled={countPending === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-900/30 flex items-center space-x-2"
          >
            <span>✓</span>
            <span>Aprobar Todos los Pendientes ({countPending})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Total Pasajes en Nómina</span>
          <p className="text-2xl font-bold text-white mt-1">{passages.length}</p>
          <span className="text-[10px] text-slate-500">Faena Cordillera · Octubre 2026</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-emerald-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-emerald-400">Pasajes Aprobados</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{countApproved}</p>
          <span className="text-[10px] text-slate-500">Listos para emisión de boleto</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-rose-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-rose-400">Conflictos / Observados</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">{countConflict}</p>
          <span className="text-[10px] text-slate-500">Incompatibilidad de turno o traslado</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2 w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar por Nombre, RUT o Reserva..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Estado:</span>
          {['all', 'pending', 'approved', 'conflict'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'all' ? 'Todos' : st === 'pending' ? 'Pendientes' : st === 'approved' ? 'Aprobados' : 'Conflictos'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Pasajes */}
      <div className="border border-slate-800 bg-slate-900/50 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Trabajador / Cargo</th>
                <th className="p-3">Régimen</th>
                <th className="p-3">Tramo e Itinerario</th>
                <th className="p-3">Fecha / Hora</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-amber-400">{item.id}</td>
                  <td className="p-3">
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-400">{item.rut} · {item.cargo}</p>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                      {item.shift}
                    </span>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-slate-200">{item.route}</p>
                    <p className="text-[10px] text-slate-400">{item.transporte}</p>
                  </td>
                  <td className="p-3 text-slate-400 whitespace-nowrap">{item.date}</td>
                  <td className="p-3">
                    {item.status === 'approved' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        ● Aprobado
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        ● Pendiente
                      </span>
                    )}
                    {item.status === 'conflict' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        ● Conflicto Turno
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      {item.status !== 'approved' && (
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded border border-emerald-500/30 text-[11px] transition-colors"
                          title="Aprobar Pasaje"
                        >
                          Aprobar
                        </button>
                      )}
                      {item.status !== 'conflict' && (
                        <button
                          onClick={() => handleReject(item.id)}
                          className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded border border-rose-500/30 text-[11px] transition-colors"
                          title="Rechazar / Observar"
                        >
                          Rechazar
                        </button>
                      )}
                    </div>
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

export default ValidationView;