import { supabase } from '../lib/supabase';
import type { Ticket } from '../types';
import { sacV46Service, type ProcessCost } from './sacV46Service';
import { sacV43Service, type TicketEvent } from './sacV43Service';

export type ProtocolExecutiveSnapshot = {
  events: TicketEvent[];
  costs: ProcessCost[];
  grossCost: number;
  recoveredAmount: number;
  netCost: number;
  pendingActions: Array<{ title: string; nextAction: string; dueAt?: string; actorName?: string }>;
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const sacV47Service = {
  async getExecutiveSnapshot(ticketId: string): Promise<ProtocolExecutiveSnapshot> {
    const [events, costs, summary] = await Promise.all([
      sacV43Service.getTicketTimeline(ticketId),
      sacV46Service.getCosts(ticketId),
      sacV46Service.getCostSummary(ticketId)
    ]);
    const pendingActions = events
      .filter(event => event.eventType === 'PROTOCOL_EVOLUTION' && typeof event.metadata?.next_action === 'string' && event.metadata.next_action)
      .map(event => ({
        title: event.title,
        nextAction: String(event.metadata.next_action),
        dueAt: typeof event.metadata?.due_at === 'string' ? event.metadata.due_at : undefined,
        actorName: event.actorName
      }));
    return { events, costs, grossCost: summary.grossCost, recoveredAmount: summary.recoveredAmount, netCost: summary.netCost, pendingActions };
  },

  buildCostCsv(ticket: Ticket, snapshot: ProtocolExecutiveSnapshot): string {
    const header = ['Protocolo','Data','Tipo','Descrição','Quantidade','Valor total','Valor recuperado','Custo líquido','NF/Documento','Fornecedor','Centro de custo','Área responsável','Status','Responsável'];
    const rows = snapshot.costs.map(cost => [
      ticket.protocol,cost.occurredAt,cost.costType,cost.description,cost.quantity || 1,cost.amount,cost.recoveredAmount || 0,
      cost.amount - (cost.recoveredAmount || 0),cost.invoiceNumber || '',cost.supplierName || '',cost.costCenter || '',cost.responsibleArea || '',cost.approvalStatus || '',cost.createdByName || ''
    ]);
    return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(';')).join('\n');
  }
};
