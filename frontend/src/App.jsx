import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginView from './LoginView';
import MainLayout from './MainLayout';
import UploadExcelView from './UploadExcelView';
import DashboardView from './DashboardView';
import UploadsHistoryView from './UploadsHistoryView';
import UsersView from './UsersView';
import AuditView from './AuditView';
import ProtectedRoute from './ProtectedRoute';
import {
  clearAccessToken,
  getCurrentUser,
  getUserFromToken,
  logout,
  refreshToken,
  setAccessToken,
} from './api';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshToken()
      .then(({ data }) => {
        setAccessToken(data.access);
        const decoded = getUserFromToken(data.access);
        if (decoded?.role) {
          setUser(decoded);
        }
        return getCurrentUser().then((res) =>
          getUserFromToken(data.access, res.data)
        );
      })
      .then((resolvedUser) => setUser(resolvedUser))
      .catch(() => clearAccessToken())
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Verificando sesión...</div>;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAccessToken();
      setUser(null);
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Pública: Login */}
        <Route 
          path="/" 
          element={!user ? <LoginView onLoginSuccess={setUser} /> : <Navigate to={user.role === 'Consultor' ? '/dashboard' : '/carga'} replace />} 
        />

        {/* Rutas Privadas envueltas en MainLayout */}
        <Route element={<ProtectedRoute user={user}><MainLayout user={user} onLogout={handleLogout} /></ProtectedRoute>}>
          
          <Route path="/carga" element={
            <ProtectedRoute user={user} allowedRoles={['Administrador', 'Cargador']}>
              <UploadExcelView role={user?.role} />
            </ProtectedRoute>
          } />

          <Route path="/historial" element={
            <ProtectedRoute user={user} allowedRoles={['Cargador']}>
              <UploadsHistoryView />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute user={user} allowedRoles={['Consultor']}>
              <DashboardView />
            </ProtectedRoute>
          } />

          <Route path="/usuarios" element={
            <ProtectedRoute user={user} allowedRoles={['Administrador']}>
              <UsersView />
            </ProtectedRoute>
          } />

          <Route path="/admin-panel" element={
            <ProtectedRoute user={user} allowedRoles={['Administrador']}>
              <UsersView />
            </ProtectedRoute>
          } />

          <Route path="/auditoria" element={
            <ProtectedRoute user={user} allowedRoles={['Administrador']}>
              <AuditView />
            </ProtectedRoute>
          } />

        </Route>

        {/* Catch-all para URLs inexistentes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;