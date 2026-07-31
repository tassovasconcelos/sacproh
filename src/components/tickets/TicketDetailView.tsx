import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, Clock, AlertTriangle, ShieldCheck, CheckCircle2, MessageSquare, 
  Paperclip, Wrench, Truck, Sparkles, DollarSign, Award, History, FileText, Send, Building, User, Package, Plus 
} from 'lucide-react';
import { Ticket, TicketStatus, UserRole, UserProfile, ServiceOrder, TicketQualificationStage } from '../../types';
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
}

export const TicketDetailView: React.FC<TicketDetailViewProps> = ({
  ticket,
  currentUser,
  userRole,
  users,
  onBack,
  onUpdateStatus,
  onDispatch,
  onCreateOS
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'customer' | 'products' | 'history' | 'comments' | 'attachments' | 'technical' | 'logistics' | 'quality' | 'costs' | 'sla' | 'survey' | 'audit'
  >('overview');

  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showOSModal, setShowOSModal] = useState(false);
  const [qualificationStage, setQualificationStage] = useState<TicketQualificationStage>(ticket.qualificationStage || 'REGISTRATION');
  const [qualificationNotes, setQualificationNotes] = useState(ticket.qualificationNotes || '');
  const [qualificationMessage, setQualificationMessage] = useState('');
  const [attachments, setAttachments] = useState<Array<{id:string;fileName:string;fileType:string;fileSize:number;url:string}>>([]);

  useEffect(() => { apiService.getTicketAttachments(ticket.id).then(setAttachments); }, [ticket.id]);

  const saveQualification = async () => {
    await apiService.updateTicketQualification(ticket.id, qualificationStage, qualificationNotes, currentUser);
    setQualificationMessage('Qualificação atualizada e registrada no histórico.');
  };

  // AI Assistant Outputs
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSuggestedResponse, setAiSuggestedResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // New Comment Input
  const [commentsList, setCommentsList] = useState([
    { id: 'c1', author: 'Mariana Vasconcelos', content: 'Abertura do chamado realizada e encaminhada à análise da farmacêutica.', date: '28/07/2026 09:35', internal: false },
    { id: 'c2', author: 'Dra. Patricia Lima', content: 'Sinalizado possível risco de instabilidade cirúrgica. Solicitada priorização da assistência técnica.', date: '28/07/2026 10:20', internal: true }
  ]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

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

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setCommentsList([
      ...commentsList,
      {
        id: 'c-' + Date.now(),
        author: 'Usuário Conectado',
        content: newCommentText,
        date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        internal: isInternalComment
      }
    ]);
    setNewCommentText('');
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
                  <p><strong>Vencimento SLA:</strong> {ticket.slaDueAt ? new Date(ticket.slaDueAt).toLocaleString('pt-BR') : '30/07/2026 18:00'}</p>
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
              <h4 className="font-bold text-sm text-[#10233F]">Evidências anexadas ao chamado</h4>
              {attachments.length === 0 ? <p className="p-6 text-center bg-slate-50 rounded-xl text-slate-500">Nenhuma imagem ou vídeo anexado.</p> :
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{attachments.map(file => <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-[#145EDB]">
                  <Paperclip className="w-5 h-5 text-[#145EDB] mb-2" /><p className="font-bold break-all">{file.fileName}</p><p className="text-slate-500">{file.fileType} • {(file.fileSize/1024/1024).toFixed(2)} MB</p>
                </a>)}</div>}
            </div>
          )}

          {/* TAB 7: ASSISTÊNCIA TÉCNICA */}
          {activeTab === 'technical' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[#10233F]">Subprotocolo de Assistência Técnica: SAC.2607.001-AT01</h4>
                <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[11px]">Em Análise de Bancada</span>
              </div>
              <p><strong>Técnico Responsável:</strong> Eng. Carlos Eduardo</p>
              <p><strong>Laudo Diagnóstico:</strong> Constatado erro E-04 proveniente de oxidação nos pinos do conector da caneta monopolar. Necessária troca da placa da interface frontal.</p>
              <p><strong>Peças Substituídas:</strong> Placa Interface Frontal HF-400W (SKU: PLC-FR-WEM)</p>
              <p><strong>Custo Técnico Estimado:</strong> R$ 850,00</p>
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
    </div>
  );
};

