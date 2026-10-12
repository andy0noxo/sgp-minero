import React, { useEffect, useState } from 'react';
import LoginView from './LoginView';
import MainLayout from './MainLayout';
import { clearAccessToken, getCurrentUser, refreshToken, setAccessToken } from './api';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshToken()
      .then(({ data }) => {
        setAccessToken(data.access);
        return getCurrentUser();
      })
      .then(({ data }) => setUser(data))
      .catch(() => clearAccessToken())
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Verificando sesión...</div>;
  }

  return (
    <>
      {!user ? (
        <LoginView onLoginSuccess={setUser} />
      ) : (
        <MainLayout user={user} onLogout={() => { clearAccessToken(); setUser(null); }} />
      )}
    </>
  );
}

export default App;