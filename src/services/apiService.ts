import { 
  Ticket, Customer, Product, QualityActionPlan, TechnicalCase, LogisticsCase, AuditLog, GeminiClassificationResult, DashboardFilters, TicketStatus, UserProfile, ServiceOrder, Carrier, TicketQualificationStage
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

const customerFromDb = (row: any): Customer => ({
  id: row.id, tenantId: row.tenant_id, type: row.type, name: row.name,
  tradeName: row.trade_name || undefined, document: row.document,
  email: row.email || undefined, phone: row.phone || undefined,
  whatsapp: row.whatsapp || undefined, city: row.city || undefined,
  state: row.state || undefined, address: row.address || undefined,
  lgpdConsent: Boolean(row.lgpd_consent)
});

const productFromDb = (row: any): Product => ({
  id: row.id, tenantId: row.tenant_id, codeSku: row.code_sku, name: row.name,
  familyId: row.family_id || undefined, model: row.model || undefined,
  anvisaRegister: row.anvisa_register || undefined,
  supplierName: row.supplier_name || undefined, countryOrigin: row.country_origin || undefined
});

const ticketFromDb = (row: any): Ticket => ({
  id: row.id, tenantId: row.tenant_id, protocol: row.protocol, unitId: row.unit_id || undefined,
  customerId: row.customer_id || '', customerName: row.customer?.name || row.customer_name || 'Cliente não identificado',
  customerDocument: row.customer?.document || row.customer_document || '', sellerName: row.seller_name || undefined,
  invoiceNumber: row.invoice_number || undefined, purchaseDate: row.purchase_date || undefined,
  deliveryDate: row.delivery_date || undefined, salesChannel: row.sales_channel || undefined,
  carrierId: row.carrier_id || undefined, carrierName: row.carrier?.trade_name || row.carrier?.legal_name || undefined,
  description: row.description, category: row.category, subcategory: row.subcategory || undefined,
  classification: row.classification || undefined, qualificationStage: row.qualification_stage || 'REGISTRATION',
  qualificationNotes: row.qualification_notes || undefined, priority: row.priority, urgency: row.urgency,
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
      let query = supabase.from('tickets').select('*, customer:customers(name,document), carrier:carriers(legal_name,trade_name), items:ticket_items(*)');
      if (filters?.tenantId) query = query.eq('tenant_id', filters.tenantId);
      if (filters?.unitId) query = query.eq('unit_id', filters.unitId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        throw new Error(`Não foi possível carregar os chamados: ${error.message}`);
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
      if (error) throw new Error(`Não foi possível carregar o chamado: ${error.message}`);
      return ticketFromDb(data);
    }
    return localTickets.find(t => t.id === id) || null;
  },

  async createTicket(ticketData: Omit<Ticket, 'id' | 'protocol' | 'createdAt' | 'updatedAt'>): Promise<Ticket> {
    const ym = new Date().toISOString().slice(2, 7).replace('-', '');
    let protocol = `SAC.${ym}.${Date.now().toString().slice(-6)}`;
    
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
        const { data: generatedProtocol } = await supabase.rpc('generate_ticket_protocol', { p_tenant_id: ticketData.tenantId });
        if (generatedProtocol) protocol = generatedProtocol;
        const { data, error } = await supabase.from('tickets').insert([{
          tenant_id: ticketData.tenantId,
          protocol,
          unit_id: ticketData.unitId,
          customer_id: ticketData.customerId,
          seller_name: ticketData.sellerName || null,
          invoice_number: ticketData.invoiceNumber || null,
          purchase_date: ticketData.purchaseDate || null,
          delivery_date: ticketData.deliveryDate || null,
          sales_channel: ticketData.salesChannel || null,
          carrier_id: ticketData.carrierId || null,
          description: ticketData.description,
          category: ticketData.category,
          subcategory: ticketData.subcategory,
          qualification_stage: ticketData.qualificationStage || 'REGISTRATION',
          qualification_notes: ticketData.qualificationNotes || null,
          priority: ticketData.priority,
          urgency: ticketData.urgency,
          impact: ticketData.impact,
          initial_procedency: ticketData.initialProcedency,
          status: ticketData.status,
          assigned_area: ticketData.assignedArea || null,
          created_by: ticketData.createdBy,
          user_risk_flag: ticketData.userRiskFlag,
          adverse_event_flag: ticketData.adverseEventFlag,
          damage_flag: ticketData.damageFlag,
          ready_for_collection: ticketData.readyForCollection
        }]).select('*, customer:customers(name,document), carrier:carriers(legal_name,trade_name), items:ticket_items(*)').single();
        if (error || !data) throw error || new Error('Chamado não retornado pelo banco');

        if (ticketData.items.length) {
          const { error: itemError } = await supabase.from('ticket_items').insert(ticketData.items.map(item => ({
            ticket_id: data.id,
            product_id: item.productId || null,
            product_name: item.productName,
            sku: item.sku || null,
            quantity: item.quantity,
            serial_number: item.serialNumber || null,
            lot_number: item.lotNumber || null,
            expiration_date: item.expirationDate || null,
            anvisa_register: item.anvisaRegister || null
          })));
          if (itemError) throw itemError;
        }

        const { data: complete } = await supabase
          .from('tickets')
          .select('*, customer:customers(name,document), carrier:carriers(legal_name,trade_name), items:ticket_items(*)')
          .eq('id', data.id).single();
        return ticketFromDb(complete || data);
      } catch (err) {
        console.error('Failed creating ticket in Supabase:', err);
        throw err;
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
    if (isSupabaseConfigured) {
      const allowed: Partial<Record<TicketStatus, TicketStatus[]>> = {
        NEW: ['TRIAGE'],
        TRIAGE: ['TECHNICAL_ANALYSIS', 'SENT_TO_TECHNICAL', 'SENT_TO_LOGISTICS'],
        TECHNICAL_ANALYSIS: ['SENT_TO_LOGISTICS', 'WAITING_CUSTOMER', 'WAITING_SUPPLIER', 'CLOSED_PROCEDENT', 'CLOSED_NON_PROCEDENT'],
        SENT_TO_TECHNICAL: ['TECHNICAL_ANALYSIS', 'WAITING_CUSTOMER', 'WAITING_SUPPLIER', 'CLOSED_PROCEDENT', 'CLOSED_NON_PROCEDENT'],
        SENT_TO_LOGISTICS: ['TECHNICAL_ANALYSIS', 'WAITING_CUSTOMER', 'CLOSED_PROCEDENT', 'CLOSED_NON_PROCEDENT'],
        WAITING_CUSTOMER: ['TRIAGE', 'TECHNICAL_ANALYSIS', 'SENT_TO_LOGISTICS'],
        WAITING_SUPPLIER: ['TECHNICAL_ANALYSIS', 'CLOSED_PROCEDENT', 'CLOSED_NON_PROCEDENT']
      };
      const { data: current, error: fetchError } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
      if (fetchError || !current) throw new Error(`Chamado não encontrado: ${fetchError?.message || ''}`);
      if (current.status !== newStatus && !(allowed[current.status as TicketStatus] || []).includes(newStatus)) {
        throw new Error(`Transição de ${current.status} para ${newStatus} não é permitida.`);
      }
      const now = new Date().toISOString();
      const closed = newStatus === 'CLOSED_PROCEDENT' || newStatus === 'CLOSED_NON_PROCEDENT';
      const { data, error } = await supabase.from('tickets').update({
        status: newStatus, updated_at: now, closed_at: closed ? now : null,
        resolved_at: closed ? (current.resolved_at || now) : current.resolved_at
      }).eq('id', ticketId).select('*, customer:customers(name,document), carrier:carriers(legal_name,trade_name), items:ticket_items(*)').single();
      if (error || !data) throw new Error(`Não foi possível alterar o status: ${error?.message || ''}`);
      const { data: profile } = await supabase.from('profiles').select('full_name,email,tenant_id').eq('id', user).single();
      await Promise.all([
        supabase.from('ticket_status_history').insert({ ticket_id: ticketId, previous_status: current.status, new_status: newStatus, changed_by: user, changed_by_name: profile?.full_name || 'Usuário', notes }),
        supabase.from('audit_logs').insert({ tenant_id: current.tenant_id, user_id: user, user_email: profile?.email || null, action: 'STATUS_CHANGED', entity: 'TICKET', entity_id: ticketId, details: { previous_status: current.status, new_status: newStatus, notes } })
      ]);
      return ticketFromDb(data);
    }
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

  async updateTicket(ticket: Ticket, changes: Partial<Ticket>, user: UserProfile): Promise<Ticket> {
    const { data, error } = await supabase.from('tickets').update({
      description:changes.description ?? ticket.description, category:changes.category ?? ticket.category,
      subcategory:changes.subcategory ?? ticket.subcategory ?? null, priority:changes.priority ?? ticket.priority,
      urgency:changes.urgency ?? ticket.urgency, impact:changes.impact ?? ticket.impact,
      invoice_number:changes.invoiceNumber ?? ticket.invoiceNumber ?? null, seller_name:changes.sellerName ?? ticket.sellerName ?? null,
      sales_channel:changes.salesChannel ?? ticket.salesChannel ?? null, assigned_area:changes.assignedArea ?? ticket.assignedArea ?? null,
      updated_at:new Date().toISOString()
    }).eq('id',ticket.id).select('*, customer:customers(name,document), carrier:carriers(legal_name,trade_name), items:ticket_items(*)').single();
    if(error || !data) throw new Error(`Não foi possível editar o SAC: ${error?.message || ''}`);
    await supabase.from('audit_logs').insert({tenant_id:ticket.tenantId,user_id:user.id,user_email:user.email,action:'TICKET_UPDATED',entity:'TICKET',entity_id:ticket.id,details:{protocol:ticket.protocol,fields:Object.keys(changes)}});
    return ticketFromDb(data);
  },

  async deleteTicket(ticket: Ticket, reason: string): Promise<void> {
    const { error } = await supabase.rpc('delete_ticket_controlled',{p_ticket_id:ticket.id,p_reason:reason});
    if(error) throw new Error(`Não foi possível excluir o SAC: ${error.message}`);
  },

  async dispatchTicket(
    ticketId: string, 
    assignedArea: string, 
    assignedToId?: string, 
    assignedToName?: string, 
    notes?: string, 
    userEmail?: string
  ): Promise<Ticket | null> {
    if (isSupabaseConfigured) {
      const { data: current, error: fetchError } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
      if (fetchError || !current) throw new Error(`Chamado não encontrado: ${fetchError?.message || ''}`);
      const area = assignedArea.toLocaleLowerCase('pt-BR');
      const nextStatus: TicketStatus = area.includes('técnica') || area.includes('tecnica') ? 'SENT_TO_TECHNICAL'
        : area.includes('logística') || area.includes('logistica') ? 'SENT_TO_LOGISTICS' : current.status;
      const { data, error } = await supabase.from('tickets').update({ assigned_area: assignedArea, assigned_to: assignedToId || null, status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId).select('*, customer:customers(name,document), carrier:carriers(legal_name,trade_name), items:ticket_items(*)').single();
      if (error || !data) throw new Error(`Não foi possível encaminhar o chamado: ${error?.message || ''}`);
      const { data: actor } = await supabase.auth.getUser();
      await Promise.all([
        current.status !== nextStatus ? supabase.from('ticket_status_history').insert({ ticket_id: ticketId, previous_status: current.status, new_status: nextStatus, changed_by: actor.user?.id || null, changed_by_name: userEmail || 'Usuário', notes }) : Promise.resolve(),
        supabase.from('audit_logs').insert({ tenant_id: current.tenant_id, user_id: actor.user?.id || null, user_email: userEmail || actor.user?.email || null, action: 'TICKET_DISPATCHED', entity: 'TICKET', entity_id: ticketId, details: { assigned_area: assignedArea, assigned_to: assignedToId || null, assigned_to_name: assignedToName || null, notes: notes || null } })
      ]);
      return ticketFromDb(data);
    }
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
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('service_orders').select('*, ticket:tickets(protocol,customer:customers(name)), technician:profiles(full_name)').order('opened_at', { ascending: false });
      if (error) throw new Error(`Não foi possível carregar as ordens de serviço: ${error.message}`);
      return (data || []).map((row:any) => ({ id:row.id, osNumber:row.os_number, ticketId:row.ticket_id, protocol:row.ticket?.protocol || '', customerName:row.ticket?.customer?.name || '', equipmentName:row.equipment_name, serialNumber:row.serial_number || undefined, technicianId:row.technician_id || '', technicianName:row.technician?.full_name || '', serviceType:row.service_type, urgency:'MEDIUM', diagnostic:row.diagnostic || '', partsReplaced:row.parts_replaced || undefined, estimatedCost:Number(row.estimated_cost || 0), status:row.status, openedAt:row.opened_at, closedAt:row.completed_at || undefined }));
    }
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

    if (isSupabaseConfigured) {
      const { data: ticket, error: ticketError } = await supabase.from('tickets').select('tenant_id').eq('id', osData.ticketId).single();
      if (ticketError || !ticket) throw new Error('Chamado da ordem de serviço não encontrado.');
      const { data: generatedOS, error: sequenceError } = await supabase.rpc('generate_service_order_number',{p_tenant_id:ticket.tenant_id});
      if(sequenceError) throw new Error(`Não foi possível gerar a sequência da OS: ${sequenceError.message}`);
      const officialOSNumber=generatedOS || osNumber;
      const { data, error } = await supabase.from('service_orders').insert({ tenant_id:ticket.tenant_id, ticket_id:osData.ticketId, os_number:officialOSNumber, technician_id:osData.technicianId || null, service_type:osData.serviceType, equipment_name:osData.equipmentName, serial_number:osData.serialNumber || null, diagnostic:osData.diagnostic || null, parts_replaced:osData.partsReplaced || null, estimated_cost:osData.estimatedCost, status:osData.status }).select().single();
      if (error || !data) throw new Error(`Não foi possível criar a ordem de serviço: ${error?.message || ''}`);
      await supabase.from('audit_logs').insert({ tenant_id:ticket.tenant_id, user_id:osData.technicianId || null, action:'OS_CREATED', entity:'SERVICE_ORDER', entity_id:data.id, details:{ os_number:officialOSNumber, ticket_id:osData.ticketId } });
      return { ...newOS, id:data.id, osNumber:officialOSNumber, openedAt:data.opened_at };
    }

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

  async updateServiceOrder(order: ServiceOrder, changes: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const { data, error } = await supabase.from('service_orders').update({
      technician_id:changes.technicianId ?? order.technicianId ?? null, service_type:changes.serviceType ?? order.serviceType,
      equipment_name:changes.equipmentName ?? order.equipmentName, serial_number:changes.serialNumber ?? order.serialNumber ?? null,
      diagnostic:changes.diagnostic ?? order.diagnostic ?? null, parts_replaced:changes.partsReplaced ?? order.partsReplaced ?? null,
      estimated_cost:changes.estimatedCost ?? order.estimatedCost, status:changes.status ?? order.status,
      completed_at:(changes.status ?? order.status)==='COMPLETED' ? new Date().toISOString() : null
    }).eq('id',order.id).select().single();
    if(error || !data) throw new Error(`Não foi possível editar a OS: ${error?.message || ''}`);
    return {...order,...changes,id:data.id,openedAt:data.opened_at,closedAt:data.completed_at || undefined};
  },

  async deleteServiceOrder(order: ServiceOrder, reason: string): Promise<void> {
    const { error } = await supabase.rpc('delete_service_order_controlled',{p_os_id:order.id,p_reason:reason});
    if(error) throw new Error(`Não foi possível excluir a OS: ${error.message}`);
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
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.functions.invoke('invite-user', { body: userData });
      if (error || !data?.profile) {
        const { data: existing } = await supabase.from('profiles').select('*').ilike('email', userData.email.trim()).maybeSingle();
        if (existing) return profileFromDb(existing);
        let functionMessage='';
        try { functionMessage=(await (error as any)?.context?.json?.())?.error || ''; } catch { /* resposta sem JSON */ }
        throw new Error(data?.error || functionMessage || error?.message || 'Não foi possível convidar o usuário.');
      }
      return profileFromDb(data.profile);
    }
    const newUser: UserProfile = {
      ...userData,
      id: 'u-' + Date.now()
    };
    localUsers.unshift(newUser);
    return newUser;
  },

  async sendPasswordReset(email: string): Promise<void> {
    const redirectTo = `${window.location.origin}/sacproh/`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      if (/rate limit|too many/i.test(error.message)) throw new Error('Usuário cadastrado, mas o limite temporário de e-mails do Supabase foi atingido. Aguarde antes de reenviar ou configure um servidor SMTP próprio.');
      throw new Error(`Não foi possível enviar o e-mail: ${error.message}`);
    }
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
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('customers').select('*').order('name');
      if (!error) return (data || []).map(customerFromDb);
    }
    return localCustomers;
  },

  async createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('customers').insert({
        tenant_id: customer.tenantId, type: customer.type, name: customer.name,
        trade_name: customer.tradeName || null, document: customer.document,
        email: customer.email || null, phone: customer.phone || null,
        whatsapp: customer.whatsapp || null, city: customer.city || null,
        state: customer.state || null, address: customer.address || null,
        lgpd_consent: customer.lgpdConsent,
        lgpd_consent_at: customer.lgpdConsent ? new Date().toISOString() : null
      }).select().single();
      if (error || !data) throw error || new Error('Cliente não retornado pelo banco');
      return customerFromDb(data);
    }
    const created = { ...customer, id: `c-${Date.now()}` };
    localCustomers.push(created);
    return created;
  },

  async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (!error) return (data || []).map(productFromDb);
    }
    return localProducts;
  },

  async getCarriers(): Promise<Carrier[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('carriers').select('*').eq('is_active', true).order('legal_name');
    if (error) return [];
    return (data || []).map((row:any) => ({
      id: row.id, tenantId: row.tenant_id, legalName: row.legal_name, tradeName: row.trade_name || undefined,
      document: row.document || undefined, contactName: row.contact_name || undefined, email: row.email || undefined,
      phone: row.phone || undefined, qualificationStatus: row.qualification_status, score: row.score ?? undefined,
      isActive: row.is_active
    }));
  },

  async createCarrier(carrier: Omit<Carrier, 'id'>): Promise<Carrier> {
    const { data, error } = await supabase.from('carriers').insert({
      tenant_id: carrier.tenantId, legal_name: carrier.legalName, trade_name: carrier.tradeName || null,
      document: carrier.document || null, contact_name: carrier.contactName || null,
      email: carrier.email || null, phone: carrier.phone || null,
      qualification_status: carrier.qualificationStatus, score: carrier.score || null, is_active: carrier.isActive
    }).select().single();
    if (error || !data) throw new Error(`Não foi possível cadastrar a transportadora: ${error?.message || ''}`);
    return { id:data.id, tenantId:data.tenant_id, legalName:data.legal_name, tradeName:data.trade_name || undefined,
      document:data.document || undefined, contactName:data.contact_name || undefined, email:data.email || undefined,
      phone:data.phone || undefined, qualificationStatus:data.qualification_status, score:data.score ?? undefined, isActive:data.is_active };
  },

  async uploadTicketAttachments(ticket: Ticket, files: File[], user: UserProfile): Promise<number> {
    let uploaded = 0;
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${ticket.tenantId}/${ticket.id}/${Date.now()}-${safeName}`;
      const { error: storageError } = await supabase.storage.from('sac-attachments').upload(path, file, { contentType: file.type });
      if (storageError) throw new Error(`Falha no anexo ${file.name}: ${storageError.message}`);
      const { error: recordError } = await supabase.from('ticket_attachments').insert({
        ticket_id: ticket.id, tenant_id: ticket.tenantId, file_name: file.name, file_path: path,
        file_type: file.type, file_size: file.size, uploaded_by: user.id
      });
      if (recordError) throw new Error(`Falha ao registrar ${file.name}: ${recordError.message}`);
      uploaded++;
    }
    return uploaded;
  },

  async getTicketAttachments(ticketId: string): Promise<Array<{id:string;fileName:string;fileType:string;fileSize:number;url:string}>> {
    const { data, error } = await supabase.from('ticket_attachments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending:false });
    if (error) return [];
    return Promise.all((data || []).map(async (row:any) => {
      const { data: signed } = await supabase.storage.from('sac-attachments').createSignedUrl(row.file_path, 3600);
      return { id:row.id, fileName:row.file_name, fileType:row.file_type || '', fileSize:row.file_size || 0, url:signed?.signedUrl || '' };
    }));
  },

  async getTicketComments(ticketId: string): Promise<Array<{id:string;author:string;content:string;date:string;internal:boolean}>> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('ticket_comments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    if (error) throw new Error(`Não foi possível carregar os comentários: ${error.message}`);
    return (data || []).map((row:any) => ({ id:row.id, author:row.author_name, content:row.content, date:new Date(row.created_at).toLocaleString('pt-BR'), internal:Boolean(row.is_internal) }));
  },

  async createTicketComment(ticket: Ticket, content: string, internal: boolean, user: UserProfile): Promise<{id:string;author:string;content:string;date:string;internal:boolean}> {
    const { data, error } = await supabase.from('ticket_comments').insert({ ticket_id:ticket.id, author_id:user.id, author_name:user.fullName, is_internal:internal, content:content.trim() }).select().single();
    if (error || !data) throw new Error(`Não foi possível salvar o comentário: ${error?.message || ''}`);
    await supabase.from('audit_logs').insert({ tenant_id:ticket.tenantId, user_id:user.id, user_email:user.email, action:'COMMENT_CREATED', entity:'TICKET', entity_id:ticket.id, details:{ comment_id:data.id, internal } });
    return { id:data.id, author:data.author_name, content:data.content, date:new Date(data.created_at).toLocaleString('pt-BR'), internal:Boolean(data.is_internal) };
  },

  async updateTicketQualification(ticketId: string, stage: TicketQualificationStage, notes: string, user: UserProfile): Promise<void> {
    const { error } = await supabase.from('tickets').update({
      qualification_stage: stage, qualification_notes: notes, qualification_updated_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq('id', ticketId);
    if (error) throw new Error(`Não foi possível atualizar a qualificação: ${error.message}`);
    await supabase.from('ticket_status_history').insert({
      ticket_id: ticketId, previous_status: null, new_status: 'QUALIFICATION_UPDATE', changed_by: user.id,
      changed_by_name: user.fullName, notes: `Qualificação: ${stage}. ${notes}`
    });
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
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending:false }).limit(500);
      if (error) throw new Error(`Não foi possível carregar a auditoria: ${error.message}`);
      return (data || []).map((row:any) => ({ id:row.id, userId:row.user_id || '', userEmail:row.user_email || 'Sistema', action:row.action, entity:row.entity, entityId:row.entity_id || undefined, details:typeof row.details === 'string' ? row.details : JSON.stringify(row.details || {}), createdAt:row.created_at }));
    }
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
