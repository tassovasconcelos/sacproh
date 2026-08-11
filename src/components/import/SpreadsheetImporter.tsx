import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserProfile } from '../../types';
import { apiService, HistoricalImportTicket } from '../../services/apiService';

interface SpreadsheetImporterProps {
  currentUser: UserProfile;
  onImported?: () => Promise<void> | void;
}

const aliases: Record<string, string[]> = {
  protocol: ['protocolo', 'protocol', 'numero sac', 'n sac'],
  customerName: ['cliente', 'customer', 'razao social', 'nome cliente'],
  customerDocument: ['cnpj', 'cpf', 'documento cliente'],
  category: ['categoria', 'category', 'tipo atendimento'],
  description: ['descricao', 'ocorrencia', 'reclamacao', 'relato'],
  status: ['status', 'situacao'],
  priority: ['prioridade', 'priority'],
  productName: ['produto', 'product', 'item'],
  sku: ['sku', 'codigo produto', 'codigo'],
  quantity: ['quantidade', 'qtd'],
  lotNumber: ['lote', 'numero lote'],
  serialNumber: ['serie', 'numero serie'],
  invoiceNumber: ['nota fiscal', 'nf', 'numero nf'],
  openedAt: ['data abertura', 'abertura', 'data']
};

const normalize = (value: unknown) => String(value ?? '').trim();
const keyOf = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const SpreadsheetImporter: React.FC<SpreadsheetImporterProps> = ({ currentUser, onImported }) => {
  const [file, setFile] = useState<File | null>(null);
  const [tickets, setTickets] = useState<HistoricalImportTicket[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const readFile = async () => {
    if (!file) return setErrors(['Selecione uma planilha antes de continuar.']);
    setIsProcessing(true); setErrors([]); setMessage('');
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
      if (!rows.length) throw new Error('A primeira aba não possui registros.');
      const headers = Object.keys(rows[0]);
      const mapping: Record<string, string> = {};
      for (const [field, names] of Object.entries(aliases)) {
        const header = headers.find(h => names.includes(keyOf(h)));
        if (header) mapping[field] = header;
      }
      const missing = ['protocol', 'customerName', 'description', 'productName', 'lotNumber'].filter(k => !mapping[k]);
      if (missing.length) throw new Error(`Colunas obrigatórias não identificadas: ${missing.join(', ')}.`);

      const grouped = new Map<string, HistoricalImportTicket>();
      const validation: string[] = [];
      rows.forEach((row, index) => {
        const protocol = normalize(row[mapping.protocol]);
        if (!protocol) return validation.push(`Linha ${index + 2}: protocolo vazio.`);
        const item = {
          productName: normalize(row[mapping.productName]),
          sku: normalize(row[mapping.sku]),
          quantity: Math.max(1, Number(row[mapping.quantity]) || 1),
          lotNumber: normalize(row[mapping.lotNumber]),
          serialNumber: normalize(row[mapping.serialNumber])
        };
        if (!item.productName) validation.push(`Linha ${index + 2}: produto vazio.`);
        if (!item.lotNumber) validation.push(`Linha ${index + 2}: lote vazio.`);
        const existing = grouped.get(protocol);
        if (existing) existing.items.push(item);
        else grouped.set(protocol, {
          protocol,
          customerName: normalize(row[mapping.customerName]),
          customerDocument: normalize(row[mapping.customerDocument]),
          category: normalize(row[mapping.category]) || 'SAC / Outros',
          description: normalize(row[mapping.description]),
          status: normalize(row[mapping.status]) || 'TRIAGE',
          priority: normalize(row[mapping.priority]) || 'MEDIUM',
          invoiceNumber: normalize(row[mapping.invoiceNumber]),
          openedAt: normalize(row[mapping.openedAt]),
          items: [item]
        });
      });
      setRowCount(rows.length); setTickets([...grouped.values()]); setErrors(validation.slice(0, 20));
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Não foi possível ler a planilha.']);
    } finally { setIsProcessing(false); }
  };

  const confirmImport = async () => {
    setIsProcessing(true); setErrors([]);
    try {
      const result = await apiService.importHistoricalTickets(tickets, currentUser);
      setMessage(`${result.imported} protocolos importados. ${result.skipped} já existentes foram ignorados.`);
      await onImported?.();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Falha ao gravar a importação.']);
    } finally { setIsProcessing(false); }
  };

  return <div className="space-y-5">
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <h1 className="text-xl font-bold text-[#10233F]">Importação da Base Histórica do SAC</h1>
      <p className="text-xs text-slate-500 mt-1">Leitura real de Excel/CSV, validação e agrupamento de vários produtos por protocolo.</p>
    </div>
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
      <label className="block border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer bg-slate-50">
        <UploadCloud className="w-8 h-8 mx-auto text-[#145EDB]" />
        <span className="font-bold block mt-2">{file?.name || 'Selecionar planilha .xlsx, .xls ou .csv'}</span>
        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { setFile(e.target.files?.[0] || null); setTickets([]); }} />
      </label>
      <button onClick={readFile} disabled={!file || isProcessing} className="w-full bg-[#145EDB] disabled:opacity-50 text-white font-bold py-2.5 rounded-lg flex justify-center gap-2"><FileText className="w-4 h-4" />{isProcessing ? 'Processando...' : 'Validar e preparar importação'}</button>
      {errors.length > 0 && <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900"><AlertTriangle className="w-4 h-4 inline mr-2" />{errors.map((e,i)=><div key={i}>{e}</div>)}</div>}
      {tickets.length > 0 && <>
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-900"><CheckCircle2 className="w-4 h-4 inline mr-2" />{rowCount} linhas agrupadas em {tickets.length} protocolos.</div>
        <div className="max-h-72 overflow-auto border rounded-lg"><table className="w-full"><thead className="bg-slate-50 sticky top-0"><tr><th className="p-2 text-left">Protocolo</th><th className="p-2 text-left">Cliente</th><th className="p-2 text-left">Categoria</th><th className="p-2">Itens</th></tr></thead><tbody>{tickets.slice(0,100).map(t=><tr key={t.protocol} className="border-t"><td className="p-2 font-mono font-bold">{t.protocol}</td><td className="p-2">{t.customerName}</td><td className="p-2">{t.category}</td><td className="p-2 text-center">{t.items.length}</td></tr>)}</tbody></table></div>
        <button onClick={confirmImport} disabled={isProcessing || errors.length > 0} className="w-full bg-[#E51B2B] disabled:opacity-50 text-white font-bold py-2.5 rounded-lg">Confirmar gravação no Supabase</button>
      </>}
      {message && <div className="bg-emerald-100 text-emerald-900 font-bold p-3 rounded-lg">{message}</div>}
    </div>
  </div>;
};

