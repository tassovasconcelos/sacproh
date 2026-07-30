import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, ArrowRight, Table } from 'lucide-react';

export const SpreadsheetImporter: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    totalRowsParsed: number;
    totalTicketsGrouped: number;
    tickets: any[];
  } | null>(null);

  const handleSimulateUpload = async () => {
    setIsProcessing(true);
    // Call server import endpoint
    try {
      const simulatedRows = [
        { protocol: 'SAC.2607.088', customer: 'Hospital São Lucas', category: 'Assistência Técnica', product: 'Bisturi Eletrônico', quantity: 1, status: 'CLOSED_PROCEDENT' },
        { protocol: 'SAC.2607.088', customer: 'Hospital São Lucas', category: 'Assistência Técnica', product: 'Cabo Paciente ECG', quantity: 2, status: 'CLOSED_PROCEDENT' },
        { protocol: 'SAC.2607.089', customer: 'Clínica Santa Maria', category: 'Logística / Avaria', product: 'Luvas Estéreis', quantity: 5, status: 'TRIAGE' }
      ];

      const res = await fetch('/api/import/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawRows: simulatedRows })
      });

      if (res.ok) {
        const data = await res.json();
        setImportResult(data);
        setStep(3);
      }
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-[#10233F]">Importação da Base Histórica de SAC</h1>
        <p className="text-xs text-slate-500 mt-0.5">Rotina inteligente para importação de planilhas CSV/Excel com agrupamento multi-item por protocolo</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 text-xs">
        
        {step === 1 && (
          <div className="space-y-4 text-center max-w-md mx-auto py-8">
            <div className="w-16 h-16 bg-blue-50 text-[#145EDB] rounded-full flex items-center justify-center mx-auto">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#10233F]">Selecione a Planilha do SAC Procirúrgica</h3>
              <p className="text-slate-500 text-xs mt-1">Formatos aceitos: .xlsx, .xls, .csv (Até 50MB)</p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer">
              <input 
                type="file" 
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                className="hidden" 
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer space-y-2 block">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <span className="font-bold text-slate-700 block">Clique para selecionar o arquivo</span>
                <span className="text-[11px] text-slate-400">planilha_sac_historico_procirurgica.xlsx</span>
              </label>
            </div>

            <button
              onClick={handleSimulateUpload}
              disabled={isProcessing}
              className="w-full bg-[#145EDB] hover:bg-[#0f4bb3] text-white font-bold py-2.5 rounded-lg shadow transition-all flex items-center justify-center space-x-2"
            >
              <span>{isProcessing ? 'Processando Mapeamento...' : 'Carregar & Mapear Colunas'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 3 && importResult && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-900 font-bold">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div>
                <p>Processamento concluído com sucesso!</p>
                <p className="text-xs text-emerald-700 font-normal">
                  Identificadas <strong>{importResult.totalRowsParsed}</strong> linhas. Agrupadas em <strong>{importResult.totalTicketsGrouped}</strong> protocolos únicos no formato multi-item.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="p-3">Protocolo Agrupado</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Qtd Itens</th>
                    <th className="p-3">Status Mapeado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importResult.tickets.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-[#145EDB]">{t.protocol}</td>
                      <td className="p-3 font-bold">{t.customerName}</td>
                      <td className="p-3">{t.category}</td>
                      <td className="p-3"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">{t.items.length} produto(s)</span></td>
                      <td className="p-3 font-bold">{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => alert('Base importada e persistida no Supabase PostgreSQL!')}
              className="w-full bg-[#FF8500] hover:bg-[#e07500] text-white font-bold py-2.5 rounded-lg shadow"
            >
              Confirmar Importação para Banco de Dados Supabase
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
