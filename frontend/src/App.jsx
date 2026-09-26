import React, { useState } from 'react';
import LoginView from './LoginView';
import MainLayout from './MainLayout';

function App() {
  // En true para visualizar directamente la Vista 2
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  return (
    <>
      {!isAuthenticated ? (
        <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />
      ) : (
        <MainLayout onLogout={() => setIsAuthenticated(false)} />
      )}
    </>
  );
}

export default App;