import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';

const MainLayout = ({ user, onLogout }) => {
  const [faena, setFaena] = useState('Faena Cordillera');
  const location = useLocation();

  const navigationItems = [
    { id: '/dashboard', label: 'Panel de Control', icon: '📊', roles: ['Consultor'] },
    { id: '/carga', label: user?.role === 'Administrador' ? 'Mantenedor de Personas' : 'Carga Masiva (Excel)', icon: '📁', roles: ['Administrador', 'Cargador'] },
    { id: '/historial', label: 'Mis Cargas', icon: '🧾', roles: ['Cargador'] },
  ];

  const filteredMenu = navigationItems.filter(item => item.roles.includes(user?.role));

  const roleBadges = {
    Administrador: { label: 'Administrador', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    Cargador: { label: 'Cargador de Datos', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    Consultor: { label: 'Consultor / Auditor', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-amber-600 flex items-center justify-center font-bold text-white shadow-md shadow-amber-900/30">
            ▲
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-none">SGP-MINERO</h1>
            <span className="text-[11px] text-slate-400">Sistema de Gestión de Pasajes</span>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Selector de Faena */}
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 font-medium">Faena:</span>
            <select
              value={faena}
              onChange={(e) => setFaena(e.target.value)}
              className="bg-transparent text-xs font-semibold text-amber-400 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-white">Todas</option>
              <option value="Faena Cordillera" className="bg-slate-900 text-white">Faena Cordillera</option>
              <option value="Faena Norte" className="bg-slate-900 text-white">Faena Norte</option>
              <option value="Faena Central" className="bg-slate-900 text-white">Faena Central</option>
            </select>
          </div>

          <div className="flex items-center space-x-3 border-l border-slate-800 pl-6">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-200">{user?.name || user?.email_corporativo || user?.rut}</div>
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${roleBadges[user?.role]?.bg}`}>
                {roleBadges[user?.role]?.label}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors text-xs"
              title="Cerrar Sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-slate-900/60 border-r border-slate-800 p-4 flex flex-col justify-between">
          <nav className="space-y-1">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Navegación Operativa
            </p>
            {filteredMenu.map((item) => {
              const isActive = location.pathname.startsWith(item.id);
              return (
                <Link
                  key={item.id}
                  to={item.id}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-900/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[10px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">CUMPLIMIENTO NORMATIVO</p>
            <p>Ley 19.628 · AES-128</p>
            <p className="text-slate-500 pt-1">Build v0.2.0-Sprint2</p>
          </div>
        </aside>

        <main className="flex-1 bg-slate-950 p-8 overflow-y-auto">
          {/* Aquí React Router inyecta la vista correcta */}
          <Outlet context={{ faena }} />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;