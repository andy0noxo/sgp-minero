import React, { useState } from 'react';

const mockUsers = [
  {
    id: 'USR-001',
    rut: '18.452.931-K',
    name: 'Ángel Nicolás Frei Cepeda',
    email: 'an.frei@duocuc.cl',
    role: 'admin',
    faena: 'Faena Cordillera',
    status: 'active', // active | inactive
    lastLogin: '2026-09-28 01:35',
    mfaEnabled: true
  },
  {
    id: 'USR-002',
    rut: '17.220.104-5',
    name: 'Bernardo Díaz',
    email: 'b.diaz@sgpminero.cl',
    role: 'cargador',
    faena: 'Faena Cordillera',
    status: 'active',
    lastLogin: '2026-09-28 00:52',
    mfaEnabled: true
  },
  {
    id: 'USR-003',
    rut: '16.510.980-3',
    name: 'Cristóbal Bueno',
    email: 'c.bueno@sgpminero.cl',
    role: 'consultor',
    faena: 'Faena Norte',
    status: 'active',
    lastLogin: '2026-09-27 18:20',
    mfaEnabled: false
  },
  {
    id: 'USR-004',
    rut: '19.340.112-9',
    name: 'Noelia Cortez',
    email: 'n.cortez@sgpminero.cl',
    role: 'cargador',
    faena: 'Faena Central',
    status: 'active',
    lastLogin: '2026-09-26 14:10',
    mfaEnabled: true
  },
  {
    id: 'USR-005',
    rut: '15.820.441-2',
    name: 'Rodrigo Valenzuela',
    email: 'r.valenzuela@sgpminero.cl',
    role: 'consultor',
    faena: 'Todas las faenas',
    status: 'inactive',
    lastLogin: '2026-08-15 10:00',
    mfaEnabled: false
  }
];

const UsersView = () => {
  const [users, setUsers] = useState(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    rut: '',
    email: '',
    role: 'cargador',
    faena: 'Faena Cordillera'
  });

  const handleToggleStatus = (id) => {
    setUsers(prev =>
      prev.map(u => (u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u))
    );
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.rut || !newUser.email) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }
    const created = {
      ...newUser,
      id: `USR-00${users.length + 1}`,
      status: 'active',
      lastLogin: 'Sin ingresos',
      mfaEnabled: true
    };
    setUsers([created, ...users]);
    setShowModal(false);
    setNewUser({ name: '', rut: '', email: '', role: 'cargador', faena: 'Faena Cordillera' });
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.rut.includes(searchTerm) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const countAdmins = users.filter(u => u.role === 'admin').length;
  const countCargadores = users.filter(u => u.role === 'cargador').length;
  const countConsultores = users.filter(u => u.role === 'consultor').length;

  const roleTags = {
    admin: { label: 'Administrador', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    cargador: { label: 'Cargador de Datos', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    consultor: { label: 'Consultor / Auditor', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Gestión de Usuarios y Roles (RBAC)</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Control de Accesos
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Administración de cuentas corporativas, asignación de faenas y provisión segura bajo estándar Ley 19.628.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-amber-900/30"
        >
          <span>＋</span>
          <span>Registrar Nuevo Usuario</span>
        </button>
      </div>

      {/* KPI Cards de Usuarios y Roles */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Total Usuarios</span>
          <p className="text-2xl font-bold text-white mt-1">{users.length}</p>
          <span className="text-[10px] text-slate-500">Cuentas provisionadas</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-amber-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-amber-400">Administradores</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{countAdmins}</p>
          <span className="text-[10px] text-slate-500">Control total del sistema</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-blue-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-blue-400">Cargadores de Datos</span>
          <p className="text-2xl font-bold text-blue-400 mt-1">{countCargadores}</p>
          <span className="text-[10px] text-slate-500">Importación Excel y validación</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-emerald-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-emerald-400">Consultores</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{countConsultores}</p>
          <span className="text-[10px] text-slate-500">Solo lectura y reportes</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2 w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar por Nombre, RUT o Correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Rol:</span>
          {['all', 'admin', 'cargador', 'consultor'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                roleFilter === r
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {r === 'all' ? 'Todos' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="border border-slate-800 bg-slate-900/50 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">ID / RUT</th>
                <th className="p-3">Usuario / Correo</th>
                <th className="p-3">Rol Asignado</th>
                <th className="p-3">Faena Base</th>
                <th className="p-3">Seguridad</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3">
                    <p className="font-mono font-bold text-amber-400">{u.id}</p>
                    <p className="text-[11px] text-slate-400">{u.rut}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-semibold text-white">{u.name}</p>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleTags[u.role]?.bg}`}>
                      {roleTags[u.role]?.label}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 font-medium">{u.faena}</td>
                  <td className="p-3">
                    <span className="text-[10px] text-slate-400">
                      {u.mfaEnabled ? '🔒 MFA Activo' : '⚠️ Sin MFA'}
                    </span>
                    <p className="text-[10px] text-slate-500">Último: {u.lastLogin}</p>
                  </td>
                  <td className="p-3">
                    {u.status === 'active' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        ● Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        ○ Inactivo
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          u.status === 'active'
                            ? 'bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30'
                            : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30'
                        }`}
                        title={u.status === 'active' ? 'Suspender acceso' : 'Habilitar acceso'}
                      >
                        {u.status === 'active' ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Crear Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Registrar Nuevo Usuario</h3>
            <p className="text-xs text-slate-400 mb-4">
              Crea una cuenta con acceso controlado bajo política de privilegios mínimos.
            </p>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez Morales"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">RUT</label>
                  <input
                    type="text"
                    required
                    placeholder="12.345.678-9"
                    value={newUser.rut}
                    onChange={(e) => setNewUser({ ...newUser, rut: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Rol</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="admin">Administrador</option>
                    <option value="cargador">Cargador de Datos</option>
                    <option value="consultor">Consultor / Auditor</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Correo Electrónico Corporativo</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@sgpminero.cl"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Faena Asignada</label>
                <select
                  value={newUser.faena}
                  onChange={(e) => setNewUser({ ...newUser, faena: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="Faena Cordillera">Faena Cordillera</option>
                  <option value="Faena Norte">Faena Norte</option>
                  <option value="Faena Central">Faena Central</option>
                  <option value="Todas las faenas">Todas las faenas</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-colors shadow-md shadow-amber-900/30"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersView;