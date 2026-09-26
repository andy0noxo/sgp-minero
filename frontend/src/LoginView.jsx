import React, { useState } from 'react';

export default function LoginView({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('18.452.931-K');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!identifier.trim()) newErrors.identifier = 'Ingrese su RUT o correo institucional.';
    if (!password) newErrors.password = 'Ingrese su contraseña corporativa.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) {
      setToast({
        title: 'Acceso Bloqueado (429)',
        message: 'Demasiados intentos fallidos. Intente nuevamente en 5 minutos.',
      });
      return;
    }

    if (!validateForm()) return;
    setIsLoading(true);
    setToast(null);

    try {
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identificador: identifier.trim(), password }),
      });

      if (response.ok) {
        const data = await response.json();
        setFailedAttempts(0);
        if (onLoginSuccess) onLoginSuccess(data.access_token);
      } else if (response.status === 401) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        setToast({
          title: 'Error de Autenticación (401)',
          message: 'RUT o contraseña incorrectos.',
        });
        if (newAttempts >= 3) {
          setIsLocked(true);
          setToast({
            title: 'Cuenta Temporalmente Bloqueada',
            message: 'Has alcanzado el límite de 3 intentos fallidos consecutivos.',
          });
        }
      } else {
        setToast({
          title: 'Error de Conexión',
          message: 'No fue posible comunicar con el servidor central de Faena.',
        });
      }
    } catch (err) {
      setToast({
        title: 'Error de Autenticación (401)',
        message: 'RUT o contraseña incorrectos.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0b1120] flex items-center justify-center p-4 relative font-sans select-none">
      {toast && (
        <aside className="fixed top-6 right-6 z-50 bg-white border-l-4 border-red-500 rounded-lg shadow-2xl p-4 flex items-start space-x-3 max-w-sm">
          <div className="flex-shrink-0 text-red-500 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-900">{toast.title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 ml-2">
            ✕
          </button>
        </aside>
      )}

      <main className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        <header className="flex flex-col items-center mb-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30 text-white font-bold">
              ▲
            </div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-wide">
              SGP-MINERO
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1.5 text-center">
            Sistema de Gestión de Pasajes · Faena Cordillera
          </p>
        </header>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              RUT o Correo Electrónico
            </label>
            <input
              type="text"
              disabled={isLoading || isLocked}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (errors.identifier) setErrors({ ...errors, identifier: null });
              }}
              placeholder="12.345.678-9 o usuario@minera.cl"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {errors.identifier && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.identifier}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Contraseña Corporativa
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                disabled={isLoading || isLocked}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                placeholder="••••••••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.password}</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-60"
            >
              {isLoading ? 'Autenticando...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>

        <footer className="mt-8 text-center border-t border-slate-100 pt-4">
          <p className="text-[10px] tracking-wider font-semibold text-slate-400 uppercase">
            CUMPLIMIENTO LEY 19.628 · AES-128
          </p>
        </footer>
      </main>
    </div>
  );
}