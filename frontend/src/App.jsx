import React from 'react';
import LoginView from './LoginView';

function App() {
  const handleSuccess = (token) => {
    alert("¡Inicio de sesión correcto! Token almacenado en memoria volátil.");
  };

  return <LoginView onLoginSuccess={handleSuccess} />;
}

export default App;