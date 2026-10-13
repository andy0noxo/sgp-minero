import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="border border-rose-900 bg-rose-950/40 rounded-xl p-8 text-center max-w-xl mx-auto mt-16">
        <h2 className="text-base font-bold text-rose-200 mb-2">Módulo no disponible</h2>
        <p className="text-xs text-rose-300">
          Tu rol no tiene permisos para acceder a este módulo.
        </p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;