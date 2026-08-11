import { supabase } from '../lib/supabase';

export type RiskCase = {
  id: string; tenant_id: string; code: string; ticket_id?: string; product_id?: string; lot_number?: string;
  source: string; title: string; hazard: string; hazardous_situation?: string; harm: string;
  severity: number; probability: number; detectability: number; initial_score: number; controls?: string;
  residual_score: number; status: string; regulatory_notification_required: boolean; notification_authority?: string;
  notification_status: string; notification_deadline?: string; notification_reference?: string; recurrence_count: number;
  predictive_signal?: string; effectiveness_status: string; owner_name?: string; next_review_at?: string; created_at: string;
};
export type RiskAction = { id: string; risk_case_id: string; action_type: string; what_action: string; why_action: string; where_action?: string; when_due: string; who_name: string; how_action: string; how_much?: number; status: string; effectiveness_criterion: string; effectiveness_result?: string; root_cause?: string };
export type SalesRecord = { id: string; period_start: string; period_end: string; sku: string; product_name: string; lot_number?: string; units_sold: number; customers_count: number; revenue?: number };
export type SamplingPlan = { id: string; code: string; audit_type: string; scope: string; population_size: number; sampling_method: string; sample_size: number; acceptance_number: number; rejection_number: number; rationale: string; status: string; audit_date?: string };

const ensure = (error: { message: string } | null) => { if (error) throw new Error(error.message); };
export const riskService = {
  async load(tenantId: string) {
    const [risks, actions, sales, samples] = await Promise.all([
      supabase.from('risk_cases').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      supabase.from('risk_actions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      supabase.from('sales_volume_records').select('*').eq('tenant_id', tenantId).order('period_start', { ascending: false }),
      supabase.from('audit_sampling_plans').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    ]);
    [risks.error, actions.error, sales.error, samples.error].forEach(ensure);
    return { risks: (risks.data || []) as RiskCase[], actions: (actions.data || []) as RiskAction[], sales: (sales.data || []) as SalesRecord[], samples: (samples.data || []) as SamplingPlan[] };
  },
  async createRisk(payload: Record<string, unknown>) { const { data, error } = await supabase.from('risk_cases').insert(payload).select('*').single(); ensure(error); return data as RiskCase; },
  async createAction(payload: Record<string, unknown>) { const { data, error } = await supabase.from('risk_actions').insert(payload).select('*').single(); ensure(error); return data as RiskAction; },
  async updateRisk(id: string, patch: Record<string, unknown>) { const { error } = await supabase.from('risk_cases').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id); ensure(error); },
  async importSales(rows: Record<string, unknown>[]) { const { error } = await supabase.from('sales_volume_records').insert(rows); ensure(error); },
  async createSample(payload: Record<string, unknown>) { const { data, error } = await supabase.from('audit_sampling_plans').insert(payload).select('*').single(); ensure(error); return data as SamplingPlan; },
  async saveSnapshot(payload: Record<string, unknown>) { const { error } = await supabase.from('risk_audit_snapshots').insert(payload); ensure(error); },
};
