import { supabase } from '../lib/supabase';
import type { Ticket, TicketQualificationStage, UserProfile } from '../types';

export type ProtocolEvolutionInput = {
  title: string;
  description: string;
  stage?: TicketQualificationStage;
  nextAction?: string;
  dueAt?: string;
  contactChannel?: string;
  externalParty?: string;
  internal?: boolean;
};

export type ProcessCostInput = {
  costType: string;
  description: string;
  amount: number;
  quantity?: number;
  unitAmount?: number;
  invoiceNumber?: string;
  supplierName?: string;
  costCenter?: string;
  responsibleArea?: string;
  documentReference?: string;
  occurredAt: string;
  notes?: string;
  approvalStatus?: 'REGISTERED'|'PENDING_APPROVAL'|'APPROVED'|'REJECTED';
  reimbursable?: boolean;
  recoveredAmount?: number;
};

export type ProcessCost = ProcessCostInput & {
  id: string;
  createdByName?: string;
  createdAt: string;
};

export type CostSummary = {
  grossCost: number;
  recoveredAmount: number;
  netCost: number;
  costEntries: number;
};

export const sacV46Service = {
  async registerEvolution(ticketId: string, input: ProtocolEvolutionInput): Promise<string> {
    const { data, error } = await supabase.rpc('register_ticket_evolution', {
      p_ticket_id: ticketId,
      p_title: input.title.trim(),
      p_description: input.description.trim(),
      p_stage: input.stage || null,
      p_next_action: input.nextAction?.trim() || null,
      p_due_at: input.dueAt || null,
      p_contact_channel: input.contactChannel || null,
      p_external_party: input.externalParty?.trim() || null,
      p_internal: Boolean(input.internal)
    });
    if (error) throw new Error(`Não foi possível registrar a evolução: ${error.message}`);
    return String(data || '');
  },

  async getCosts(ticketId: string): Promise<ProcessCost[]> {
    const { data, error } = await supabase.from('ticket_costs').select('*').eq('ticket_id', ticketId)
      .order('occurred_at', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw new Error(`Não foi possível carregar os custos: ${error.message}`);
    return (data || []).map((row:any) => ({
      id: row.id,
      costType: row.cost_type,
      description: row.description,
      amount: Number(row.amount || 0),
      quantity: Number(row.quantity || 1),
      unitAmount: row.unit_amount == null ? undefined : Number(row.unit_amount),
      invoiceNumber: row.invoice_number || undefined,
      supplierName: row.supplier_name || undefined,
      costCenter: row.cost_center || undefined,
      responsibleArea: row.responsible_area || undefined,
      documentReference: row.document_reference || undefined,
      occurredAt: row.occurred_at,
      notes: row.notes || undefined,
      approvalStatus: row.approval_status || 'REGISTERED',
      reimbursable: Boolean(row.reimbursable),
      recoveredAmount: Number(row.recovered_amount || 0),
      createdByName: row.created_by_name || undefined,
      createdAt: row.created_at
    }));
  },

  async createCost(ticket: Ticket, user: UserProfile, input: ProcessCostInput): Promise<void> {
    if (!input.description.trim()) throw new Error('Informe a descrição do custo.');
    if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error('Informe um valor de custo válido.');
    const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
    const unitAmount = input.unitAmount != null ? input.unitAmount : input.amount / quantity;
    const { error } = await supabase.from('ticket_costs').insert({
      tenant_id: ticket.tenantId,
      ticket_id: ticket.id,
      cost_type: input.costType,
      description: input.description.trim(),
      amount: input.amount,
      quantity,
      unit_amount: unitAmount,
      invoice_number: input.invoiceNumber?.trim() || null,
      supplier_name: input.supplierName?.trim() || null,
      cost_center: input.costCenter?.trim() || null,
      responsible_area: input.responsibleArea?.trim() || null,
      document_reference: input.documentReference?.trim() || null,
      occurred_at: input.occurredAt,
      notes: input.notes?.trim() || null,
      approval_status: input.approvalStatus || 'REGISTERED',
      reimbursable: Boolean(input.reimbursable),
      recovered_amount: input.recoveredAmount || 0,
      created_by: user.id,
      created_by_name: user.fullName
    });
    if (error) throw new Error(`Não foi possível registrar o custo: ${error.message}`);
  },

  async getCostSummary(ticketId: string): Promise<CostSummary> {
    const { data, error } = await supabase.from('sac_cost_summary').select('gross_cost,recovered_amount,net_cost,cost_entries')
      .eq('ticket_id', ticketId).maybeSingle();
    if (error) throw new Error(`Não foi possível consolidar os custos: ${error.message}`);
    return {
      grossCost: Number(data?.gross_cost || 0),
      recoveredAmount: Number(data?.recovered_amount || 0),
      netCost: Number(data?.net_cost || 0),
      costEntries: Number(data?.cost_entries || 0)
    };
  }
};
