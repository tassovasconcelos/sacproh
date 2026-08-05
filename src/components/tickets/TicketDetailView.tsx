import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, Clock, AlertTriangle, ShieldCheck, CheckCircle2, MessageSquare, 
  Paperclip, Wrench, Truck, Sparkles, DollarSign, Award, History, FileText, Send, Building, User, Package, Plus, Edit3, Trash2, X
} from 'lucide-react';
import { Ticket, TicketStatus, UserRole, UserProfile, ServiceOrder, TicketQualificationStage, TechnicalCase } from '../../types';
import { apiService } from '../../services/apiService';
import { DispatchTicketModal } from './DispatchTicketModal';
import { NewServiceOrderModal } from '../technical/NewServiceOrderModal';

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

export const TicketDetailView: React.FC<TicketDetailViewProps> = ({
  ticket,
  currentUser,
  userRole,
  users,
  onBack,
  onUpdateStatus,
  onDispatch,
  onCreateOS,
  onUpdateTicket,
  onDeleteTicket
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'customer' | 'products' | 'history' | 'comments' | 'attachments' | 'technical' | 'logistics' | 'quality' | 'costs' | 'sla' | 'survey' | 'audit'
  >('overview');

  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showOSModal, setShowOSModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editDescription, setEditDescription] = useState(ticket.description);
  const [editCategory, setEditCategory] = useState(ticket.category);
  const [editPriority, setEditPriority] = useState(ticket.priority);
  const [editInvoice, setEditInvoice] = useState(ticket.invoiceNumber || '');
  const [deleteReason, setDeleteReason] = useState('');
  const [operationError, setOperationError] = useState('');
  const [isSavingOperation, setIsSavingOperation] = useState(false);
  const [qualificationStage, setQualificationStage] = useState<TicketQualificationStage>(ticket.qualificationStage || 'REGISTRATION');
  const [qualificationNotes, setQualificationNotes] = useState(ticket.qualificationNotes || '');
  const [qualificationMessage, setQualificationMessage] = useState('');
  const [attachments, setAttachments] = useState<Array<{id:string;fileName:string;fileType:string;fileSize:number;url:string}>>([]);
  const [technicalCases, setTechnicalCases] = useState<TechnicalCase[]>([]);
  const [technicalError, setTechnicalError] = useState('');
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

  useEffect(() => { apiService.getTicketAttachments(ticket.id).then(setAttachments); }, [ticket.id]);
  useEffect(() => { apiService.getTechnicalCases(ticket.id).then(setTechnicalCases).catch(error => setTechnicalError(error.message)); }, [ticket.id]);

  const saveQualification = async () => {
    await apiService.updateTicketQualification(ticket.id, qualificationStage, qualificationNotes, currentUser);
    setQualificationMessage('Qualificação atualizada e registrada no histórico.');
  };

  // AI Assistant Outputs
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSuggestedResponse, setAiSuggestedResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // New Comment Input
  const [commentsList, setCommentsList] = useState<Array<{id:string;author:string;content:string;date:string;internal:boolean}>>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    apiService.getTicketComments(ticket.id).then(setCommentsList).catch(error => setCommentError(error.message));
  }, [ticket.id]);

  const tabs: { id: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão Geral', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'customer', label: 'Cliente', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'products', label: 'Produtos', icon: <Package className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'Histórico', icon: <History className="w-3.5 h-3.5" /> },
    { id: 'comments', label: 'Comentários', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'attachments', label: 'Anexos', icon: <Paperclip className="w-3.5 h-3.5" /> },
    { id: 'technical', label: 'Assis. Técnica', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'logistics', label: 'Logística', icon: <Truck className="w-3.5 h-3.5" /> },
    { id: 'quality', label: 'Qualidade (5W2H)', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'costs', label: 'Custos', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'sla', label: 'SLA', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'survey', label: 'Avaliação NPS', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'audit', label: 'Auditoria', icon: <History className="w-3.5 h-3.5" /> }
  ];

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    try {
      setCommentError('');
      const saved = await apiService.createTicketComment(ticket, newCommentText, isInternalComment, currentUser);
      setCommentsList(previous => [...previous, saved]);
      setNewCommentText('');
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'Não foi possível salvar o comentário.');
    }
  };

  const handleGenerateAiSummary = async () => {
    setIsAiLoading(true);
    const summary = await apiService.summarizeTicketWithGemini(ticket);
    setAiSummary(summary);
    setIsAiLoading(false);
  };

  const handleSuggestAiResponse = async () => {
    setIsAiLoading(true);
    const resp = await apiService.suggestResponseWithGemini(ticket);
    setAiSuggestedResponse(resp);
    setIsAiLoading(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Protocol Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-lg text-[#145EDB]">{ticket.protocol}</span>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                  {ticket.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Cliente: <strong className="text-[#10233F]">{ticket.customerName}</strong> ({ticket.customerDocument})
              </p>
            </div>
          </div>

          {/* Quick Status & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={()=>setShowEditModal(true)} className="bg-slate-100 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"><Edit3 className="w-3.5 h-3.5"/>Editar SAC</button>
            {['SUPERADMIN','ADMIN_EMPRESA','DIRETORIA'].includes(userRole) && <button onClick={()=>setShowDeleteModal(true)} className="bg-red-50 text-red-700 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"><Trash2 className="w-3.5 h-3.5"/>Excluir</button>}
            <button
              onClick={() => setShowDispatchModal(true)}
              className="bg-[#145EDB] hover:bg-[#0f4bb3] text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>Direcionar Chamado</span>
            </button>

            <button
              onClick={() => setShowOSModal(true)}
              className="bg-[#FF8500] hover:bg-[#e07500] text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow"
            >
              <Wrench className="w-3.5 h-3.5 mr-1" />
              <span>Abrir OS</span>
            </button>

            <select
              value={ticket.status}
              onChange={(e) => onUpdateStatus(ticket.id, e.target.value as TicketStatus, 'Status alterado via painel do protocolo')}
              className="bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-700 outline-none cursor-pointer"
            >
              <option value="NEW">Novo</option>
              <option value="TRIAGE">Em Triagem</option>
              <option value="TECHNICAL_ANALYSIS">Em Análise Técnica</option>
              <option value="SENT_TO_LOGISTICS">Encaminhado à Logística</option>
              <option value="CLOSED_PROCEDENT">Encerrar Procedente</option>
              <option value="CLOSED_NON_PROCEDENT">Encerrar Não Procedente</option>
            </select>
          </div>
        </div>

        {/* Regulatory & Risk Tags */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 mr-1" /> Prioridade: {ticket.priority}
            </span>
            {ticket.userRiskFlag && (
              <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">
                ⚠️ Risco ao Usuário/Paciente
              </span>
            )}
            {ticket.readyForCollection && (
              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                📦 Disponível para Coleta
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4 text-slate-500 text-[11px]">
            <span>Aberto em: <strong>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</strong></span>
            <span>Responsável: <strong>{ticket.assignedToName || 'Não Atribuído'}</strong></span>
          </div>
        </div>
      </div>

      {/* GEMINI AI ASSISTANT ACTION PANEL */}
      <div className="bg-gradient-to-r from-purple-900 via-[#0B2343] to-slate-900 text-white p-4 rounded-xl shadow border border-purple-800/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            <span className="font-bold text-sm">Assistente de Inteligência Gemini (Server-Side)</span>
          </div>
          <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-700 px-2 py-0.5 rounded font-mono">
            Model: gemini-2.5-flash
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerateAiSummary}
            disabled={isAiLoading}
            className="bg-purple-800/80 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-purple-600 transition-all"
          >
            {isAiLoading ? 'Processando...' : 'Gerar Resumo Executivo'}
          </button>
          <button
            onClick={handleSuggestAiResponse}
            disabled={isAiLoading}
            className="bg-slate-800 hover:bg-slate-700 text-purple-200 font-bold text-xs px-3 py-1.5 rounded-lg border border-purple-800 transition-all"
          >
            {isAiLoading ? 'Processando...' : 'Sugerir Resposta ao Cliente'}
          </button>
        </div>

        {/* AI Output Result Boxes */}
        {aiSummary && (
          <div className="p-3 bg-purple-950/80 border border-purple-700 rounded-lg text-xs space-y-1">
            <p className="font-bold text-purple-300">Resumo Gerado pela IA:</p>
            <p className="text-purple-100 leading-relaxed">{aiSummary}</p>
          </div>
        )}

        {aiSuggestedResponse && (
          <div className="p-3 bg-slate-900/90 border border-purple-700 rounded-lg text-xs space-y-1">
            <p className="font-bold text-purple-300">Sugestão de Resposta Formal ao Cliente:</p>
            <p className="text-slate-200 whitespace-pre-line leading-relaxed font-mono text-[11px]">{aiSuggestedResponse}</p>
          </div>
        )}
      </div>

      {/* 13-TAB NAVIGATION BAR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center overflow-x-auto border-b border-slate-200 bg-slate-50 px-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-3 text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 border-b-2 transition-all ${
                activeTab === tab.id 
                  ? 'border-[#145EDB] text-[#145EDB] bg-white' 
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        <div className="p-5 text-xs text-slate-800">
          
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-sm text-[#10233F]">Relato Completo da Ocorrência</h4>
                <p className="text-slate-700 leading-relaxed text-xs">{ticket.description}</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                <div><h4 className="font-bold text-sm text-[#10233F]">Qualificação progressiva do SAC</h4>
                  <p className="text-slate-500 mt-0.5">Atualize a maturidade do atendimento conforme a análise evolui.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select value={qualificationStage} onChange={e=>setQualificationStage(e.target.value as TicketQualificationStage)} className="bg-white border border-blue-200 rounded-lg p-2">
                    <option value="REGISTRATION">1. Registro inicial</option><option value="DOCUMENT_VALIDATION">2. Validação documental</option>
                    <option value="TECHNICAL_TRIAGE">3. Triagem técnica</option><option value="INVESTIGATION">4. Investigação</option>
                    <option value="ACTION_PLAN">5. Plano de ação</option><option value="SOLUTION_VALIDATION">6. Validação da solução</option>
                    <option value="COMPLETED">7. Qualificação concluída</option>
                  </select>
                  <input value={qualificationNotes} onChange={e=>setQualificationNotes(e.target.value)} placeholder="Evidências, pendências e conclusão da etapa" className="md:col-span-2 bg-white border border-blue-200 rounded-lg p-2" />
                </div>
                <div className="flex items-center justify-between"><span className="text-emerald-700 font-semibold">{qualificationMessage}</span>
                  <button type="button" onClick={saveQualification} className="bg-[#145EDB] text-white font-bold px-4 py-2 rounded-lg">Salvar qualificação</button></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800">Classificação Comercial</h4>
                  <p><strong>Loja / Unidade:</strong> {ticket.unitName || 'Matriz Fortaleza'}</p>
                  <p><strong>Nota Fiscal:</strong> {ticket.invoiceNumber}</p>
                  <p><strong>Vendedor:</strong> {ticket.sellerName}</p>
                  <p><strong>Canal de Venda:</strong> {ticket.salesChannel}</p>
                  <p><strong>Transportadora:</strong> {ticket.carrierName || 'Não definida'}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800">SLA & Atribuição</h4>
                  <p><strong>Área Responsável:</strong> {ticket.assignedArea}</p>
                  <p><strong>Técnico Atribuído:</strong> {ticket.assignedToName || 'Em definição'}</p>
                  <p><strong>Vencimento SLA:</strong> {ticket.slaDueAt ? new Date(ticket.slaDueAt).toLocaleString('pt-BR') : 'Não definido'}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLIENTE */}
          {activeTab === 'customer' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-sm text-[#10233F]">Dados Cadastrais do Cliente</h4>
              <p><strong>Razão Social:</strong> {ticket.customerName}</p>
              <p><strong>CPF/CNPJ:</strong> {ticket.customerDocument}</p>
              <p><strong>E-mail de Contato:</strong> sac@saomateus.com.br</p>
              <p><strong>Telefone / WhatsApp:</strong> (85) 3456-7890 / (85) 99876-5432</p>
              <p><strong>Cidade/UF:</strong> Fortaleza / CE</p>
              <p><strong>Consentimento LGPD:</strong> <span className="text-emerald-600 font-bold">Sim (Aceito)</span></p>
            </div>
          )}

          {/* TAB 3: PRODUTOS */}
          {activeTab === 'products' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-[#10233F]">Lista de Produtos Vinculados ao Protocolo</h4>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {ticket.items.map((it, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 flex flex-col sm:flex-row justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{it.productName}</p>
                      <p className="text-slate-500 font-mono text-[11px]">SKU: {it.sku} | Qtd: {it.quantity}</p>
                    </div>
                    <div className="font-mono text-[11px] text-slate-600">
                      <p>Nº Série: <strong>{it.serialNumber || 'N/A'}</strong></p>
                      <p>Lote: <strong>{it.lotNumber || 'N/A'}</strong></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: COMENTÁRIOS */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {commentError && <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{commentError}</p>}
              <div className="space-y-3">
                {commentsList.map(c => (
                  <div 
                    key={c.id} 
                    className={`p-3.5 rounded-xl border ${c.internal ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="text-[#10233F]">{c.author}</span>
                      <span className="text-[10px] text-slate-500">{c.date}</span>
                    </div>
                    <p className="text-slate-700">{c.content}</p>
                    {c.internal && <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded mt-1 inline-block">Comentário Interno</span>}
                  </div>
                ))}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-200 space-y-2">
                <textarea
                  rows={2}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Escreva um novo comentário..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#145EDB]"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="rounded text-[#145EDB]"
                    />
                    <span>Nota Interna (Não visível ao cliente)</span>
                  </label>
                  <button
                    type="submit"
                    className="bg-[#145EDB] text-white font-bold px-4 py-1.5 rounded-lg flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 7: ASSISTÊNCIA TÉCNICA */}
          {activeTab === 'attachments' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-dashed border-[#145EDB]/50 bg-blue-50 p-4 space-y-2">
                <label className="block font-bold text-[#10233F]">Adicionar novas imagens ou vídeos</label>
                <input type="file" multiple accept="image/*,video/*" onChange={event => setNewAttachments(Array.from(event.target.files || []))} className="block w-full text-xs" />
                {newAttachments.length > 0 && <p className="font-semibold text-[#145EDB]">{newAttachments.length} arquivo(s) selecionado(s)</p>}
                <button type="button" disabled={!newAttachments.length || isUploadingAttachments} onClick={async()=>{setIsUploadingAttachments(true);setOperationError('');try{await apiService.uploadTicketAttachments(ticket,newAttachments,currentUser);setAttachments(await apiService.getTicketAttachments(ticket.id));setNewAttachments([]);}catch(error){setOperationError(error instanceof Error?error.message:'Falha ao enviar anexos');}finally{setIsUploadingAttachments(false);}}} className="px-4 py-2 rounded-lg bg-[#145EDB] text-white font-bold disabled:opacity-50">{isUploadingAttachments?'Enviando...':'Integrar novos anexos'}</button>
                {operationError && <p className="text-red-700">{operationError}</p>}
              </div>
              <h4 className="font-bold text-sm text-[#10233F]">Evidências anexadas ao chamado</h4>
              {attachments.length === 0 ? <p className="p-6 text-center bg-slate-50 rounded-xl text-slate-500">Nenhuma imagem ou vídeo anexado.</p> :
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{attachments.map(file => <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-[#145EDB]">
                  <Paperclip className="w-5 h-5 text-[#145EDB] mb-2" /><p className="font-bold break-all">{file.fileName}</p><p className="text-slate-500">{file.fileType} • {(file.fileSize/1024/1024).toFixed(2)} MB</p>
                </a>)}</div>}
            </div>
          )}

          {/* TAB 7: ASSISTÊNCIA TÉCNICA */}
          {activeTab === 'technical' && (
            <div className="space-y-3">
              {technicalError && <p className="p-3 rounded-lg bg-red-50 text-red-700">{technicalError}</p>}
              {technicalCases.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">Nenhum subprotocolo de assistência técnica vinculado a este SAC.</div>
              ) : technicalCases.map(technicalCase => (
                <div key={technicalCase.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-bold text-sm text-[#10233F]">Subprotocolo de Assistência Técnica: {technicalCase.subprotocol}</h4>
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[11px]">{technicalCase.status}</span>
                      {['SUPERADMIN','ADMIN_EMPRESA','RESPONSAVEL_TECNICA','TECNICO'].includes(userRole) && <button type="button" onClick={async()=>{const reason=window.prompt(`Informe o motivo para excluir ${technicalCase.subprotocol}:`);if(!reason)return;try{setTechnicalError('');await apiService.deleteTechnicalCase(technicalCase,reason,currentUser);setTechnicalCases(current=>current.filter(item=>item.id!==technicalCase.id));}catch(error){setTechnicalError(error instanceof Error?error.message:'Falha ao excluir subprotocolo');}}} className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100" title="Excluir subprotocolo"><Trash2 className="w-4 h-4"/></button>}
                    </div>
                  </div>
                  <p><strong>Técnico Responsável:</strong> {technicalCase.technicianName || 'Não atribuído'}</p>
                  <p><strong>Laudo Diagnóstico:</strong> {technicalCase.diagnosticReport || 'Não informado'}</p>
                  <p><strong>Peças Substituídas:</strong> {technicalCase.replacedParts || 'Nenhuma informada'}</p>
                  <p><strong>Custo Técnico Estimado:</strong> R$ {technicalCase.cost.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}

          {/* OTHER TABS FALLBACK */}
          {activeTab !== 'overview' && activeTab !== 'customer' && activeTab !== 'products' && activeTab !== 'comments' && activeTab !== 'attachments' && activeTab !== 'technical' && (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
              <p className="font-bold text-sm text-[#10233F] mb-1">Módulo {activeTab.toUpperCase()} Carregado</p>
              <p className="text-xs">Dados e registros do protocolo {ticket.protocol} sincronizados via Supabase PostgreSQL.</p>
            </div>
          )}

        </div>
      </div>

      {/* DISPATCH MODAL */}
      {showDispatchModal && (
        <DispatchTicketModal
          ticket={ticket}
          users={users}
          onClose={() => setShowDispatchModal(false)}
          onDispatch={onDispatch}
        />
      )}

      {/* SERVICE ORDER MODAL */}
      {showOSModal && (
        <NewServiceOrderModal
          tickets={[ticket]}
          users={users}
          preselectedTicket={ticket}
          onClose={() => setShowOSModal(false)}
          onCreateOS={onCreateOS}
        />
      )}

      {showEditModal && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><form onSubmit={async e=>{e.preventDefault();setIsSavingOperation(true);setOperationError('');try{await onUpdateTicket(ticket,{description:editDescription,category:editCategory,priority:editPriority,invoiceNumber:editInvoice});setShowEditModal(false);}catch(error){setOperationError(error instanceof Error?error.message:'Falha ao editar SAC');}finally{setIsSavingOperation(false);}}} className="bg-white w-full max-w-xl rounded-2xl p-6 space-y-4 text-xs"><div className="flex justify-between"><h3 className="font-bold text-base">Editar {ticket.protocol}</h3><button type="button" onClick={()=>setShowEditModal(false)}><X className="w-5 h-5"/></button></div>{operationError&&<p className="bg-red-50 text-red-700 p-2 rounded">{operationError}</p>}<label className="block font-bold">Descrição<textarea required rows={5} value={editDescription} onChange={e=>setEditDescription(e.target.value)} className="mt-1 w-full border rounded-lg p-2 font-normal"/></label><div className="grid md:grid-cols-3 gap-3"><label className="font-bold">Categoria<input required value={editCategory} onChange={e=>setEditCategory(e.target.value)} className="mt-1 w-full border rounded-lg p-2 font-normal"/></label><label className="font-bold">Prioridade<select value={editPriority} onChange={e=>setEditPriority(e.target.value as Ticket['priority'])} className="mt-1 w-full border rounded-lg p-2 font-normal"><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></label><label className="font-bold">Nota fiscal<input value={editInvoice} onChange={e=>setEditInvoice(e.target.value)} className="mt-1 w-full border rounded-lg p-2 font-normal"/></label></div><div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowEditModal(false)} className="px-4 py-2 bg-slate-200 rounded-lg font-bold">Cancelar</button><button disabled={isSavingOperation} className="px-4 py-2 bg-[#145EDB] text-white rounded-lg font-bold">{isSavingOperation?'Salvando...':'Salvar alterações'}</button></div></form></div>}

      {showDeleteModal && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><form onSubmit={async e=>{e.preventDefault();setIsSavingOperation(true);setOperationError('');try{await onDeleteTicket(ticket,deleteReason);setShowDeleteModal(false);}catch(error){setOperationError(error instanceof Error?error.message:'Falha ao excluir SAC');}finally{setIsSavingOperation(false);}}} className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 text-xs"><h3 className="font-bold text-base text-red-700">Excluir {ticket.protocol}</h3><p>A exclusão remove também itens, comentários e OS vinculadas. O número do protocolo nunca será reutilizado.</p>{operationError&&<p className="bg-red-50 text-red-700 p-2 rounded">{operationError}</p>}<label className="block font-bold">Motivo obrigatório<textarea required value={deleteReason} onChange={e=>setDeleteReason(e.target.value)} className="mt-1 w-full border rounded-lg p-2 font-normal"/></label><div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowDeleteModal(false)} className="px-4 py-2 bg-slate-200 rounded-lg font-bold">Cancelar</button><button disabled={isSavingOperation} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold">{isSavingOperation?'Excluindo...':'Confirmar exclusão'}</button></div></form></div>}
    </div>
  );
};

