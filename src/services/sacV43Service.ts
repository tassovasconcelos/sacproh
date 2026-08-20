import { supabase } from '../lib/supabase';
import type { Customer, Ticket, UserProfile } from '../types';

export type TicketEvent = {
  id: string;
  ticketId: string;
  eventType: string;
  title: string;
  description?: string;
  actorName?: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

export type TicketCostType =
  | 'BONUS_INVOICE'
  | 'RETURN_INVOICE'
  | 'OUTBOUND_FREIGHT'
  | 'RETURN_FREIGHT'
  | 'TECHNICAL_SERVICE'
  | 'PARTS'
  | 'PRODUCT_REPLACEMENT'
  | 'REFUND'
  | 'OTHER';

export type TicketCost = {
  id: string;
  ticketId: string;
  costType: TicketCostType;
  description: string;
  amount: number;
  invoiceNumber?: string;
  supplierName?: string;
  occurredAt: string;
  notes?: string;
  createdByName?: string;
  createdAt: string;
};

export type CustomerCorrection = Partial<{
  name: string;
  tradeName: string;
  document: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  state: string;
  zipCode: string;
  address: string;
}>;

export type CloseTicketInput = {
  procedency: 'PROCEDENT' | 'NON_PROCEDENT' | 'CANCELLED';
  finalOpinion: string;
  resolvedAt?: string;
  closedAt?: string;
  notes?: string;
};

export const SAC_ACCEPTED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime'
] as const;

const mapCustomer = (row: any): Customer => ({
  id: row.id,
  tenantId: row.tenant_id,
  type: row.type,
  name: row.name,
  tradeName: row.trade_name || undefined,
  document: row.document,
  email: row.email || undefined,
  phone: row.phone || undefined,
  whatsapp: row.whatsapp || undefined,
  city: row.city || undefined,
  state: row.state || undefined,
  address: row.address || undefined,
  lgpdConsent: Boolean(row.lgpd_consent)
});

export const sacV43Service = {
  async getTicketTimeline(ticketId: string): Promise<TicketEvent[]> {
    const { data, error } = await supabase
      .from('ticket_events')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('occurred_at', { ascending: false });

    if (error) throw new Error(`Não foi possível carregar o histórico: ${error.message}`);

    return (data || []).map((row: any) => ({
      id: row.id,
      ticketId: row.ticket_id,
      eventType: row.event_type,
      title: row.title,
      description: row.description || undefined,
      actorName: row.actor_name || undefined,
      metadata: row.metadata || {},
      occurredAt: row.occurred_at
    }));
  },

  async getCustomer(customerId: string): Promise<Customer> {
    const { data, error } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (error || !data) throw new Error(`Não foi possível carregar o cliente: ${error?.message || ''}`);
    return mapCustomer(data);
  },

  async correctCustomer(
    customerId: string,
    ticketId: string,
    changes: CustomerCorrection,
    reason: string
  ): Promise<Customer> {
    if (!reason.trim()) throw new Error('Informe o motivo da correção cadastral.');
    const { data, error } = await supabase.rpc('update_customer_controlled', {
      p_customer_id: customerId,
      p_ticket_id: ticketId,
      p_changes: changes,
      p_reason: reason.trim()
    });
    if (error || !data) throw new Error(`Não foi possível corrigir o cliente: ${error?.message || ''}`);
    return mapCustomer(data);
  },

  async getTicketCosts(ticketId: string): Promise<TicketCost[]> {
    const { data, error } = await supabase
      .from('ticket_costs')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Não foi possível carregar os custos: ${error.message}`);

    return (data || []).map((row: any) => ({
      id: row.id,
      ticketId: row.ticket_id,
      costType: row.cost_type,
      description: row.description,
      amount: Number(row.amount || 0),
      invoiceNumber: row.invoice_number || undefined,
      supplierName: row.supplier_name || undefined,
      occurredAt: row.occurred_at,
      notes: row.notes || undefined,
      createdByName: row.created_by_name || undefined,
      createdAt: row.created_at
    }));
  },

  async createTicketCost(
    ticket: Ticket,
    input: Omit<TicketCost, 'id' | 'ticketId' | 'createdAt' | 'createdByName'>,
    user: UserProfile
  ): Promise<TicketCost> {
    const { data, error } = await supabase
      .from('ticket_costs')
      .insert({
        tenant_id: ticket.tenantId,
        ticket_id: ticket.id,
        cost_type: input.costType,
        description: input.description.trim(),
        amount: input.amount,
        invoice_number: input.invoiceNumber || null,
        supplier_name: input.supplierName || null,
        occurred_at: input.occurredAt,
        notes: input.notes || null,
        created_by: user.id,
        created_by_name: user.fullName
      })
      .select()
      .single();

    if (error || !data) throw new Error(`Não foi possível registrar o custo: ${error?.message || ''}`);

    return {
      id: data.id,
      ticketId: data.ticket_id,
      costType: data.cost_type,
      description: data.description,
      amount: Number(data.amount || 0),
      invoiceNumber: data.invoice_number || undefined,
      supplierName: data.supplier_name || undefined,
      occurredAt: data.occurred_at,
      notes: data.notes || undefined,
      createdByName: data.created_by_name || undefined,
      createdAt: data.created_at
    };
  },

  async closeTicket(ticketId: string, input: CloseTicketInput): Promise<void> {
    if (!input.finalOpinion.trim()) throw new Error('O parecer final é obrigatório para encerrar o SAC.');
    const { error } = await supabase.rpc('close_ticket_controlled', {
      p_ticket_id: ticketId,
      p_procedency: input.procedency,
      p_final_opinion: input.finalOpinion.trim(),
      p_resolved_at: input.resolvedAt || null,
      p_closed_at: input.closedAt || new Date().toISOString(),
      p_notes: input.notes || null
    });
    if (error) throw new Error(`Não foi possível encerrar o SAC: ${error.message}`);
  },

  validateAttachment(file: File): void {
    const allowed = SAC_ACCEPTED_ATTACHMENT_MIME_TYPES.includes(file.type as any);
    if (!allowed) throw new Error(`Formato não permitido: ${file.name} (${file.type || 'tipo desconhecido'}).`);
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) throw new Error(`O arquivo ${file.name} excede o limite de 25 MB.`);
  }
};
