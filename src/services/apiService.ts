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

export interface HistoricalImportTicket {
  protocol: string;
  customerName: string;
  customerDocument?: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  invoiceNumber?: string;
  openedAt?: string;
  items: Array<{ productName: string; sku?: string; quantity: number; lotNumber?: string; serialNumber?: string }>;
}

const profileFromDb = (row: any): UserProfile => ({
  id: row.id, tenantId: row.tenant_id, unitId: row.unit_id || undefined,
  fullName: row.full_name, email: row.email, phone: row.phone || undefined,
  jobTitle: row.job_title || undefined, department: row.department || undefined,
  employeeCode: row.employee_code || undefined, managerName: row.manager_name || undefined,
  notes: row.notes || undefined, roleCode: row.role_code, avatarUrl: row.avatar_url || undefined,
  isActive: row.is_active, lastAccessAt: row.last_access_at || undefined
});

const ticketFromDb = (row: any): Ticket => ({
  id: row.id, tenantId: row.tenant_id, protocol: row.protocol, unitId: row.unit_id || undefined,
  customerId: row.customer_id || '', customerName: row.customer?.name || row.customer_name || 'Cliente não identificado',
  customerDocument: row.customer?.document || row.customer_document || '', sellerName: row.seller_name || undefined,
  invoiceNumber: row.invoice_number || undefined, purchaseDate: row.purchase_date || undefined,
  deliveryDate: row.delivery_date || undefined, salesChannel: row.sales_channel || undefined,
  description: row.description, category: row.category, subcategory: row.subcategory || undefined,
  classification: row.classification || undefined, priority: row.priority, urgency: row.urgency,
  impact: row.impact, initialProcedency: row.initial_procedency, userRiskFlag: row.user_risk_flag,
  adverseEventFlag: row.adverse_event_flag, damageFlag: row.damage_flag, readyForCollection: row.ready_for_collection,
  status: row.status, assignedTo: row.assigned_to || undefined, assignedArea: row.assigned_area || undefined,
  slaDueAt: row.sla_due_at || undefined, firstResponseAt: row.first_response_at || undefined,
  resolvedAt: row.resolved_at || undefined, closedAt: row.closed_at || undefined,
  finalOpinion: row.final_opinion || undefined, finalProcedency: row.final_procedency || undefined,
  createdBy: row.created_by, createdByName: row.created_by_name || 'Usuário do SAC', createdAt: row.created_at, updatedAt: row.updated_at,
  items: (row.items || []).map((i:any) => ({ id:i.id, ticketId:i.ticket_id, productId:i.product_id || undefined,
    productName:i.product_name, sku:i.sku || undefined, quantity:i.quantity, serialNumber:i.serial_number || undefined,
    lotNumber:i.lot_number || undefined, expirationDate:i.expiration_date || undefined, anvisaRegister:i.anvisa_register || undefined })),
  commentsCount: 0, attachmentsCount: 0
});

export const apiService = {
  // --- TICKETS ---
  async getTickets(filters?: DashboardFilters): Promise<Ticket[]> {
    if (isSupabaseConfigured) {
      let query = supabase.from('tickets').select('*, customer:customers(name,document), items:ticket_items(*)');
      if (filters?.tenantId) query = query.eq('tenant_id', filters.tenantId);
      if (filters?.unitId) query = query.eq('unit_id', filters.unitId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase fetch tickets error:', error);
        return localTickets;
      }
      return (data || []).map(ticketFromDb);
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
  async getCurrentProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) return localUsers.find(u => u.id === userId) || null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return error || !data ? null : profileFromDb(data);
  },

  async getUsers(): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (!error && data) return data.map(profileFromDb);
    }
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
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('profiles').update({
        full_name: updateData.fullName, email: updateData.email, phone: updateData.phone || null,
        job_title: updateData.jobTitle || null, department: updateData.department || null,
        employee_code: updateData.employeeCode || null, manager_name: updateData.managerName || null,
        notes: updateData.notes || null, role_code: updateData.roleCode, is_active: updateData.isActive,
        updated_at: new Date().toISOString()
      }).eq('id', userId).select().single();
      if (error) throw new Error(`Não foi possível salvar o usuário: ${error.message}`);
      return profileFromDb(data);
    }
    const idx = localUsers.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    localUsers[idx] = { ...localUsers[idx], ...updateData };
    return localUsers[idx];
  },

  // --- RESET SYSTEM DATA ("ZERAR AS INFORMAÇÕES") ---
  async resetAllData(): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc('reset_operational_sac_data');
      if (error) throw new Error(`Não foi possível zerar os registros: ${error.message}`);
      return true;
    }
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

  async importHistoricalTickets(tickets: HistoricalImportTicket[], user: UserProfile): Promise<{ imported: number; skipped: number }> {
    if (!tickets.length) return { imported: 0, skipped: 0 };
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('import_historical_sac', { p_tickets: tickets });
      if (error) throw new Error(`Importação recusada pelo banco: ${error.message}`);
      return data as { imported: number; skipped: number };
    }
    const before = localTickets.length;
    for (const imported of tickets) {
      if (localTickets.some(t => t.protocol === imported.protocol)) continue;
      localTickets.push({
        id: `import-${Date.now()}-${localTickets.length}`, tenantId: user.tenantId, protocol: imported.protocol,
        customerId: imported.customerDocument || imported.customerName, customerName: imported.customerName,
        customerDocument: imported.customerDocument || '', description: imported.description, category: imported.category,
        priority: (['LOW','MEDIUM','HIGH','CRITICAL'].includes(imported.priority) ? imported.priority : 'MEDIUM') as any,
        urgency: 'MEDIUM', impact: 'MEDIUM', initialProcedency: 'UNDETERMINED', userRiskFlag: false,
        adverseEventFlag: false, damageFlag: false, readyForCollection: false, status: imported.status as TicketStatus,
        invoiceNumber: imported.invoiceNumber, createdBy: user.id, createdAt: imported.openedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(), createdByName: user.fullName, items: imported.items.map((i,n) => ({ ...i, id:`item-${Date.now()}-${n}`, ticketId:'', quantity:i.quantity })),
        commentsCount: 0, attachmentsCount: 0
      });
    }
    return { imported: localTickets.length - before, skipped: tickets.length - (localTickets.length - before) };
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

