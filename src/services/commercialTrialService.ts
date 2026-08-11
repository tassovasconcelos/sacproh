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
export type CommercialCustomer={id:string;tenant_id:string;status:'TRIAL'|'ACTIVE'|'PAST_DUE'|'SUSPENDED'|'CANCELED';seat_limit?:number|null;trial_ends_at?:string|null;current_period_end:string;billing_email?:string|null;updated_at:string;tenant:{name:string;trade_name?:string|null;document:string;is_active:boolean};plan:{code:string;name:string;included_seats:number}};
export type PlatformUser={id:string;tenant_id:string;full_name:string;email:string;role_code:string;is_active:boolean;created_at:string;last_sign_in_at?:string|null;sign_in_count?:number;area_views?:number;record_events?:number;last_activity_at?:string|null;top_area?:string|null;tenant?:{name:string;trade_name?:string|null}|null};
export type UsageArea={area:string;views:number;users:number};
export type PlatformEngagement={total_sessions:number;total_area_views:number;total_record_events:number;active_users_7d:number;active_users_30d:number;areas:UsageArea[]};
export type PlatformOrder={id:string;tenant_id:string;status:string;plan_code:string;expected_amount:number;currency:string;last_payment_status?:string|null;created_at:string;updated_at:string};
export type PlatformOverview={trials:CommercialTrial[];subscriptions:CommercialCustomer[];orders:PlatformOrder[];alerts:CommercialAlert[];users:PlatformUser[];engagement:PlatformEngagement};

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
  async platformOverview(){return invoke({action:'platform_overview'}) as Promise<PlatformOverview>;},
  async updatePlatformUser(id:string,roleCode:string,isActive:boolean){const data=await invoke({action:'update_platform_user',id,roleCode,isActive});return data.item as PlatformUser;},
  async editPlatformUser(id:string,fullName:string,email:string,roleCode:string,isActive:boolean){const data=await invoke({action:'edit_platform_user',id,fullName,email,roleCode,isActive});return data.item as PlatformUser;},
  async sendPasswordRecovery(id:string){await invoke({action:'send_password_recovery',id});},
};
