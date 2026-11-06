import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { decodeJwtPayload } from './api';

const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const activeRole = user.role || decodeJwtPayload()?.role;
  const homeRoute = activeRole === 'Consultor' ? '/dashboard' : '/carga';

  if (allowedRoles && !allowedRoles.includes(activeRole)) {
    return (
      <div className="border border-rose-900 bg-rose-950/40 rounded-xl p-8 text-center max-w-xl mx-auto mt-16 space-y-4">
        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-rose-900/60 text-rose-200 border border-rose-700/60">
          HTTP 403 Forbidden · Control RBAC
        </span>
        <h2 className="text-lg font-bold text-rose-200">
          Error 403: Acceso Denegado
        </h2>
        <p className="text-xs text-rose-300 leading-relaxed">
          Tu perfil activo ({activeRole || 'Sin rol asignado'}) no cuenta con
          autorización para acceder a este módulo corporativo.
        </p>
        <div className="pt-2">
          <Link
            to={homeRoute}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
          >
            Volver a mi módulo asignado
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;