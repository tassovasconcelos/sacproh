import { 
  Ticket, Customer, Product, QualityActionPlan, TechnicalCase, LogisticsCase, AuditLog, GeminiClassificationResult, DashboardFilters, TicketStatus, UserProfile, ServiceOrder 
} from '../types';
import { 
  mockTickets, mockCustomers, mockProducts, mockQualityPlans, mockTechnicalCases, mockLogisticsCases, mockAuditLogs, mockUsers, mockServiceOrders 
} from '../lib/mockData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

// In-Memory store for preview mode when Supabase is not connected
let localTickets = [...mockTickets];
let localCustomers = [...mockCustomers];
let localProducts = [...mockProducts];
let localQualityPlans = [...mockQualityPlans];
let localTechnicalCases = [...mockTechnicalCases];
let localLogisticsCases = [...mockLogisticsCases];
let localAuditLogs = [...mockAuditLogs];
let localUsers = [...mockUsers];
let localServiceOrders = [...mockServiceOrders];

export const apiService = {
  // --- TICKETS ---
  async getTickets(filters?: DashboardFilters): Promise<Ticket[]> {
    if (isSupabaseConfigured) {
      let query = supabase.from('tickets').select('*, items:ticket_items(*)');
      if (filters?.tenantId) query = query.eq('tenant_id', filters.tenantId);
      if (filters?.unitId) query = query.eq('unit_id', filters.unitId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase fetch tickets error:', error);
        return localTickets;
      }
      return data as unknown as Ticket[];
    }

    let filtered = [...localTickets];
    if (filters?.tenantId) filtered = filtered.filter(t => t.tenantId === filters.tenantId);
    if (filters?.unitId) filtered = filtered.filter(t => t.unitId === filters.unitId);
    if (filters?.status) filtered = filtered.filter(t => t.status === filters.status);
    if (filters?.priority) filtered = filtered.filter(t => t.priority === filters.priority);
    return filtered;
  },

  async getTicketById(id: string): Promise<Ticket | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, items:ticket_items(*)')
        .eq('id', id)
        .single();
      if (error) return localTickets.find(t => t.id === id) || null;
      return data as unknown as Ticket;
    }
    return localTickets.find(t => t.id === id) || null;
  },

  async createTicket(ticketData: Omit<Ticket, 'id' | 'protocol' | 'createdAt' | 'updatedAt'>): Promise<Ticket> {
    const ym = new Date().toISOString().slice(2, 4) + (new Date().getMonth() + 1).toString().padStart(2, '0');
    const seq = (localTickets.length + 1).toString().padStart(3, '0');
    const protocol = `SAC.${ym}.${seq}`;
    
    const newTicket: Ticket = {
      ...ticketData,
      id: 't-' + Date.now(),
      protocol,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      commentsCount: 0,
      attachmentsCount: ticketData.attachmentsCount || 0
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('tickets').insert([{
          tenant_id: ticketData.tenantId,
          protocol,
          unit_id: ticketData.unitId,
          customer_id: ticketData.customerId,
          description: ticketData.description,
          category: ticketData.category,
          subcategory: ticketData.subcategory,
          priority: ticketData.priority,
          urgency: ticketData.urgency,
          impact: ticketData.impact,
          status: ticketData.status,
          user_risk_flag: ticketData.userRiskFlag,
          adverse_event_flag: ticketData.adverseEventFlag,
          damage_flag: ticketData.damageFlag,
          ready_for_collection: ticketData.readyForCollection
        }]).select().single();
        if (!error && data) return data as unknown as Ticket;
      } catch (err) {
        console.error('Failed creating ticket in Supabase:', err);
      }
    }

    localTickets.unshift(newTicket);
    
    // Add audit log
    localAuditLogs.unshift({
      id: 'al-' + Date.now(),
      userId: ticketData.createdBy || 'u001',
      userEmail: 'usuario@procirurgica.com.br',
      action: 'TICKET_CREATED',
      entity: 'TICKET',
      entityId: newTicket.id,
      details: `Abertura do protocolo ${newTicket.protocol} para ${newTicket.customerName}`,
      createdAt: new Date().toISOString()
    });

    return newTicket;
  },

  async updateTicketStatus(ticketId: string, newStatus: TicketStatus, notes: string, user: string): Promise<Ticket | null> {
    const ticket = localTickets.find(t => t.id === ticketId);
    if (!ticket) return null;

    const prevStatus = ticket.status;
    ticket.status = newStatus;
    ticket.updatedAt = new Date().toISOString();

    if (newStatus === 'CLOSED_PROCEDENT' || newStatus === 'CLOSED_NON_PROCEDENT') {
      ticket.closedAt = new Date().toISOString();
    }

    localAuditLogs.unshift({
      id: 'al-' + Date.now(),
      userId: user,
      userEmail: 'usuario@procirurgica.com.br',
      action: 'STATUS_CHANGED',
      entity: 'TICKET',
      entityId: ticketId,
      details: `Status alterado de ${prevStatus} para ${newStatus}. Obs: ${notes}`,
      createdAt: new Date().toISOString()
    });

    return ticket;
  },

  async dispatchTicket(
    ticketId: string, 
    assignedArea: string, 
    assignedToId?: string, 
    assignedToName?: string, 
    notes?: string, 
    userEmail?: string
  ): Promise<Ticket | null> {
    const ticket = localTickets.find(t => t.id === ticketId);
    if (!ticket) return null;

    ticket.assignedArea = assignedArea;
    if (assignedToId) ticket.assignedTo = assignedToId;
    if (assignedToName) ticket.assignedToName = assignedToName;
    ticket.updatedAt = new Date().toISOString();

    // Auto update status if routing to Technical or Logistics
    if (assignedArea.toLowerCase().includes('técnica') || assignedArea.toLowerCase().includes('tecnica')) {
      ticket.status = 'SENT_TO_TECHNICAL';
    } else if (assignedArea.toLowerCase().includes('logística') || assignedArea.toLowerCase().includes('logistica')) {
      ticket.status = 'SENT_TO_LOGISTICS';
    }

    localAuditLogs.unshift({
      id: 'al-' + Date.now(),
      userId: assignedToId || 'u001',
      userEmail: userEmail || 'sistema@procirurgica.com.br',
      action: 'TICKET_DISPATCHED',
      entity: 'TICKET',
      entityId: ticketId,
      details: `Chamado ${ticket.protocol} direcionado para área: ${assignedArea}, Responsável: ${assignedToName || 'Não especificado'}. Obs: ${notes || 'Sem observações'}`,
      createdAt: new Date().toISOString()
    });

    return ticket;
  },

  // --- SERVICE ORDERS (ORDENS DE SERVIÇO - OS) ---
  async getServiceOrders(): Promise<ServiceOrder[]> {
    return localServiceOrders;
  },

  async createServiceOrder(osData: Omit<ServiceOrder, 'id' | 'osNumber' | 'openedAt'>): Promise<ServiceOrder> {
    const seq = (localServiceOrders.length + 1).toString().padStart(4, '0');
    const year = new Date().getFullYear();
    const osNumber = `OS-${year}-${seq}`;

    const newOS: ServiceOrder = {
      ...osData,
      id: 'os-' + Date.now(),
      osNumber,
      openedAt: new Date().toISOString()
    };

    localServiceOrders.unshift(newOS);

    // Also link technical case
    const techCase: TechnicalCase = {
      id: 'tc-' + Date.now(),
      ticketId: osData.ticketId,
      subprotocol: `${osData.protocol}-AT${seq}`,
      technicianId: osData.technicianId,
      technicianName: osData.technicianName,
      diagnosticReport: osData.diagnostic,
      replacedParts: osData.partsReplaced,
      status: 'IN_ANALYSIS',
      cost: osData.estimatedCost
    };
    localTechnicalCases.unshift(techCase);

    // Add Audit Log
    localAuditLogs.unshift({
      id: 'al-' + Date.now(),
      userId: osData.technicianId || 'u002',
      userEmail: 'tecnico@procirurgica.com.br',
      action: 'OS_CREATED',
      entity: 'SERVICE_ORDER',
      entityId: newOS.id,
      details: `Abertura da Ordem de Serviço ${osNumber} para o equipamento ${osData.equipmentName} do cliente ${osData.customerName}`,
      createdAt: new Date().toISOString()
    });

    return newOS;
  },

  // --- USER MANAGEMENT ---
  async getUsers(): Promise<UserProfile[]> {
    return localUsers;
  },

  async createUser(userData: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    const newUser: UserProfile = {
      ...userData,
      id: 'u-' + Date.now()
    };
    localUsers.unshift(newUser);
    return newUser;
  },

  async updateUser(userId: string, updateData: Partial<UserProfile>): Promise<UserProfile | null> {
    const idx = localUsers.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    localUsers[idx] = { ...localUsers[idx], ...updateData };
    return localUsers[idx];
  },

  // --- RESET SYSTEM DATA ("ZERAR AS INFORMAÇÕES") ---
  async resetAllData(): Promise<boolean> {
    localTickets = [];
    localQualityPlans = [];
    localTechnicalCases = [];
    localLogisticsCases = [];
    localServiceOrders = [];
    
    localAuditLogs.unshift({
      id: 'al-' + Date.now(),
      userId: 'admin',
      userEmail: 'admin@procirurgica.com.br',
      action: 'DATA_RESET',
      entity: 'SYSTEM',
      details: 'Todas as informações de chamados, ordens de serviço, planos 5W2H e históricos foram zeradas via painel administrativo.',
      createdAt: new Date().toISOString()
    });

    return true;
  },

  // --- CUSTOMERS & PRODUCTS ---
  async getCustomers(): Promise<Customer[]> {
    return localCustomers;
  },

  async getProducts(): Promise<Product[]> {
    return localProducts;
  },

  // --- QUALITY & ACTIONS ---
  async getQualityPlans(): Promise<QualityActionPlan[]> {
    return localQualityPlans;
  },

  async createQualityPlan(plan: Omit<QualityActionPlan, 'id'>): Promise<QualityActionPlan> {
    const newPlan: QualityActionPlan = {
      ...plan,
      id: 'q-' + Date.now()
    };
    localQualityPlans.unshift(newPlan);
    return newPlan;
  },

  // --- TECHNICAL & LOGISTICS ---
  async getTechnicalCases(): Promise<TechnicalCase[]> {
    return localTechnicalCases;
  },

  async getLogisticsCases(): Promise<LogisticsCase[]> {
    return localLogisticsCases;
  },

  // --- AUDIT LOGS ---
  async getAuditLogs(): Promise<AuditLog[]> {
    return localAuditLogs;
  },

  // --- GEMINI AI ASSISTANT (SERVER-SIDE EXPRESS PROXY) ---
  async classifyTicketWithGemini(description: string): Promise<GeminiClassificationResult> {
    try {
      const res = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('AI API endpoint fallback:', err);
    }

    // Heuristic Fallback if Gemini key is not configured or server unreachable
    return {
      suggested_category: description.toLowerCase().includes('erro') || description.toLowerCase().includes('defeito') 
        ? 'Assistência Técnica' 
        : 'Logística / Avaria',
      suggested_subcategory: description.toLowerCase().includes('erro') 
        ? 'Falha Eletrônica / Componente' 
        : 'Avaria em Transporte',
      suggested_priority: description.toLowerCase().includes('cirúrgico') || description.toLowerCase().includes('paciente') 
        ? 'CRITICAL' 
        : 'HIGH',
      suggested_severity: 'S2 - Moderada/Severa',
      summary: description.slice(0, 180) + '...',
      possible_root_causes: [
        'Desgaste natural de componente elétrico',
        'Incompatibilidade ou oscilação de tensão na rede hospitalar',
        'Compressão mecânica na embalagem secundária'
      ],
      missing_information: [
        'Número do Lote do Fabricante',
        'Horário do evento cirúrgico'
      ],
      confidence: 88
    };
  },

  async summarizeTicketWithGemini(ticket: Ticket): Promise<string> {
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket })
      });
      if (res.ok) {
        const data = await res.json();
        return data.summary;
      }
    } catch (err) {
      console.warn('AI Summary endpoint fallback:', err);
    }

    return `Resumo Executivo Protocolo ${ticket.protocol}: O cliente ${ticket.customerName} reportou ocorrência na categoria ${ticket.category} envolvendo o produto ${ticket.items[0]?.productName || 'não especificado'}. Status atual: ${ticket.status}. Classificado como prioridade ${ticket.priority} devido ao impacto na operação do cliente.`;
  },

  async suggestResponseWithGemini(ticket: Ticket): Promise<string> {
    try {
      const res = await fetch('/api/ai/suggest-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket })
      });
      if (res.ok) {
        const data = await res.json();
        return data.suggestedResponse;
      }
    } catch (err) {
      console.warn('AI Response Suggestion fallback:', err);
    }

    return `Prezado(a) ${ticket.customerName},\n\nAgradecemos o contato com o SAC da Procirúrgica. Registramos a sua solicitação sob o protocolo ${ticket.protocol}.\n\nNossa equipe técnica e farmacêutica responsável iniciou a análise da ocorrência relacionada ao item ${ticket.items[0]?.productName || ''}. Entraremos em contato com a solução e procedimentos para agendamento de coleta/visita em até 24 horas úteis.\n\nAtenciosamente,\nEquipe de Pós-Venda & Qualidade - Procirúrgica`;
  }
};
