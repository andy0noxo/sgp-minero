import React, { useState } from 'react';

const mockReports = [
  {
    id: 'REP-2026-101',
    title: 'Nómina Consolidada Subida Turno 7x7 A',
    period: 'Semana 40 (Octubre 2026)',
    faena: 'Faena Cordillera',
    records: 148,
    generatedBy: 'Ángel Frei',
    date: '2026-10-02',
    format: 'XLSX',
    size: '1.4 MB'
  },
  {
    id: 'REP-2026-102',
    title: 'Reporte de Ocupación Vuelos Chárter SCL-CJC',
    period: 'Septiembre 2026',
    faena: 'Faena Cordillera',
    records: 620,
    generatedBy: 'Bernardo Díaz',
    date: '2026-10-01',
    format: 'PDF',
    size: '3.8 MB'
  },
  {
    id: 'REP-2026-103',
    title: 'Manifiesto de Pasajeros Buses Interurbanos',
    period: 'Turno 4x3 (Bajada)',
    faena: 'Faena Norte',
    records: 92,
    generatedBy: 'Ángel Frei',
    date: '2026-09-30',
    format: 'XLSX',
    size: '840 KB'
  },
  {
    id: 'REP-2026-104',
    title: 'Consolidado Mensual de Tránsitos y Viáticos',
    period: 'Septiembre 2026',
    faena: 'Todas las faenas',
    records: 1240,
    generatedBy: 'Sistema Automático',
    date: '2026-09-30',
    format: 'PDF',
    size: '5.2 MB'
  }
];

const ReportsView = () => {
  const [reports, setReports] = useState(mockReports);
  const [selectedFaena, setSelectedFaena] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const handleGenerateReport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert('Nómina oficial generada exitosamente en formato .XLSX');
    }, 1200);
  };

  const handleDownload = (reportTitle, format) => {
    alert(`Descargando archivo oficial: "${reportTitle}.${format.toLowerCase()}"`);
  };

  const filteredReports = reports.filter((rep) => {
    const matchesFaena = selectedFaena === 'all' || rep.faena === selectedFaena || rep.faena === 'Todas las faenas';
    const matchesFormat = selectedFormat === 'all' || rep.format === selectedFormat;
    return matchesFaena && matchesFormat;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Reportes y Nóminas Oficiales</h2>
          <p className="text-xs text-slate-400 mt-1">
            Generación y descarga de nóminas consolidadas de transporte, ocupación de chárters y manifiestos de pasajeros.
          </p>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={isExporting}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-amber-900/30"
        >
          <span>{isExporting ? '↻' : '📊'}</span>
          <span>{isExporting ? 'Procesando Nómina...' : 'Generar Nueva Nómina Consolidada'}</span>
        </button>
      </div>

      {/* KPI Cards de Métricas Operativas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Total Pasajeros Trasladados</span>
          <p className="text-2xl font-bold text-white mt-1">2,100</p>
          <span className="text-[10px] text-slate-500">Últimos 30 días</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-amber-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-amber-400">Ocupación Promedio Chárters</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">94.2%</p>
          <span className="text-[10px] text-slate-500">Santiago - Calama</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-emerald-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-emerald-400">Cumplimiento de Turnos</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">99.1%</p>
          <span className="text-[10px] text-slate-500">Régimen 7x7 y 4x3</span>
        </div>
        <div className="p-4 bg-slate-900/60 border border-blue-500/30 rounded-xl">
          <span className="text-[11px] font-semibold uppercase text-blue-400">Nóminas Auditadas</span>
          <p className="text-2xl font-bold text-blue-400 mt-1">36</p>
          <span className="text-[10px] text-slate-500">Certificadas Ley 19.628</span>
        </div>
      </div>

      {/* Filtros de Nóminas */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Faena:</span>
          <select
            value={selectedFaena}
            onChange={(e) => setSelectedFaena(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todas las faenas</option>
            <option value="Faena Cordillera">Faena Cordillera</option>
            <option value="Faena Norte">Faena Norte</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Formato:</span>
          {['all', 'XLSX', 'PDF'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedFormat === fmt
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {fmt === 'all' ? 'Todos' : fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Reportes Generados */}
      <div className="border border-slate-800 bg-slate-900/50 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Nómina / Manifiesto</th>
                <th className="p-3">Período / Faena</th>
                <th className="p-3">Registros</th>
                <th className="p-3">Generado por</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Formato</th>
                <th className="p-3 text-right">Descarga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-amber-400">{report.id}</td>
                  <td className="p-3 font-semibold text-white">{report.title}</td>
                  <td className="p-3">
                    <p className="text-slate-200">{report.period}</p>
                    <p className="text-[10px] text-slate-400">{report.faena}</p>
                  </td>
                  <td className="p-3 font-semibold text-slate-200">{report.records} pasajeros</td>
                  <td className="p-3 text-slate-400">{report.generatedBy}</td>
                  <td className="p-3 text-slate-400 whitespace-nowrap">{report.date}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        report.format === 'XLSX'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {report.format} · {report.size}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDownload(report.title, report.format)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded text-[11px] font-medium transition-colors"
                      title="Descargar archivo"
                    >
                      📥 Descargar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;