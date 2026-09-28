import React, { useState } from 'react';

const UploadExcelView = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | processing | success

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('idle');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.csv') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      setUploadStatus('idle');
    }
  };

  const handleProcess = () => {
    if (!selectedFile) return;
    setUploadStatus('processing');
    setTimeout(() => {
      setUploadStatus('success');
    }, 1200);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Carga Masiva de Nóminas de Pasajes</h2>
          <p className="text-xs text-slate-400 mt-1">
            Importación automatizada de nóminas de traslado de personal para faenas mineras en formato .xlsx o .csv.
          </p>
        </div>
        <button
          onClick={() => alert('Descargando plantilla oficial: plantilla_nomina_sgp_v1.xlsx')}
          className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-sm"
        >
          <span>📥</span>
          <span>Descargar Plantilla Oficial</span>
        </button>
      </div>

      {/* Zona de Arrastre / Carga de Archivo */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragging
            ? 'border-amber-500 bg-amber-500/5'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl text-amber-500">
            📊
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">
              Arrastra y suelta aquí el archivo de nómina o{' '}
              <label className="text-amber-500 hover:text-amber-400 cursor-pointer underline underline-offset-2">
                explora tus archivos
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Formatos permitidos: .XLSX, .XLS, .CSV (Tamaño máximo admitido: 10 MB)
            </p>
          </div>
        </div>
      </div>

      {/* Panel de Estado y Resumen de Validación Previa */}
      {selectedFile && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">📄</div>
              <div>
                <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB · Listo para procesar
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium"
            >
              Quitar archivo
            </button>
          </div>

          {/* Tarjetas de Métricas Simuladas */}
          {uploadStatus === 'success' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Registros Detectados</span>
                <p className="text-lg font-bold text-white mt-0.5">148</p>
              </div>
              <div className="p-3 bg-slate-950/70 border border-emerald-500/20 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-emerald-400">Formato Válido</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">146</p>
              </div>
              <div className="p-3 bg-slate-950/70 border border-amber-500/20 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-amber-400">Observaciones (RUT/Fecha)</span>
                <p className="text-lg font-bold text-amber-400 mt-0.5">2</p>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800/80">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleProcess}
              disabled={uploadStatus === 'processing'}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-amber-900/30 flex items-center space-x-2"
            >
              {uploadStatus === 'processing' ? (
                <>
                  <span className="animate-spin text-sm">↻</span>
                  <span>Procesando archivo...</span>
                </>
              ) : uploadStatus === 'success' ? (
                <span>Confirmar e Importar</span>
              ) : (
                <span>Validar Nómina</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Nota de Auditoría y Seguridad */}
      <div className="p-4 bg-slate-900/30 border border-slate-800/60 rounded-lg flex items-start space-x-3 text-slate-400">
        <span className="text-amber-500 text-sm">ℹ️</span>
        <div className="text-[11px] space-y-0.5 leading-relaxed">
          <p className="font-semibold text-slate-300">Validación de Esquema y Privacidad</p>
          <p>
            El sistema comprueba automáticamente la consistencia de RUT, turnos 7x7/4x3 y duplicidad de asientos según la política corporativa y Ley 19.628 de protección de datos personales.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadExcelView;