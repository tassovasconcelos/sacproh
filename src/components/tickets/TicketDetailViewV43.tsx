import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, Award, CheckCircle2, Clock, DollarSign, Edit3,
  FileText, History, MessageSquare, Package, Paperclip, Send, ShieldCheck,
  Trash2, Truck, User, Wrench, X
} from 'lucide-react';
import type { Customer, ServiceOrder, TechnicalCase, Ticket, TicketQualificationStage, TicketStatus, UserProfile, UserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { sacV43Service, type TicketCost, type TicketCostType, type TicketEvent } from '../../services/sacV43Service';
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

type ActiveTab = 'overview' | 'customer' | 'products' | 'history' | 'comments' | 'attachments' | 'technical' | 'logistics' | 'quality' | 'costs' | 'sla' | 'survey' | 'audit';

type CommentRow = { id: string; author: string; content: string; date: string; internal: boolean };

type AttachmentRow = { id: string; fileName: string; fileType: string; fileSize: number; url: string };

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const costLabels: Record<TicketCostType, string> = {
  BONUS_INVOICE: 'NF de bonificação',
  RETURN_INVOICE: 'NF de devolução',
  OUTBOUND_FREIGHT: 'Frete de envio/reposição',
  RETURN_FREIGHT: 'Frete de coleta/devolução',
  TECHNICAL_SERVICE: 'Assistência técnica',
  PARTS: 'Peças',
  PRODUCT_REPLACEMENT: 'Substituição de produto',
  REFUND: 'Reembolso',
  OTHER: 'Outros'
};

const eventIcon = (eventType: string) => {
  const key = eventType.toUpperCase();
  if (key.includes('COMMENT')) return <MessageSquare className="w-4 h-4" />;
  if (key.includes('ATTACH')) return <Paperclip className="w-4 h-4" />;
  if (key.includes('COST')) return <DollarSign className="w-4 h-4" />;
  if (key.includes('CUSTOMER')) return <User className="w-4 h-4" />;
  if (key.includes('CLOSE') || key.includes('STATUS')) return <CheckCircle2 className="w-4 h-4" />;
  return <History className="w-4 h-4" />;
};

const dateTimeLocalValue = (iso?: string) => {
  const date = iso ? new Date(iso) : new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

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
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showOSModal, setShowOSModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCustomerEdit, setShowCustomerEdit] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [operationError, setOperationError] = useState('');
  const [operationMessage, setOperationMessage] = useState('');
  const [isSavingOperation, setIsSavingOperation] = useState(false);

  const [editDescription, setEditDescription] = useState(ticket.description);
  const [editCategory, setEditCategory] = useState(ticket.category);
  const [editPriority, setEditPriority] = useState(ticket.priority);
  const [editInvoice, setEditInvoice] = useState(ticket.invoiceNumber || '');
  const [deleteReason, setDeleteReason] = useState('');

  const [qualificationStage, setQualificationStage] = useState<TicketQualificationStage>(ticket.qualificationStage || 'REGISTRATION');
  const [qualificationNotes, setQualificationNotes] = useState(ticket.qualificationNotes || '');
  const [qualificationMessage, setQualificationMessage] = useState('');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerDraft, setCustomerDraft] = useState({
    name: '', tradeName: '', document: '', email: '', phone: '', whatsapp: '', city: '', state: '', address: ''
  });
  const [customerCorrectionReason, setCustomerCorrectionReason] = useState('');

  const [timeline, setTimeline] = useState<TicketEvent[]>([]);
  const [timelineError, setTimelineError] = useState('');
  const [commentsList, setCommentsList] = useState<CommentRow[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentMessage, setCommentMessage] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [technicalCases, setTechnicalCases] = useState<TechnicalCase[]>([]);
  const [technicalError, setTechnicalError] = useState('');

  const [costs, setCosts] = useState<TicketCost[]>([]);
  const [costDraft, setCostDraft] = useState({
    costType: 'OTHER' as TicketCostType,
    description: '', amount: '', invoiceNumber: '', supplierName: '', occurredAt: dateTimeLocalValue(), notes: ''
  });

  const [closeDraft, setCloseDraft] = useState({
    procedency: 'PROCEDENT' as 'PROCEDENT' | 'NON_PROCEDENT' | 'CANCELLED',
    finalOpinion: '', resolvedAt: dateTimeLocalValue(ticket.resolvedAt), closedAt: dateTimeLocalValue(), notes: ''
  });

  const reloadTimeline = async () => {
    try {
      setTimelineError('');
      setTimeline(await sacV43Service.getTicketTimeline(ticket.id));
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : 'Não foi possível carregar o histórico.');
    }
  };

  const reloadComments = async () => {
    try {
      setCommentError('');
      setCommentsList(await apiService.getTicketComments(ticket.id));
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'Não foi possível carregar os comentários.');
    }
  };

  const reloadCustomer = async () => {
    if (!ticket.customerId) return;
    try {
      const loaded = await sacV43Service.getCustomer(ticket.customerId);
      setCustomer(loaded);
      setCustomerDraft({
        name: loaded.name || '', tradeName: loaded.tradeName || '', document: loaded.document || '',
        email: loaded.email || '', phone: loaded.phone || '', whatsapp: loaded.whatsapp || '',
        city: loaded.city || '', state: loaded.state || '', address: loaded.address || ''
      });
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Não foi possível carregar o cliente.');
    }
  };

  const reloadCosts = async () => {
    try {
      setCosts(await sacV43Service.getTicketCosts(ticket.id));
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Não foi possível carregar os custos.');
    }
  };

  useEffect(() => {
    apiService.getTicketAttachments(ticket.id).then(setAttachments).catch(() => setAttachments([]));
    apiService.getTechnicalCases(ticket.id).then(setTechnicalCases).catch(error => setTechnicalError(error.message));
    void reloadTimeline();
    void reloadComments();
    void reloadCustomer();
    void reloadCosts();
  }, [ticket.id]);

  const totalCost = useMemo(() => costs.reduce((sum, item) => sum + item.amount, 0), [costs]);
  const isClosed = ['CLOSED_PROCEDENT', 'CLOSED_NON_PROCEDENT', 'CANCELLED'].includes(ticket.status);

  const saveQualification = async () => {
    try {
      setQualificationMessage('');
      setOperationError('');
      await apiService.updateTicketQualification(ticket.id, qualificationStage, qualificationNotes, currentUser);
      setQualificationMessage('Qualificação atualizada e registrada no histórico.');
      await reloadTimeline();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Não foi possível atualizar a qualificação.');
    }
  };

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = newCommentText.trim();
    if (!content || isSavingComment) return;
    try {
      setIsSavingComment(true);
      setCommentError('');
      setCommentMessage('');
      await apiService.createTicketComment(ticket, content, isInternalComment, currentUser);
      const persisted = await apiService.getTicketComments(ticket.id);
      const confirmed = persisted.some(comment => comment.content === content && comment.author === currentUser.fullName);
      if (!confirmed) throw new Error('O comentário não foi confirmado no banco. Tente novamente antes de sair do protocolo.');
      setCommentsList(persisted);
      setNewCommentText('');
      setCommentMessage(`Comentário registrado em ${new Date().toLocaleString('pt-BR')}.`);
      await reloadTimeline();
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'Não foi possível salvar o comentário.');
    } finally {
      setIsSavingComment(false);
    }
  };

  const saveCustomerCorrection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customer) return;
    try {
      setIsSavingOperation(true);
      setOperationError('');
      const updated = await sacV43Service.correctCustomer(customer.id, ticket.id, {
        name: customerDraft.name,
        tradeName: customerDraft.tradeName,
        document: customerDraft.document,
        email: customerDraft.email,
        phone: customerDraft.phone,
        whatsapp: customerDraft.whatsapp,
        city: customerDraft.city,
        state: customerDraft.state,
        address: customerDraft.address
      }, customerCorrectionReason);
      setCustomer(updated);
      setShowCustomerEdit(false);
      setCustomerCorrectionReason('');
      setOperationMessage('Cadastro do cliente corrigido com auditoria de antes/depois.');
      await reloadTimeline();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Falha na correção cadastral.');
    } finally {
      setIsSavingOperation(false);
    }
  };

  const saveCost = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSavingOperation(true);
      setOperationError('');
      const amount = Number(String(costDraft.amount).replace(',', '.'));
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Informe um valor de custo válido.');
      await sacV43Service.createTicketCost(ticket, {
        costType: costDraft.costType,
        description: costDraft.description,
        amount,
        invoiceNumber: costDraft.invoiceNumber || undefined,
        supplierName: costDraft.supplierName || undefined,
        occurredAt: new Date(costDraft.occurredAt).toISOString(),
        notes: costDraft.notes || undefined
      }, currentUser);
      await reloadCosts();
      await reloadTimeline();
      setShowCostModal(false);
      setCostDraft({ costType: 'OTHER', description: '', amount: '', invoiceNumber: '', supplierName: '', occurredAt: dateTimeLocalValue(), notes: '' });
      setOperationMessage('Custo registrado e incluído no histórico do protocolo.');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Não foi possível registrar o custo.');
    } finally {
      setIsSavingOperation(false);
    }
  };

  const closeTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSavingOperation(true);
      setOperationError('');
      await sacV43Service.closeTicket(ticket.id, {
        procedency: closeDraft.procedency,
        finalOpinion: closeDraft.finalOpinion,
        resolvedAt: closeDraft.resolvedAt ? new Date(closeDraft.resolvedAt).toISOString() : undefined,
        closedAt: closeDraft.closedAt ? new Date(closeDraft.closedAt).toISOString() : undefined,
        notes: closeDraft.notes
      });
      setShowCloseModal(false);
      setOperationMessage('SAC encerrado formalmente com data, parecer e trilha de auditoria.');
      await reloadTimeline();
      const status: TicketStatus = closeDraft.procedency === 'PROCEDENT' ? 'CLOSED_PROCEDENT' : closeDraft.procedency === 'NON_PROCEDENT' ? 'CLOSED_NON_PROCEDENT' : 'CANCELLED';
      onUpdateStatus(ticket.id, status, 'Encerramento formal registrado pela V4.3');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Não foi possível encerrar o SAC.');
    } finally {
      setIsSavingOperation(false);
    }
  };

  const uploadAttachments = async () => {
    try {
      setIsUploadingAttachments(true);
      setOperationError('');
      newAttachments.forEach(file => sacV43Service.validateAttachment(file));
      await apiService.uploadTicketAttachments(ticket, newAttachments, currentUser);
      setAttachments(await apiService.getTicketAttachments(ticket.id));
      setNewAttachments([]);
      setOperationMessage('Documentos anexados e registrados no histórico.');
      await reloadTimeline();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Falha ao enviar anexos.');
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
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
    { id: 'sla', label: 'Prazos', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'survey', label: 'Avaliação NPS', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'audit', label: 'Auditoria', icon: <History className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="space-y-5">
      {(operationError || operationMessage) && (
        <div className={`p-3 rounded-xl border text-xs font-semibold ${operationError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {operationError || operationMessage}
        </div>
      )}

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg text-[#145EDB]">{ticket.protocol}</span>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">{ticket.category}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Cliente: <strong className="text-[#10233F]">{customer?.name || ticket.customerName}</strong> ({customer?.document || ticket.customerDocument})</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowEditModal(true)} className="bg-slate-100 text-slate-700 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" />Editar SAC</button>
            <button onClick={() => setShowDispatchModal(true)} className="bg-[#145EDB] text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1"><Send className="w-3.5 h-3.5" />Direcionar</button>
            <button onClick={() => setShowOSModal(true)} className="bg-[#FF8500] text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1"><Wrench className="w-3.5 h-3.5" />Abrir OS</button>
            {!isClosed && <button onClick={() => setShowCloseModal(true)} className="bg-emerald-600 text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Encerrar SAC</button>}
            {['SUPERADMIN', 'ADMIN_EMPRESA', 'DIRETORIA'].includes(userRole) && <button onClick={() => setShowDeleteModal(true)} className="bg-red-50 text-red-700 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />Excluir</button>}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap gap-2">
            <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Prioridade: {ticket.priority}</span>
            <span className="bg-slate-900 text-white px-2.5 py-1 rounded-full font-bold">Status: {ticket.status}</span>
            {ticket.userRiskFlag && <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold">Risco ao usuário/paciente</span>}
          </div>
          <div className="flex flex-wrap gap-4 text-slate-500 text-[11px]">
            <span>Aberto: <strong>{new Date(ticket.createdAt).toLocaleString('pt-BR')}</strong></span>
            <span>Encerrado: <strong>{ticket.closedAt ? new Date(ticket.closedAt).toLocaleString('pt-BR') : 'Em aberto'}</strong></span>
            <span>Responsável: <strong>{ticket.assignedToName || 'Não atribuído'}</strong></span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center overflow-x-auto border-b border-slate-200 bg-slate-50 px-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3.5 py-3 text-xs font-bold whitespace-nowrap flex items-center gap-1.5 border-b-2 ${activeTab === tab.id ? 'border-[#145EDB] text-[#145EDB] bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-5 text-xs text-slate-800">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-sm text-[#10233F]">Relato completo da ocorrência</h4>
                <p className="text-slate-700 leading-relaxed">{ticket.description}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                <div><h4 className="font-bold text-sm text-[#10233F]">Qualificação progressiva do SAC</h4><p className="text-slate-500">Cada evolução fica registrada na timeline.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select value={qualificationStage} onChange={event => setQualificationStage(event.target.value as TicketQualificationStage)} className="bg-white border border-blue-200 rounded-lg p-2">
                    <option value="REGISTRATION">1. Registro inicial</option><option value="DOCUMENT_VALIDATION">2. Validação documental</option><option value="TECHNICAL_TRIAGE">3. Triagem técnica</option><option value="INVESTIGATION">4. Investigação</option><option value="ACTION_PLAN">5. Plano de ação</option><option value="SOLUTION_VALIDATION">6. Validação da solução</option><option value="COMPLETED">7. Qualificação concluída</option>
                  </select>
                  <input value={qualificationNotes} onChange={event => setQualificationNotes(event.target.value)} placeholder="Evidências, pendências e conclusão da etapa" className="md:col-span-2 bg-white border border-blue-200 rounded-lg p-2" />
                </div>
                <div className="flex items-center justify-between gap-3"><span className="text-emerald-700 font-semibold">{qualificationMessage}</span><button type="button" onClick={saveQualification} className="bg-[#145EDB] text-white font-bold px-4 py-2 rounded-lg">Salvar qualificação</button></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 rounded-xl border"><strong>Nota fiscal</strong><p className="mt-1">{ticket.invoiceNumber || 'Não informada'}</p></div>
                <div className="p-4 bg-slate-50 rounded-xl border"><strong>SLA</strong><p className="mt-1">{ticket.slaDueAt ? new Date(ticket.slaDueAt).toLocaleString('pt-BR') : 'Não definido'}</p></div>
                <div className="p-4 bg-slate-50 rounded-xl border"><strong>Custo acumulado</strong><p className="mt-1 text-base font-bold text-[#10233F]">{money.format(totalCost)}</p></div>
              </div>
            </div>
          )}

          {activeTab === 'customer' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><h4 className="font-bold text-sm text-[#10233F]">Dados cadastrais do cliente</h4><p className="text-slate-500 mt-1">Correções preservam o antes/depois e o motivo.</p></div><button onClick={() => setShowCustomerEdit(true)} disabled={!customer} className="bg-[#145EDB] text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" />Corrigir cadastro</button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border">
                <p><strong>Razão social / Nome:</strong> {customer?.name || ticket.customerName}</p>
                <p><strong>Nome fantasia:</strong> {customer?.tradeName || 'Não informado'}</p>
                <p><strong>CPF/CNPJ:</strong> {customer?.document || ticket.customerDocument}</p>
                <p><strong>E-mail:</strong> {customer?.email || 'Não informado'}</p>
                <p><strong>Telefone:</strong> {customer?.phone || 'Não informado'}</p>
                <p><strong>WhatsApp:</strong> {customer?.whatsapp || 'Não informado'}</p>
                <p><strong>Cidade/UF:</strong> {[customer?.city, customer?.state].filter(Boolean).join(' / ') || 'Não informado'}</p>
                <p><strong>LGPD:</strong> {customer?.lgpdConsent ? 'Consentimento registrado' : 'Sem consentimento registrado'}</p>
                <p className="md:col-span-2"><strong>Endereço:</strong> {customer?.address || 'Não informado'}</p>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-[#10233F]">Produtos vinculados</h4>
              {ticket.items.map((item, index) => <div key={item.id || index} className="p-4 bg-slate-50 rounded-xl border flex flex-col md:flex-row md:justify-between gap-3"><div><p className="font-bold text-slate-900">{item.productName}</p><p>Modelo: {item.productModel || 'Não informado'}</p><p>SKU: {item.sku || 'N/A'} • Qtd: {item.quantity}</p></div><div><p>Série: {item.serialNumber || 'N/A'}</p><p>Lote: {item.lotNumber || 'N/A'}</p><p>Fabricante: {item.manufacturerName || 'N/A'}</p></div></div>)}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div><h4 className="font-bold text-sm text-[#10233F]">Histórico completo do protocolo</h4><p className="text-slate-500 mt-1">Qualificação, status, comentários, anexos, custos, correções cadastrais e encerramento.</p></div>
              {timelineError && <p className="p-3 bg-red-50 text-red-700 rounded-lg">{timelineError}</p>}
              {timeline.length === 0 ? <p className="p-8 text-center bg-slate-50 rounded-xl text-slate-500">Nenhum evento registrado.</p> : <div className="space-y-3">{timeline.map(event => <div key={event.id} className="flex gap-3"><div className="mt-1 w-8 h-8 rounded-full bg-blue-50 text-[#145EDB] flex items-center justify-center shrink-0">{eventIcon(event.eventType)}</div><div className="flex-1 p-3.5 rounded-xl border border-slate-200 bg-white"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-[#10233F]">{event.title}</p><p className="text-[10px] uppercase tracking-wide text-slate-400 mt-0.5">{event.eventType}</p></div><span className="text-[10px] text-slate-500">{new Date(event.occurredAt).toLocaleString('pt-BR')}</span></div>{event.description && <p className="text-slate-700 mt-2 whitespace-pre-wrap">{event.description}</p>}{event.actorName && <p className="text-[10px] text-slate-500 mt-2">Responsável: {event.actorName}</p>}</div></div>)}</div>}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              {commentError && <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{commentError}</p>}
              {commentMessage && <p className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">{commentMessage}</p>}
              <div className="space-y-3">{commentsList.length === 0 && <p className="p-6 text-center bg-slate-50 rounded-xl text-slate-500">Nenhum comentário registrado.</p>}{commentsList.map(comment => <div key={comment.id} className={`p-3.5 rounded-xl border ${comment.internal ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}><div className="flex justify-between gap-2 font-bold mb-1"><span>{comment.author}</span><span className="text-[10px] text-slate-500">{comment.date}</span></div><p className="whitespace-pre-wrap">{comment.content}</p>{comment.internal && <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded mt-2 inline-block">Nota interna</span>}</div>)}</div>
              <form onSubmit={handleAddComment} className="pt-3 border-t space-y-2">
                <textarea rows={4} required value={newCommentText} onChange={event => setNewCommentText(event.target.value)} placeholder="Registre contato, plano de ação, retorno, parecer ou acompanhamento diário..." className="w-full bg-slate-50 border rounded-lg p-3 outline-none focus:border-[#145EDB]" />
                <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2"><input type="checkbox" checked={isInternalComment} onChange={event => setIsInternalComment(event.target.checked)} /><span>Nota interna</span></label><button type="submit" disabled={isSavingComment || !newCommentText.trim()} className="bg-[#145EDB] text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1"><Send className="w-3.5 h-3.5" />{isSavingComment ? 'Confirmando no banco...' : 'Registrar comentário'}</button></div>
              </form>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed border-[#145EDB]/50 bg-blue-50 p-4 space-y-2">
                <label className="block font-bold text-[#10233F]">Adicionar documentos, imagens ou vídeos</label>
                <p className="text-slate-500">PDF, Word, Excel, CSV, TXT, JPG, PNG, WEBP, MP4, WEBM e MOV • até 25 MB por arquivo.</p>
                <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp,.mp4,.webm,.mov,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,image/*,video/*" onChange={event => setNewAttachments(Array.from(event.target.files || []))} className="block w-full text-xs" />
                {newAttachments.length > 0 && <p className="font-semibold text-[#145EDB]">{newAttachments.length} arquivo(s) selecionado(s)</p>}
                <button type="button" onClick={uploadAttachments} disabled={!newAttachments.length || isUploadingAttachments} className="px-4 py-2 rounded-lg bg-[#145EDB] text-white font-bold disabled:opacity-50">{isUploadingAttachments ? 'Enviando...' : 'Anexar ao protocolo'}</button>
              </div>
              {attachments.length === 0 ? <p className="p-6 text-center bg-slate-50 rounded-xl text-slate-500">Nenhum arquivo anexado.</p> : <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{attachments.map(file => <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="p-3 bg-slate-50 border rounded-xl hover:border-[#145EDB]"><Paperclip className="w-5 h-5 text-[#145EDB] mb-2" /><p className="font-bold break-all">{file.fileName}</p><p className="text-slate-500">{file.fileType || 'arquivo'} • {(file.fileSize / 1024 / 1024).toFixed(2)} MB</p></a>)}</div>}
            </div>
          )}

          {activeTab === 'technical' && (
            <div className="space-y-3">
              {technicalError && <p className="p-3 bg-red-50 text-red-700 rounded-lg">{technicalError}</p>}
              {technicalCases.length === 0 ? <p className="p-8 text-center bg-slate-50 rounded-xl text-slate-500">Nenhuma assistência técnica vinculada.</p> : technicalCases.map(technicalCase => <div key={technicalCase.id} className="p-4 bg-slate-50 rounded-xl border space-y-2"><div className="flex justify-between gap-3"><h4 className="font-bold text-sm text-[#10233F]">{technicalCase.subprotocol}</h4><span className="bg-purple-100 text-purple-800 font-bold px-2 py-1 rounded">{technicalCase.status}</span></div><p><strong>Técnico:</strong> {technicalCase.technicianName || 'Não atribuído'}</p><p><strong>Laudo:</strong> {technicalCase.diagnosticReport || 'Não informado'}</p><p><strong>Peças:</strong> {technicalCase.replacedParts || 'Nenhuma informada'}</p><p><strong>Custo técnico:</strong> {money.format(technicalCase.cost)}</p></div>)}
            </div>
          )}

          {activeTab === 'costs' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-bold text-sm text-[#10233F]">Centro de custos da ocorrência</h4><p className="text-slate-500 mt-1">Bonificações, devoluções, fretes, assistência, peças e demais impactos.</p></div><div className="flex items-center gap-3"><div className="text-right"><p className="text-[10px] uppercase text-slate-400 font-bold">Custo total</p><p className="text-xl font-bold text-[#10233F]">{money.format(totalCost)}</p></div><button onClick={() => setShowCostModal(true)} className="bg-[#145EDB] text-white font-bold px-4 py-2 rounded-lg">Registrar custo</button></div></div>
              {costs.length === 0 ? <p className="p-8 text-center bg-slate-50 rounded-xl text-slate-500">Nenhum custo registrado.</p> : <div className="overflow-x-auto"><table className="min-w-full border border-slate-200 rounded-xl overflow-hidden"><thead className="bg-slate-50"><tr><th className="text-left p-3">Data</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Descrição</th><th className="text-left p-3">NF / Fornecedor</th><th className="text-right p-3">Valor</th></tr></thead><tbody>{costs.map(cost => <tr key={cost.id} className="border-t"><td className="p-3">{new Date(cost.occurredAt).toLocaleDateString('pt-BR')}</td><td className="p-3 font-semibold">{costLabels[cost.costType]}</td><td className="p-3">{cost.description}</td><td className="p-3">{[cost.invoiceNumber, cost.supplierName].filter(Boolean).join(' • ') || '-'}</td><td className="p-3 text-right font-bold">{money.format(cost.amount)}</td></tr>)}</tbody></table></div>}
            </div>
          )}

          {activeTab === 'sla' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-[#10233F]">Controle de prazos e encerramento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 bg-slate-50 rounded-xl border"><p className="text-slate-500">Abertura</p><p className="font-bold mt-1">{new Date(ticket.createdAt).toLocaleString('pt-BR')}</p></div>
                <div className="p-4 bg-slate-50 rounded-xl border"><p className="text-slate-500">1º retorno</p><p className="font-bold mt-1">{ticket.firstResponseAt ? new Date(ticket.firstResponseAt).toLocaleString('pt-BR') : 'Não registrado'}</p></div>
                <div className="p-4 bg-slate-50 rounded-xl border"><p className="text-slate-500">Solução</p><p className="font-bold mt-1">{ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString('pt-BR') : 'Não registrada'}</p></div>
                <div className="p-4 bg-slate-50 rounded-xl border"><p className="text-slate-500">Encerramento</p><p className="font-bold mt-1">{ticket.closedAt ? new Date(ticket.closedAt).toLocaleString('pt-BR') : 'Em aberto'}</p></div>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl"><p className="font-bold text-amber-900">Regra de prazo</p><p className="text-amber-800 mt-1">O sistema registra datas e SLA operacional. O prazo legal/contratual aplicável deve ser configurado conforme tipo de ocorrência e política da empresa, sem presumir uma única regra para todos os casos.</p></div>
            </div>
          )}

          {['logistics', 'quality', 'survey', 'audit'].includes(activeTab) && (
            <div className="p-8 text-center bg-slate-50 rounded-xl border text-slate-500"><p className="font-bold text-sm text-[#10233F] mb-1">Módulo {activeTab.toUpperCase()}</p><p>Este módulo permanece disponível no ecossistema. A V4.3 prioriza rastreabilidade, comentários, documentos, custos e encerramento.</p></div>
          )}
        </div>
      </div>

      {showDispatchModal && <DispatchTicketModal ticket={ticket} users={users} onClose={() => setShowDispatchModal(false)} onDispatch={onDispatch} />}
      {showOSModal && <NewServiceOrderModal tickets={[ticket]} users={users} preselectedTicket={ticket} onClose={() => setShowOSModal(false)} onCreateOS={onCreateOS} />}

      {showCustomerEdit && customer && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><form onSubmit={saveCustomerCorrection} className="bg-white w-full max-w-3xl rounded-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto"><div className="flex justify-between"><div><h3 className="font-bold text-base">Corrigir cadastro do cliente</h3><p className="text-slate-500 mt-1">A alteração gera registro permanente de antes/depois.</p></div><button type="button" onClick={() => setShowCustomerEdit(false)}><X className="w-5 h-5" /></button></div><div className="grid md:grid-cols-2 gap-3"><label className="font-bold">Razão social / Nome<input required value={customerDraft.name} onChange={event => setCustomerDraft({...customerDraft, name: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">Nome fantasia<input value={customerDraft.tradeName} onChange={event => setCustomerDraft({...customerDraft, tradeName: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">CPF/CNPJ<input value={customerDraft.document} onChange={event => setCustomerDraft({...customerDraft, document: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /><span className="text-[10px] text-slate-500">Alteração de documento exige perfil administrativo.</span></label><label className="font-bold">E-mail<input value={customerDraft.email} onChange={event => setCustomerDraft({...customerDraft, email: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">Telefone<input value={customerDraft.phone} onChange={event => setCustomerDraft({...customerDraft, phone: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">WhatsApp<input value={customerDraft.whatsapp} onChange={event => setCustomerDraft({...customerDraft, whatsapp: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">Cidade<input value={customerDraft.city} onChange={event => setCustomerDraft({...customerDraft, city: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">UF<input maxLength={2} value={customerDraft.state} onChange={event => setCustomerDraft({...customerDraft, state: event.target.value.toUpperCase()})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold md:col-span-2">Endereço<input value={customerDraft.address} onChange={event => setCustomerDraft({...customerDraft, address: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold md:col-span-2">Motivo da correção<textarea required rows={3} value={customerCorrectionReason} onChange={event => setCustomerCorrectionReason(event.target.value)} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCustomerEdit(false)} className="px-4 py-2 bg-slate-200 rounded-lg font-bold">Cancelar</button><button disabled={isSavingOperation} className="px-4 py-2 bg-[#145EDB] text-white rounded-lg font-bold">{isSavingOperation ? 'Salvando...' : 'Salvar correção auditada'}</button></div></form></div>}

      {showCostModal && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><form onSubmit={saveCost} className="bg-white w-full max-w-2xl rounded-2xl p-6 space-y-4 text-xs"><div className="flex justify-between"><h3 className="font-bold text-base">Registrar custo do SAC</h3><button type="button" onClick={() => setShowCostModal(false)}><X className="w-5 h-5" /></button></div><div className="grid md:grid-cols-2 gap-3"><label className="font-bold">Tipo<select value={costDraft.costType} onChange={event => setCostDraft({...costDraft, costType: event.target.value as TicketCostType})} className="mt-1 w-full border rounded-lg p-2 font-normal">{Object.entries(costLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="font-bold">Valor (R$)<input required inputMode="decimal" value={costDraft.amount} onChange={event => setCostDraft({...costDraft, amount: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold md:col-span-2">Descrição<input required value={costDraft.description} onChange={event => setCostDraft({...costDraft, description: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">Nota fiscal<input value={costDraft.invoiceNumber} onChange={event => setCostDraft({...costDraft, invoiceNumber: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">Fornecedor / Transportadora<input value={costDraft.supplierName} onChange={event => setCostDraft({...costDraft, supplierName: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">Data do custo<input required type="datetime-local" value={costDraft.occurredAt} onChange={event => setCostDraft({...costDraft, occurredAt: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">Observações<input value={costDraft.notes} onChange={event => setCostDraft({...costDraft, notes: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCostModal(false)} className="px-4 py-2 bg-slate-200 rounded-lg font-bold">Cancelar</button><button disabled={isSavingOperation} className="px-4 py-2 bg-[#145EDB] text-white rounded-lg font-bold">{isSavingOperation ? 'Salvando...' : 'Registrar custo'}</button></div></form></div>}

      {showCloseModal && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><form onSubmit={closeTicket} className="bg-white w-full max-w-2xl rounded-2xl p-6 space-y-4 text-xs"><div className="flex justify-between"><div><h3 className="font-bold text-base">Encerrar {ticket.protocol}</h3><p className="text-slate-500 mt-1">O encerramento registra data efetiva, solução e parecer final.</p></div><button type="button" onClick={() => setShowCloseModal(false)}><X className="w-5 h-5" /></button></div><div className="grid md:grid-cols-2 gap-3"><label className="font-bold">Resultado<select value={closeDraft.procedency} onChange={event => setCloseDraft({...closeDraft, procedency: event.target.value as typeof closeDraft.procedency})} className="mt-1 w-full border rounded-lg p-2 font-normal"><option value="PROCEDENT">Procedente</option><option value="NON_PROCEDENT">Não procedente</option><option value="CANCELLED">Cancelado</option></select></label><label className="font-bold">Data da solução<input type="datetime-local" value={closeDraft.resolvedAt} onChange={event => setCloseDraft({...closeDraft, resolvedAt: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">Data do encerramento<input required type="datetime-local" value={closeDraft.closedAt} onChange={event => setCloseDraft({...closeDraft, closedAt: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">Observações<input value={closeDraft.notes} onChange={event => setCloseDraft({...closeDraft, notes: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold md:col-span-2">Parecer final<textarea required rows={5} value={closeDraft.finalOpinion} onChange={event => setCloseDraft({...closeDraft, finalOpinion: event.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCloseModal(false)} className="px-4 py-2 bg-slate-200 rounded-lg font-bold">Cancelar</button><button disabled={isSavingOperation} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold">{isSavingOperation ? 'Encerrando...' : 'Confirmar encerramento'}</button></div></form></div>}

      {showEditModal && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><form onSubmit={async event => { event.preventDefault(); setIsSavingOperation(true); setOperationError(''); try { await onUpdateTicket(ticket, { description: editDescription, category: editCategory, priority: editPriority, invoiceNumber: editInvoice }); setShowEditModal(false); setOperationMessage('SAC atualizado.'); await reloadTimeline(); } catch (error) { setOperationError(error instanceof Error ? error.message : 'Falha ao editar SAC'); } finally { setIsSavingOperation(false); } }} className="bg-white w-full max-w-xl rounded-2xl p-6 space-y-4 text-xs"><div className="flex justify-between"><h3 className="font-bold text-base">Editar {ticket.protocol}</h3><button type="button" onClick={() => setShowEditModal(false)}><X className="w-5 h-5" /></button></div><label className="block font-bold">Descrição<textarea required rows={5} value={editDescription} onChange={event => setEditDescription(event.target.value)} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><div className="grid md:grid-cols-3 gap-3"><label className="font-bold">Categoria<input required value={editCategory} onChange={event => setEditCategory(event.target.value)} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><label className="font-bold">Prioridade<select value={editPriority} onChange={event => setEditPriority(event.target.value as Ticket['priority'])} className="mt-1 w-full border rounded-lg p-2 font-normal"><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></label><label className="font-bold">Nota fiscal<input value={editInvoice} onChange={event => setEditInvoice(event.target.value)} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-slate-200 rounded-lg font-bold">Cancelar</button><button disabled={isSavingOperation} className="px-4 py-2 bg-[#145EDB] text-white rounded-lg font-bold">{isSavingOperation ? 'Salvando...' : 'Salvar alterações'}</button></div></form></div>}

      {showDeleteModal && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"><form onSubmit={async event => { event.preventDefault(); setIsSavingOperation(true); setOperationError(''); try { await onDeleteTicket(ticket, deleteReason); setShowDeleteModal(false); } catch (error) { setOperationError(error instanceof Error ? error.message : 'Falha ao excluir SAC'); } finally { setIsSavingOperation(false); } }} className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 text-xs"><h3 className="font-bold text-base text-red-700">Excluir {ticket.protocol}</h3><p>A exclusão é restrita e o protocolo nunca será reutilizado.</p><label className="block font-bold">Motivo obrigatório<textarea required value={deleteReason} onChange={event => setDeleteReason(event.target.value)} className="mt-1 w-full border rounded-lg p-2 font-normal" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-slate-200 rounded-lg font-bold">Cancelar</button><button disabled={isSavingOperation} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold">{isSavingOperation ? 'Excluindo...' : 'Confirmar exclusão'}</button></div></form></div>}
    </div>
  );
};
