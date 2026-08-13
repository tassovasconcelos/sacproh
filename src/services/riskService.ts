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
export type TenantModule = { tenant_id: string; module_code: string; enabled: boolean; source: string; configuration: Record<string, unknown> };
export type OperationalAlert = { id: string; module_code: string; entity_type: string; entity_id?: string; severity: string; title: string; message: string; recipient_name?: string; recipient_email?: string; due_at?: string; status: string; delivery_status: string; created_at: string };
export type QuarantineCase = { id: string; ticket_id: string; risk_case_id?: string; product_id?: string; lot_number?: string; reason: string; quantity: number; location?: string; owner_name: string; due_at?: string; customer_return_required: boolean; customer_feedback?: string; status: string; created_at: string };
export type AuditOrganization = { id: string; legal_name: string; trade_name?: string; document?: string; organization_type: string; accreditation_reference?: string; contact_name?: string; contact_email?: string; active: boolean };
export type ComplianceAudit = { id: string; organization_id?: string; code: string; audit_type: string; title: string; scope: string; company_group?: string; lead_auditor?: string; responsible_profile_id?: string; start_date?: string; end_date?: string; next_audit_date?: string; status: string; conclusion?: string; created_at: string };
export type AuditDocument = { id: string; audit_id?: string; risk_case_id?: string; document_type: string; title: string; reference?: string; issuer?: string; issued_at?: string; valid_until?: string; file_name?: string; file_path?: string; mime_type?: string; status: string; responsible_profile_id?: string };

const ensure = (error: { message: string } | null) => { if (error) throw new Error(error.message); };
export const riskService = {
  async load(tenantId: string) {
    const [risks, actions, sales, samples, modules, alerts, quarantines, organizations, audits, documents] = await Promise.all([
      supabase.from('risk_cases').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      supabase.from('risk_actions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      supabase.from('sales_volume_records').select('*').eq('tenant_id', tenantId).order('period_start', { ascending: false }),
      supabase.from('audit_sampling_plans').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      supabase.from('tenant_modules').select('*').eq('tenant_id', tenantId),
      supabase.from('operational_alerts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(100),
      supabase.from('quarantine_cases').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      supabase.from('audit_organizations').select('*').eq('tenant_id', tenantId).order('legal_name'),
      supabase.from('compliance_audits').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      supabase.from('audit_documents').select('*').eq('tenant_id', tenantId).order('valid_until', { ascending: true }),
    ]);
    [risks.error, actions.error, sales.error, samples.error, modules.error, alerts.error, quarantines.error, organizations.error, audits.error, documents.error].forEach(ensure);
    return { risks: (risks.data || []) as RiskCase[], actions: (actions.data || []) as RiskAction[], sales: (sales.data || []) as SalesRecord[], samples: (samples.data || []) as SamplingPlan[], modules: (modules.data || []) as TenantModule[], alerts: (alerts.data || []) as OperationalAlert[], quarantines: (quarantines.data || []) as QuarantineCase[], organizations: (organizations.data || []) as AuditOrganization[], audits: (audits.data || []) as ComplianceAudit[], documents: (documents.data || []) as AuditDocument[] };
  },
  async openFromTicket(payload: { ticketId: string; title: string; hazard: string; harm: string; severity: number; probability: number; detectability: number; controls?: string; ownerId?: string; quarantine: boolean; quarantineReason?: string; feedbackDays: number }) {
    const { data, error } = await supabase.rpc('open_integrated_risk_case', { p_ticket: payload.ticketId, p_title: payload.title, p_hazard: payload.hazard, p_harm: payload.harm, p_severity: payload.severity, p_probability: payload.probability, p_detectability: payload.detectability, p_controls: payload.controls || null, p_owner: payload.ownerId || null, p_quarantine: payload.quarantine, p_quarantine_reason: payload.quarantineReason || null, p_feedback_days: payload.feedbackDays }); ensure(error); return data as string;
  },
  async createRisk(payload: Record<string, unknown>) { const { data, error } = await supabase.from('risk_cases').insert(payload).select('*').single(); ensure(error); return data as RiskCase; },
  async createAction(payload: Record<string, unknown>) { const { data, error } = await supabase.from('risk_actions').insert(payload).select('*').single(); ensure(error); return data as RiskAction; },
  async updateRisk(id: string, patch: Record<string, unknown>) { const { error } = await supabase.from('risk_cases').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id); ensure(error); },
  async updateQuarantine(id: string, patch: Record<string, unknown>) { const { error } = await supabase.from('quarantine_cases').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id); ensure(error); },
  async acknowledgeAlert(id: string) { const { error } = await supabase.from('operational_alerts').update({ status: 'ACKNOWLEDGED', read_at: new Date().toISOString() }).eq('id', id); ensure(error); },
  async createOrganization(payload: Record<string, unknown>) { const { data, error } = await supabase.from('audit_organizations').insert(payload).select('*').single(); ensure(error); return data as AuditOrganization; },
  async createAudit(payload: Record<string, unknown>) { const { data, error } = await supabase.from('compliance_audits').insert(payload).select('*').single(); ensure(error); return data as ComplianceAudit; },
  async createAuditDocument(payload: Record<string, unknown>, file?: File) {
    let filePath: string | null = null;
    if (file) { filePath = `${payload.tenant_id}/${payload.audit_id || 'general'}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`; const { error } = await supabase.storage.from('risk-audit-documents').upload(filePath, file, { contentType: file.type }); ensure(error); }
    const { data, error } = await supabase.from('audit_documents').insert({ ...payload, file_name: file?.name || null, file_path: filePath, mime_type: file?.type || null }).select('*').single(); ensure(error); return data as AuditDocument;
  },
  async importSales(rows: Record<string, unknown>[]) { const { error } = await supabase.from('sales_volume_records').insert(rows); ensure(error); },
  async createSample(payload: Record<string, unknown>) { const { data, error } = await supabase.from('audit_sampling_plans').insert(payload).select('*').single(); ensure(error); return data as SamplingPlan; },
  async saveSnapshot(payload: Record<string, unknown>) { const { error } = await supabase.from('risk_audit_snapshots').insert(payload); ensure(error); },
};
