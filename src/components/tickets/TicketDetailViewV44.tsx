import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileDown, FileText, Paperclip, RefreshCw, Upload } from 'lucide-react';
import type { ServiceOrder, Ticket, TicketQualificationStage, TicketStatus, UserProfile, UserRole } from '../../types';
import { TicketDetailView as TicketDetailViewV43 } from './TicketDetailViewV43';
import { sacV44Service, type V44Attachment, type V44ProductSnapshot } from '../../services/sacV44Service';
import type { TicketEvent } from '../../services/sacV43Service';

interface TicketDetailViewProps {
  ticket: Ticket;
  currentUser: UserProfile;
  userRole: UserRole;
  users: UserProfile[];
  onBack: () => void;
  onUpdateStatus: (ticketId: string, newStatus: TicketStatus, notes: string) => void;
  onDispatch: (ticketId: string, assignedArea: string, assignedToId?: string, assignedToName?: string, notes?: string) => void;
  onCreateOS: (osData: Omit<ServiceOrder, 'id' | 'osNumber' | 'openedAt'>) => void;
  onUpdateTicket: (ticket: Ticket, changes: Partial<Ticket>) => Promise<void>;
  onDeleteTicket: (ticket: Ticket, reason: string) => Promise<void>;
}

const documentTypes = [
  ['EVIDENCE', 'Evidência / foto'],
  ['INVOICE', 'Nota fiscal'],
  ['TECHNICAL_REPORT', 'Laudo técnico'],
  ['CUSTOMER_DOCUMENT', 'Documento do cliente'],
  ['LOGISTICS', 'Logística / comprovante'],
  ['SUPPLIER', 'Fornecedor / fábrica'],
  ['QUALITY', 'Qualidade / CAPA'],
  ['OTHER', 'Outro documento']
] as const;

const stages: Array<[TicketQualificationStage, string]> = [
  ['REGISTRATION', 'Registro inicial'],
  ['DOCUMENT_VALIDATION', 'Validação documental'],
  ['TECHNICAL_TRIAGE', 'Triagem técnica'],
  ['INVESTIGATION', 'Investigação'],
  ['ACTION_PLAN', 'Plano de ação'],
  ['SOLUTION_VALIDATION', 'Validação da solução'],
  ['COMPLETED', 'Qualificação concluída']
];

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const TicketDetailView: React.FC<TicketDetailViewProps> = props => {
  const { ticket, currentUser } = props;
  const [products, setProducts] = useState<V44ProductSnapshot[]>([]);
  const [attachments, setAttachments] = useState<V44Attachment[]>([]);
  const [timeline, setTimeline] = useState<TicketEvent[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState('EVIDENCE');
  const [stage, setStage] = useState<TicketQualificationStage>(ticket.qualificationStage || 'REGISTRATION');
  const [attachmentDescription, setAttachmentDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadDossier = async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedProducts, loadedAttachments, loadedTimeline] = await Promise.all([
        sacV44Service.getProductSnapshots(ticket.id),
        sacV44Service.getAttachments(ticket.id),
        sacV44Service.getTimeline(ticket.id)
      ]);
      setProducts(loadedProducts);
      setAttachments(loadedAttachments);
      setTimeline(loadedTimeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o dossiê do protocolo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDossier(); }, [ticket.id]);

  const fullDescriptions = useMemo(() => products.filter(item => item.productDescription?.trim()).length, [products]);

  const upload = async () => {
    if (!files.length || uploading) return;
    setUploading(true);
    setMessage('');
    setError('');
    try {
      const results = await sacV44Service.uploadAttachments(ticket, files, currentUser, {
        documentType,
        qualificationStage: stage,
        description: attachmentDescription
      });
      const failed = results.filter(result => !result.ok);
      const success = results.length - failed.length;
      setMessage(`${success} arquivo(s) anexado(s) com sucesso${failed.length ? `; ${failed.length} falharam e podem ser reenviados.` : '.'}`);
      if (failed.length) setError(failed.map(item => `${item.fileName}: ${item.error}`).join(' | '));
      setFiles([]);
      setAttachmentDescription('');
      await loadDossier();
    } finally {
      setUploading(false);
    }
  };

  const downloadCsv = () => {
    const csv = sacV44Service.buildCsv(ticket, products, attachments, timeline);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${ticket.protocol.replace(/[^a-zA-Z0-9._-]/g, '_')}-dossie.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const printDossier = () => {
    const productRows = products.map(item => `<tr><td>${escapeHtml(item.productName)}</td><td>${escapeHtml(item.productDescription || '')}</td><td>${escapeHtml(item.productModel || '')}</td><td>${escapeHtml(item.sku || '')}</td><td>${escapeHtml(item.lotNumber || '')}</td><td>${escapeHtml(item.serialNumber || '')}</td><td>${escapeHtml(item.anvisaRegister || '')}</td></tr>`).join('');
    const attachmentRows = attachments.map(item => `<tr><td>${escapeHtml(item.fileName)}</td><td>${escapeHtml(item.documentType || '')}</td><td>${escapeHtml(item.qualificationStage || '')}</td><td>${escapeHtml(item.description || '')}</td><td>${escapeHtml(item.uploadedByName || '')}</td><td>${escapeHtml(new Date(item.createdAt).toLocaleString('pt-BR'))}</td></tr>`).join('');
    const historyRows = timeline.map(item => `<tr><td>${escapeHtml(new Date(item.occurredAt).toLocaleString('pt-BR'))}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.description || '')}</td><td>${escapeHtml(item.actorName || '')}</td></tr>`).join('');
    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) { setError('O navegador bloqueou a janela do relatório. Libere pop-ups para gerar o dossiê.'); return; }
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(ticket.protocol)}</title><style>body{font-family:Arial,sans-serif;color:#172033;padding:28px;font-size:12px}h1{font-size:22px}h2{font-size:15px;margin-top:24px;border-bottom:1px solid #ccd3df;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #d8dee9;padding:7px;text-align:left;vertical-align:top}th{background:#f4f6f9}.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px}.description{white-space:pre-wrap;border:1px solid #d8dee9;padding:10px;background:#fafbfc}@media print{button{display:none}}</style></head><body><h1>Dossiê do Protocolo ${escapeHtml(ticket.protocol)}</h1><div class="meta"><div><b>Cliente:</b> ${escapeHtml(ticket.customerName)}</div><div><b>CPF/CNPJ:</b> ${escapeHtml(ticket.customerDocument)}</div><div><b>Status:</b> ${escapeHtml(ticket.status)}</div><div><b>Prioridade:</b> ${escapeHtml(ticket.priority)}</div><div><b>Categoria:</b> ${escapeHtml(ticket.category)}</div><div><b>Subcategoria:</b> ${escapeHtml(ticket.subcategory || '')}</div></div><h2>Relato da ocorrência</h2><div class="description">${escapeHtml(ticket.description)}</div><h2>Produtos</h2><table><thead><tr><th>Produto</th><th>Descrição completa</th><th>Modelo</th><th>SKU</th><th>Lote</th><th>Série</th><th>ANVISA</th></tr></thead><tbody>${productRows}</tbody></table><h2>Anexos e evidências</h2><table><thead><tr><th>Arquivo</th><th>Tipo</th><th>Etapa</th><th>Descrição</th><th>Responsável</th><th>Data</th></tr></thead><tbody>${attachmentRows}</tbody></table><h2>Histórico e evolução</h2><table><thead><tr><th>Data</th><th>Evento</th><th>Descrição</th><th>Responsável</th></tr></thead><tbody>${historyRows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
        <div className="bg-[#0B2343] text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><FileText className="w-5 h-5" /><h2 className="font-extrabold">SACPROH V4.4 · Dossiê do protocolo</h2></div>
            <p className="text-xs text-slate-300 mt-1">Produto completo, anexos por etapa, histórico consolidado e relatórios.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void loadDossier()} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Atualizar</button>
            <button type="button" onClick={downloadCsv} className="px-3 py-2 rounded-lg bg-white text-[#0B2343] text-xs font-bold flex items-center gap-1"><Download className="w-3.5 h-3.5" />CSV</button>
            <button type="button" onClick={printDossier} className="px-3 py-2 rounded-lg bg-[#FF8500] text-white text-xs font-bold flex items-center gap-1"><FileDown className="w-3.5 h-3.5" />Relatório / PDF</button>
          </div>
        </div>

        <div className="p-5 space-y-5 text-xs">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}
          {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">{message}</div>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border"><p className="text-slate-500">Produtos</p><p className="text-lg font-extrabold">{products.length}</p></div>
            <div className="p-3 rounded-lg bg-slate-50 border"><p className="text-slate-500">Descrições completas</p><p className="text-lg font-extrabold">{fullDescriptions}/{products.length}</p></div>
            <div className="p-3 rounded-lg bg-slate-50 border"><p className="text-slate-500">Anexos</p><p className="text-lg font-extrabold">{attachments.length}</p></div>
            <div className="p-3 rounded-lg bg-slate-50 border"><p className="text-slate-500">Eventos no histórico</p><p className="text-lg font-extrabold">{timeline.length}</p></div>
          </div>

          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-[#10233F]">Produto e descritivo integral</h3>
            {products.map(product => (
              <div key={product.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex flex-wrap justify-between gap-2"><strong className="text-sm text-[#10233F]">{product.productName}</strong><span className="font-mono text-slate-500">{product.sku || 'SKU não informado'}</span></div>
                <p className="leading-relaxed whitespace-pre-wrap text-slate-700">{product.productDescription || 'Descrição completa ainda não cadastrada no produto mestre.'}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-600"><span><b>Modelo:</b> {product.productModel || '-'}</span><span><b>Lote:</b> {product.lotNumber || '-'}</span><span><b>Série:</b> {product.serialNumber || '-'}</span><span><b>ANVISA:</b> {product.anvisaRegister || '-'}</span><span><b>Fabricante:</b> {product.manufacturerName || '-'}</span><span><b>Importador:</b> {product.importerName || '-'}</span><span><b>Distribuidor:</b> {product.distributorName || '-'}</span><span><b>Quantidade:</b> {product.quantity}</span></div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-dashed border-[#145EDB]/50 bg-blue-50 space-y-3">
            <div className="flex items-center gap-2"><Paperclip className="w-4 h-4 text-[#145EDB]" /><h3 className="font-extrabold text-sm text-[#10233F]">Adicionar anexos à evolução</h3></div>
            <div className="grid md:grid-cols-3 gap-3">
              <label className="font-bold">Tipo documental<select value={documentType} onChange={e => setDocumentType(e.target.value)} className="mt-1 w-full bg-white border rounded-lg p-2 font-normal">{documentTypes.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="font-bold">Etapa da qualificação<select value={stage} onChange={e => setStage(e.target.value as TicketQualificationStage)} className="mt-1 w-full bg-white border rounded-lg p-2 font-normal">{stages.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="font-bold">Descrição da evidência<input value={attachmentDescription} onChange={e => setAttachmentDescription(e.target.value)} placeholder="Ex.: foto recebida do cliente em 21/08" className="mt-1 w-full bg-white border rounded-lg p-2 font-normal" /></label>
            </div>
            <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} className="block w-full" />
            {files.length > 0 && <div className="text-[#145EDB] font-semibold">{files.map(file => file.name).join(' • ')}</div>}
            <button type="button" onClick={upload} disabled={!files.length || uploading} className="px-4 py-2 rounded-lg bg-[#145EDB] text-white font-bold disabled:opacity-50 flex items-center gap-1"><Upload className="w-3.5 h-3.5" />{uploading ? 'Enviando arquivos...' : 'Anexar e registrar no histórico'}</button>
          </div>

          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-[#10233F]">Documentos do protocolo</h3>
            {attachments.length === 0 ? <p className="p-5 bg-slate-50 rounded-lg text-slate-500">Nenhum anexo registrado.</p> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{attachments.map(file => <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="p-3 rounded-xl bg-slate-50 border hover:border-[#145EDB] space-y-1"><p className="font-bold break-all">{file.fileName}</p><p className="text-slate-500">{file.documentType || 'Documento'} • {file.qualificationStage || 'Sem etapa'}</p>{file.description && <p className="text-slate-700">{file.description}</p>}<p className="text-[10px] text-slate-400">{file.uploadedByName || 'Usuário'} • {new Date(file.createdAt).toLocaleString('pt-BR')}</p></a>)}</div>}
          </div>
        </div>
      </section>

      <TicketDetailViewV43 {...props} />
    </div>
  );
};
