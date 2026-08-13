
import { 
  Ticket, Customer, Product, ProductLot, LotAction, FactoryFollowup, QualityActionPlan, TechnicalCase, LogisticsCase, AuditLog, GeminiClassificationResult, DashboardFilters, TicketStatus, UserProfile, ServiceOrder, Carrier, TicketQualificationStage, Tenant
} from '../types';
import { 
  mockTickets, mockCustomers, mockProducts, mockQualityPlans, mockTechnicalCases, mockLogisticsCases, mockAuditLogs, mockUsers, mockServiceOrders 
} from '../lib/mockData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const authenticatedJsonHeaders = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Entre novamente para usar os recursos inteligentes.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
};

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
  supplierName: row.supplier_name || undefined, countryOrigin: row.country_origin || undefined,
  brand: row.brand || undefined, manufacturerName: row.manufacturer_name || undefined,
  importerName: row.importer_name || undefined, distributorName: row.distributor_name || undefined
});

const productLotFromDb = (row:any):ProductLot => ({
  id:row.id, tenantId:row.tenant_id, productId:row.product_id, lotNumber:row.lot_number,
  manufacturingDate:row.manufacturing_date || undefined, expirationDate:row.expiration_date || undefined,
  expirationMode:row.expiration_mode || (row.expiration_date ? 'DETERMINED' : 'NOT_INFORMED'),
  receivedQuantity:Number(row.received_quantity || 0), soldQuantity:Number(row.sold_quantity || 0),
  stockQuantity:Number(row.stock_quantity || 0), status:row.status,
  supplierDocument:row.supplier_document || undefined, notes:row.notes || undefined,
  createdAt:row.created_at, updatedAt:row.updated_at
});

const lotActionFromDb=(row:any):LotAction=>({id:row.id,tenantId:row.tenant_id,productLotId:row.product_lot_id,
  actionType:row.action_type,status:row.status,reason:row.reason,ownerName:row.owner_name,
  dueDate:row.due_date||undefined,affectedCustomers:Number(row.affected_customers||0),affectedUnits:Number(row.affected_units||0),
  createdAt:row.created_at,completedAt:row.completed_at||undefined});

const factoryFollowupFromDb=(row:any):FactoryFollowup=>({
  id:row.id,tenantId:row.tenant_id,productLotId:row.product_lot_id,manufacturerName:row.manufacturer_name,
  contactName:row.contact_name||undefined,contactEmail:row.contact_email||undefined,subject:row.subject,
  problemSummary:row.problem_summary,requestedRepair:row.requested_repair||undefined,
  requestedImprovement:row.requested_improvement||undefined,requestedParts:row.requested_parts||undefined,
  replacementQuantity:Number(row.replacement_quantity||0),protocolReference:row.protocol_reference||undefined,
  status:row.status,ownerName:row.owner_name,dueDate:row.due_date||undefined,lastContactAt:row.last_contact_at||undefined,
  nextFollowupAt:row.next_followup_at||undefined,manufacturerResponse:row.manufacturer_response||undefined,
  createdAt:row.created_at,updatedAt:row.updated_at
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
  status: row.status, assignedTo: row.assigned_to || undefined,
  assignedToName: row.assigned_profile?.full_name || undefined, assignedArea: row.assigned_area || undefined,
  slaDueAt: row.sla_due_at || undefined, firstResponseAt: row.first_response_at || undefined,
  resolvedAt: row.resolved_at || undefined, closedAt: row.closed_at || undefined,
  finalOpinion: row.final_opinion || undefined, finalProcedency: row.final_procedency || undefined,
  createdBy: row.created_by, createdByName: row.created_by_name || 'Usuário do SAC', createdAt: row.created_at, updatedAt: row.updated_at,
  items: (row.items || []).map((i:any) => ({ id:i.id, ticketId:i.ticket_id, productId:i.product_id || undefined,
    productName:i.product_name, sku:i.sku || undefined, quantity:i.quantity, serialNumber:i.serial_number || undefined,
    lotNumber:i.lot_number || undefined, manufacturingDate:i.manufacturing_date || undefined,
    expirationDate:i.expiration_date || undefined, anvisaRegister:i.anvisa_register || undefined,
    manufacturerName:i.manufacturer_name || undefined, importerName:i.importer_name || undefined,
    distributorName:i.distributor_name || undefined, retailerName:i.retailer_name || undefined })),
  commentsCount: 0, attachmentsCount: 0
});

export const apiService = {
  async getTenant(tenantId:string):Promise<Tenant|null>{
    if(!isSupabaseConfigured)return null;
    const{data,error}=await supabase.from('tenants').select('id,name,trade_name,document,is_active').eq('id',tenantId).single();
    if(error||!data)return null;
    return{id:data.id,name:data.name,tradeName:data.trade_name||undefined,document:data.document,isActive:data.is_active};
  },
  // --- TICKETS ---
  async getTickets(filters?: DashboardFilters): Promise<Ticket[]> {
    if (isSupabaseConfigured) {
      let query = supabase.from('tickets').select('*, customer:customers(name,document), carrier:carriers(legal_name,trade_name), assigned_profile:profiles!tickets_assigned_to_fkey(full_name), items:ticket_items(*)');
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
            manufacturing_date: item.manufacturingDate || null,
            expiration_date: item.expirationDate || null,
            anvisa_register: item.anvisaRegister || null,
            manufacturer_name: item.manufacturerName || null,
            importer_name: item.importerName || null,
            distributor_name: item.distributorName || null,
            retailer_name: item.retailerName || null
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
      const { data, …2939 tokens truncated…istóricos foram zeradas via painel administrativo.',
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

  async getProductLots(tenantId:string):Promise<ProductLot[]> {
    if (!isSupabaseConfigured) return [];
    const { data,error } = await supabase.from('product_lots').select('*').eq('tenant_id',tenantId).order('updated_at',{ascending:false});
    if (error) throw new Error(`Não foi possível carregar os lotes: ${error.message}`);
    return (data || []).map(productLotFromDb);
  },

  async createProductLot(lot:Omit<ProductLot,'id'|'createdAt'|'updatedAt'>):Promise<ProductLot> {
    const { data,error } = await supabase.from('product_lots').insert({
      tenant_id:lot.tenantId, product_id:lot.productId, lot_number:lot.lotNumber,
      manufacturing_date:lot.manufacturingDate || null, expiration_date:lot.expirationDate || null,
      expiration_mode:lot.expirationMode,
      received_quantity:lot.receivedQuantity, sold_quantity:lot.soldQuantity, stock_quantity:lot.stockQuantity,
      status:lot.status, supplier_document:lot.supplierDocument || null, notes:lot.notes || null
    }).select().single();
    if(error || !data) throw new Error(`Não foi possível cadastrar o lote: ${error?.message || ''}`);
    return productLotFromDb(data);
  },

  async updateProductLotStatus(id:string,status:ProductLot['status'],notes?:string):Promise<ProductLot> {
    const { data,error } = await supabase.from('product_lots').update({status,notes:notes || null,updated_at:new Date().toISOString()}).eq('id',id).select().single();
    if(error || !data) throw new Error(`Não foi possível alterar o lote: ${error?.message || ''}`);
    return productLotFromDb(data);
  },

  async getLotActions(tenantId:string):Promise<LotAction[]> {
    if(!isSupabaseConfigured)return [];
    const{data,error}=await supabase.from('lot_actions').select('*').eq('tenant_id',tenantId).order('created_at',{ascending:false});
    if(error)throw new Error(`Não foi possível carregar as ações de lote: ${error.message}`);
    return(data||[]).map(lotActionFromDb);
  },

  async createLotAction(action:Omit<LotAction,'id'|'createdAt'|'completedAt'>):Promise<LotAction>{
    const{data,error}=await supabase.from('lot_actions').insert({tenant_id:action.tenantId,product_lot_id:action.productLotId,
      action_type:action.actionType,status:action.status,reason:action.reason,owner_name:action.ownerName,due_date:action.dueDate||null,
      affected_customers:action.affectedCustomers,affected_units:action.affectedUnits}).select().single();
    if(error||!data)throw new Error(`Não foi possível registrar a ação: ${error?.message||''}`);
    return lotActionFromDb(data);
  },

  async getFactoryFollowups(tenantId:string):Promise<FactoryFollowup[]> {
    if(!isSupabaseConfigured)return [];
    const{data,error}=await supabase.from('factory_followups').select('*').eq('tenant_id',tenantId).order('updated_at',{ascending:false});
    if(error)throw new Error(`Não foi possível carregar o follow-up da fábrica: ${error.message}`);
    return(data||[]).map(factoryFollowupFromDb);
  },

  async createFactoryFollowup(item:Omit<FactoryFollowup,'id'|'createdAt'|'updatedAt'>):Promise<FactoryFollowup>{
    const{data,error}=await supabase.from('factory_followups').insert({
      tenant_id:item.tenantId,product_lot_id:item.productLotId,manufacturer_name:item.manufacturerName,
      contact_name:item.contactName||null,contact_email:item.contactEmail||null,subject:item.subject,
      problem_summary:item.problemSummary,requested_repair:item.requestedRepair||null,
      requested_improvement:item.requestedImprovement||null,requested_parts:item.requestedParts||null,
      replacement_quantity:item.replacementQuantity,protocol_reference:item.protocolReference||null,
      status:item.status,owner_name:item.ownerName,due_date:item.dueDate||null,last_contact_at:item.lastContactAt||null,
      next_followup_at:item.nextFollowupAt||null,manufacturer_response:item.manufacturerResponse||null
    }).select().single();
    if(error||!data)throw new Error(`Não foi possível registrar o follow-up da fábrica: ${error?.message||''}`);
    return factoryFollowupFromDb(data);
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
  async getTechnicalCases(ticketId?: string): Promise<TechnicalCase[]> {
    if (isSupabaseConfigured) {
      let query = supabase.from('technical_cases').select('*, technician:profiles(full_name)').order('created_at', { ascending: false });
      if (ticketId) query = query.eq('ticket_id', ticketId);
      const { data, error } = await query;
      if (error) throw new Error(`Não foi possível carregar a assistência técnica: ${error.message}`);
      return (data || []).map((row: any) => ({
        id: row.id, ticketId: row.ticket_id, subprotocol: row.subprotocol,
        technicianId: row.technician_id || undefined, technicianName: row.technician?.full_name || undefined,
        diagnosticReport: row.diagnostic_report || '', replacedParts: row.replaced_parts || undefined,
        visitDate: row.visit_date || undefined, status: row.status, cost: Number(row.cost || 0)
      }));
    }
    return ticketId ? localTechnicalCases.filter(item => item.ticketId === ticketId) : localTechnicalCases;
  },

  async deleteTechnicalCase(technicalCase: TechnicalCase, reason: string, user: UserProfile): Promise<void> {
    if (!reason.trim()) throw new Error('Informe o motivo da exclusão do subprotocolo.');
    if (isSupabaseConfigured) {
      const { data: ticket, error: ticketError } = await supabase.from('tickets').select('tenant_id').eq('id', technicalCase.ticketId).single();
      if (ticketError || !ticket) throw new Error('SAC vinculado ao subprotocolo não encontrado.');
      const { error } = await supabase.from('technical_cases').delete().eq('id', technicalCase.id);
      if (error) throw new Error(`Não foi possível excluir o subprotocolo: ${error.message}`);
      await supabase.from('audit_logs').insert({ tenant_id: ticket.tenant_id, user_id: user.id, user_email: user.email,
        action: 'TECHNICAL_CASE_DELETED', entity: 'TECHNICAL_CASE', entity_id: technicalCase.id,
        details: { subprotocol: technicalCase.subprotocol, ticket_id: technicalCase.ticketId, reason: reason.trim() } });
      return;
    }
    localTechnicalCases = localTechnicalCases.filter(item => item.id !== technicalCase.id);
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
        headers: await authenticatedJsonHeaders(),
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
        headers: await authenticatedJsonHeaders(),
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
        headers: await authenticatedJsonHeaders(),
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

