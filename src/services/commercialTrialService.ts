import { supabase } from '../lib/supabase';

export type CommercialTrialStatus = 'NEW' | 'QUALIFYING' | 'DEMO_SCHEDULED' | 'TRIAL_APPROVED' | 'TRIAL_ACTIVE' | 'TRIAL_REVIEW' | 'WON' | 'LOST' | 'DISQUALIFIED';

export type CommercialTrial = {
  id: string; company_name: string; company_document?: string | null; contact_name: string; work_email: string; phone?: string | null;
  segment: string; monthly_ticket_volume: string; plan_interest: string; message?: string | null; campaign_code?: string | null; lead_source?: string | null;
  status: CommercialTrialStatus; qualification_notes?: string | null; loss_reason?: string | null;
  trial_starts_at?: string | null; trial_ends_at?: string | null; created_at: string; updated_at: string;
  provisioned_tenant_id?: string | null; provisioned_admin_id?: string | null; provisioned_at?: string | null;
};
export type CommercialAlert = { id:string; order_id?:string|null; severity:'INFO'|'WARNING'|'CRITICAL'; alert_type:string; message:string; status:string; created_at:string };
export type CommercialCustomer={id:string;tenant_id:string;status:'TRIAL'|'ACTIVE'|'PAST_DUE'|'SUSPENDED'|'CANCELED';trial_ends_at?:string|null;current_period_end:string;billing_email?:string|null;updated_at:string;tenant:{name:string;trade_name?:string|null;document:string;is_active:boolean};plan:{code:string;name:string;included_seats:number}};

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('manage-trials', { body });
  if (error) throw new Error('Não foi possível acessar o funil comercial.');
  if (data?.error) throw new Error(data.error);
  return data;
}

export const commercialTrialService = {
  async list(status?: CommercialTrialStatus) {
    const data = await invoke({ action: 'list', status });
    return (data.items || []) as CommercialTrial[];
  },
  async update(id: string, changes: { status: CommercialTrialStatus; companyDocument?: string; qualificationNotes?: string; lossReason?: string }) {
    const data = await invoke({ action: 'update', id, ...changes });
    return data.item as CommercialTrial;
  },
  async provision(id: string) {
    return invoke({ action: 'provision', id }) as Promise<{ tenantId: string; adminEmail: string }>;
  },
  async prepareOrder(id: string, contractEvidenceReference: string, contractVersion: string) {
    return invoke({ action: 'prepare_order', id, contractEvidenceReference, contractVersion }) as Promise<{ paymentLink: string }>;
  },
  async listAlerts() { const data=await invoke({action:'list_alerts'});return (data.items||[]) as CommercialAlert[]; },
  async acknowledgeAlert(id:string) { await invoke({action:'acknowledge_alert',id}); },
  async listCustomers(){const data=await invoke({action:'list_customers'});return(data.items||[]) as CommercialCustomer[];},
  async updateSubscription(id:string,status:'ACTIVE'|'SUSPENDED'|'CANCELED',reason:string){await invoke({action:'update_subscription',id,status,reason});},
};
