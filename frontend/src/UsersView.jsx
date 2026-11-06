import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, createUser, updateUser } from './api';

const roleTags = {
  admin: { label: 'Administrador', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  administrador: { label: 'Administrador', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  cargador: { label: 'Cargador de Datos', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  consultor: { label: 'Consultor / Auditor', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
};

const UsersView = () => {
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ total: 0, admins: 0, cargadores: 0, consultores: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [toast, setToast] = useState(null);

  // Modal Crear Usuario
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    rut: '',
    email: '',
    role: 'cargador',
    faena: 'Faena Cordillera',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Editar Usuario
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: 'cargador',
    faena: 'Faena Cordillera',
    password: ''
  });

  // Auto-dismiss Toast
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadUsers = useCallback(async (searchQuery = searchTerm, selectedRole = roleFilter) => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedRole && selectedRole !== 'all') params.role = selectedRole;

      const response = await getUsers(params);
      const data = response?.data || {};
      setUsers(data.results || []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      const msg = err.error?.message || err.message || 'No fue posible cargar la lista de usuarios.';
      setToast({ type: 'error', title: 'Error de conexión', message: msg });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter]);

  // Carga reactiva con debounce en búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      loadUsers(searchTerm, roleFilter);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm, roleFilter, loadUsers]);

  const handleToggleStatus = async (user) => {
    const nextStatus = !user.is_active;
    setActionLoadingId(user.id);
    try {
      await updateUser(user.id, { is_active: nextStatus });
      setToast({
        type: 'success',
        title: nextStatus ? 'Usuario activado' : 'Usuario desactivado',
        message: `La cuenta de ${user.rut} (${user.name}) ahora está ${nextStatus ? 'activa' : 'inactiva'}.`
      });
      await loadUsers();
    } catch (err) {
      const msg = err.error?.message || err.message || 'Error al cambiar estado del usuario.';
      setToast({ type: 'error', title: 'Operación denegada', message: msg });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.rut || !newUser.email || !newUser.password) {
      setToast({
        type: 'error',
        title: 'Formulario incompleto',
        message: 'Por favor completa todos los campos obligatorios.'
      });
      return;
    }
    if (newUser.password.length < 8) {
      setToast({
        type: 'error',
        title: 'Contraseña insegura',
        message: 'La contraseña inicial debe contener al menos 8 caracteres.'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createUser({
        name: newUser.name,
        rut: newUser.rut,
        email: newUser.email,
        role: newUser.role,
        faena: newUser.faena,
        password: newUser.password
      });

      setToast({
        type: 'success',
        title: 'Usuario registrado',
        message: `El usuario ${newUser.rut} fue creado y hasheado con Argon2 exitosamente.`
      });
      setShowCreateModal(false);
      setNewUser({
        name: '',
        rut: '',
        email: '',
        role: 'cargador',
        faena: 'Faena Cordillera',
        password: ''
      });
      await loadUsers();
    } catch (err) {
      const msg = err.error?.message || err.message || 'Error al crear el usuario.';
      setToast({ type: 'error', title: 'Error de creación', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      role: (user.role || 'Cargador').toLowerCase() === 'administrador' ? 'admin' : (user.role || 'cargador').toLowerCase(),
      faena: user.faena || 'Faena Cordillera',
      password: ''
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsSubmitting(true);
      const payload = {
        name: editFormData.name,
        role: editFormData.role,
        faena: editFormData.faena
      };
      if (editFormData.password) {
        if (editFormData.password.length < 8) {
          setToast({
            type: 'error',
            title: 'Contraseña muy corta',
            message: 'La nueva contraseña debe tener al menos 8 caracteres.'
          });
          setIsSubmitting(false);
          return;
        }
        payload.password = editFormData.password;
      }

      await updateUser(editingUser.id, payload);
      setToast({
        type: 'success',
        title: 'Usuario actualizado',
        message: `Datos del usuario ${editingUser.rut} actualizados correctamente en base de datos.`
      });
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      const msg = err.error?.message || err.message || 'Error al actualizar el usuario.';
      setToast({ type: 'error', title: 'Actualización bloqueada', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (roleName) => {
    const key = (roleName || '').toLowerCase();
    return roleTags[key] || roleTags.cargador;
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
          <div className={`flex-shrink-0 mt-0.5 ${toast.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
            {toast.type === 'error' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
          onClick={() => setShowCreateModal(true)}
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
          <p className="text-2xl font-bold text-white mt-1">{counts.total}</p>
          <span className="text-[10px] text-slate-500">Cuentas provisionadas</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-amber-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-amber-400">Administradores</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{counts.admins}</p>
          <span className="text-[10px] text-slate-500">Control total del sistema</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-blue-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-blue-400">Cargadores de Datos</span>
          <p className="text-2xl font-bold text-blue-400 mt-1">{counts.cargadores}</p>
          <span className="text-[10px] text-slate-500">Importación Excel y validación</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-emerald-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-emerald-400">Consultores</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{counts.consultores}</p>
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
          {[
            { id: 'all', label: 'Todos' },
            { id: 'admin', label: 'Admin' },
            { id: 'cargador', label: 'Cargador' },
            { id: 'consultor', label: 'Consultor' }
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                roleFilter === r.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {r.label}
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
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span>Cargando usuarios desde PostgreSQL...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    No se encontraron usuarios que coincidan con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const badge = getRoleBadge(u.role);
                  const isActionLoading = actionLoadingId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">
                        <p className="font-mono font-bold text-amber-400 text-[11px]" title={u.id}>
                          {u.id.slice(0, 8)}...
                        </p>
                        <p className="text-[11px] text-slate-400">{u.rut}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-white">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 font-medium">{u.faena || 'Todas las faenas'}</td>
                      <td className="p-3">
                        <p className="text-[10px] text-slate-400">Último ingreso: {u.lastLogin || 'Sin ingresos'}</p>
                        {u.failed_login_attempts > 0 ? (
                          <span className="text-[9px] text-rose-400 font-semibold">⚠️ {u.failed_login_attempts} intentos fallidos</span>
                        ) : (
                          <span className="text-[9px] text-slate-500">Sin bloqueos</span>
                        )}
                      </td>
                      <td className="p-3">
                        {u.is_active ? (
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
                            onClick={() => handleOpenEdit(u)}
                            className="px-2 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isActionLoading}
                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                              u.is_active
                                ? 'bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30'
                                : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30'
                            } ${isActionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={u.is_active ? 'Suspender acceso' : 'Habilitar acceso'}
                          >
                            {isActionLoading ? '...' : u.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Crear Usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Registrar Nuevo Usuario</h3>
            <p className="text-xs text-slate-400 mb-4">
              Crea una cuenta corporativa bajo política de privilegios mínimos y hashing criptográfico Argon2.
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
                  <label className="text-[11px] font-semibold text-slate-300">RUT (Módulo 11)</label>
                  <input
                    type="text"
                    required
                    placeholder="12.345.678-5"
                    value={newUser.rut}
                    onChange={(e) => setNewUser({ ...newUser, rut: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Rol Asignado</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="cargador">Cargador de Datos</option>
                    <option value="consultor">Consultor / Auditor</option>
                    <option value="admin">Administrador</option>
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
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Contraseña Inicial</label>
                  <input
                    type="password"
                    required
                    placeholder="Mín. 8 caracteres"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-colors shadow-md shadow-amber-900/30 flex items-center space-x-1.5"
                >
                  {isSubmitting ? <span>Guardando...</span> : <span>Guardar Usuario</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Usuario */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Editar Usuario</h3>
            <p className="text-xs text-slate-400 mb-4">
              Modifica rol, faena o restablece la clave para <span className="text-amber-400 font-mono">{editingUser.rut}</span>.
            </p>
            <form onSubmit={handleUpdateUser} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Rol Asignado</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="admin">Administrador</option>
                    <option value="cargador">Cargador de Datos</option>
                    <option value="consultor">Consultor / Auditor</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Faena Base</label>
                  <select
                    value={editFormData.faena}
                    onChange={(e) => setEditFormData({ ...editFormData, faena: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Faena Cordillera">Faena Cordillera</option>
                    <option value="Faena Norte">Faena Norte</option>
                    <option value="Faena Central">Faena Central</option>
                    <option value="Todas las faenas">Todas las faenas</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  Nueva Contraseña <span className="text-slate-500 font-normal">(Opcional, dejar vacía para conservar)</span>
                </label>
                <input
                  type="password"
                  placeholder="Mín. 8 caracteres para cambiarla"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-colors shadow-md shadow-amber-900/30 flex items-center space-x-1.5"
                >
                  {isSubmitting ? <span>Guardando...</span> : <span>Actualizar Usuario</span>}
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
