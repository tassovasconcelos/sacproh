import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins=new Set(['https://apps.sactrial.gritnews.com.br']);
try{const configured=Deno.env.get('PUBLIC_SITE_URL');if(configured)allowedOrigins.add(new URL(configured).origin);}catch{/* configuração inválida não amplia o CORS */}
const allowedStatuses=new Set(['NEW','QUALIFYING','DEMO_SCHEDULED','TRIAL_APPROVED','TRIAL_ACTIVE','TRIAL_REVIEW','WON','LOST','DISQUALIFIED']);
const headers={'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const response=(origin:string,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Access-Control-Allow-Origin':origin,'Content-Type':'application/json','Cache-Control':'no-store'}});
const clean=(value:unknown,max:number)=>String(value||'').trim().slice(0,max);

async function findInvitedUser(admin: ReturnType<typeof createClient>, email: string, tenantId: string) {
  for(let page=1;page<=20;page+=1){
    const {data,error}=await admin.auth.admin.listUsers({page,perPage:100});if(error)throw error;
    const match=data.users.find(candidate=>candidate.email?.toLowerCase()===email.toLowerCase());
    if(match){if(match.user_metadata?.tenant_id!==tenantId)throw new Error('O e-mail já possui outro cadastro de acesso.');return match;}
    if(data.users.length<100)break;
  }
  return null;
}
async function notifyCommercial(subject:string,text:string,key:string){const apiKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('COMMERCIAL_ALERT_FROM');if(!apiKey||!from)return;const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':key,'User-Agent':'sac4-commercial-alerts/1.0'},body:JSON.stringify({from,to:[Deno.env.get('COMMERCIAL_ALERT_TO')||'gritsolucoes@gmail.com'],subject,text,reply_to:'gritsolucoes@gmail.com'})});if(!result.ok)console.error('Falha no alerta comercial',result.status,await result.text());}

Deno.serve(async req=>{
  const origin=req.headers.get('origin')||'';
  if(!allowedOrigins.has(origin))return response('null',{error:'Origem não autorizada.'},403);
  if(req.method==='OPTIONS')return new Response('ok',{headers:{...headers,'Access-Control-Allow-Origin':origin}});
  if(req.method!=='POST')return response(origin,{error:'Método não permitido.'},405);
  try{
    const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
    const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user}}=await auth.auth.getUser(token);
    if(!user?.email)return response(origin,{error:'Sessão inválida.'},401);
    const allowedEmails=new Set((Deno.env.get('COMMERCIAL_ADMIN_EMAILS')||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean));
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:profile}=await admin.from('profiles').select('role_code,is_active').eq('id',user.id).maybeSingle();
    if(!profile?.is_active||profile.role_code!=='SUPERADMIN'||!allowedEmails.has(user.email.toLowerCase()))return response(origin,{error:'Acesso comercial não autorizado.'},403);
    const body=await req.json();
    if(body.action==='platform_overview'){
      const since30=new Date(Date.now()-30*86400000).toISOString();
      const [{data:trials,error:trialsError},{data:subscriptions,error:subscriptionsError},{data:orders,error:ordersError},{data:alerts,error:alertsError},{data:profiles,error:profilesError},{data:usage,error:usageError},{data:authUsers,error:authUsersError},{data:riskCases,error:riskError},{data:riskActions,error:riskActionsError},{data:salesVolumes,error:salesError},{data:ticketVolumes,error:ticketError}]=await Promise.all([
        admin.from('commercial_trial_requests').select('id,status,created_at,trial_ends_at,company_name,work_email,segment,provisioned_tenant_id').order('created_at',{ascending:false}).limit(200),
        admin.from('tenant_subscriptions').select('id,tenant_id,status,seat_limit,trial_ends_at,current_period_end,billing_email,tenant:tenants(name,trade_name,document,is_active),plan:saas_plans(code,name,included_seats)').order('updated_at',{ascending:false}).limit(300),
        admin.from('commercial_orders').select('id,tenant_id,status,plan_code,expected_amount,currency,last_payment_status,created_at,updated_at').order('created_at',{ascending:false}).limit(200),
        admin.from('commercial_alerts').select('id,severity,alert_type,message,status,created_at,order_id').eq('status','OPEN').order('created_at',{ascending:false}).limit(100),
        admin.from('profiles').select('id,tenant_id,full_name,email,role_code,is_active,created_at,tenant:tenants(name,trade_name)').order('created_at',{ascending:false}).limit(1000),
        admin.from('platform_usage_events').select('user_id,area,event_type,occurred_at').gte('occurred_at',since30).order('occurred_at',{ascending:false}).limit(10000),
        admin.auth.admin.listUsers({page:1,perPage:1000}),
        admin.from('risk_cases').select('tenant_id,status,residual_score,regulatory_notification_required,notification_status').limit(10000),
        admin.from('risk_actions').select('tenant_id,status,when_due').limit(10000),
        admin.from('sales_volume_records').select('tenant_id,units_sold').limit(10000),
        admin.from('tickets').select('tenant_id').limit(10000),
      ]);
      const firstError=trialsError||subscriptionsError||ordersError||alertsError||profilesError||usageError||authUsersError||riskError||riskActionsError||salesError||ticketError;if(firstError)throw firstError;
      const authMap=new Map((authUsers?.users||[]).map(item=>[item.id,item]));
      const userStats=new Map<string,{area_views:number;record_events:number;last_activity_at:string|null;areas:Map<string,number>}>();
      const areaStats=new Map<string,{views:number;users:Set<string>}>();
      const active7=new Set<string>(),active30=new Set<string>();const sevenDaysAgo=Date.now()-7*86400000;
      for(const event of usage||[]){const stat=userStats.get(event.user_id)||{area_views:0,record_events:0,last_activity_at:null,areas:new Map<string,number>()};
        if(event.event_type==='AREA_VIEW'){stat.area_views++;stat.areas.set(event.area,(stat.areas.get(event.area)||0)+1);const area=areaStats.get(event.area)||{views:0,users:new Set<string>()};area.views++;area.users.add(event.user_id);areaStats.set(event.area,area);}
        if(event.event_type==='RECORD_CREATED'||event.event_type==='RECORD_UPDATED')stat.record_events++;
        if(!stat.last_activity_at||event.occurred_at>stat.last_activity_at)stat.last_activity_at=event.occurred_at;userStats.set(event.user_id,stat);active30.add(event.user_id);if(new Date(event.occurred_at).getTime()>=sevenDaysAgo)active7.add(event.user_id);}
      const enrichedUsers=(profiles||[]).map(profile=>{const stats=userStats.get(profile.id),authUser=authMap.get(profile.id);const topArea=stats?[...stats.areas.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||null:null;return{...profile,last_sign_in_at:authUser?.last_sign_in_at||null,sign_in_count:Number(authUser?.user_metadata?.sign_in_count||0),area_views:stats?.area_views||0,record_events:stats?.record_events||0,last_activity_at:stats?.last_activity_at||null,top_area:topArea};});
      const engagement={total_sessions:(usage||[]).filter(item=>item.event_type==='SESSION_START').length,total_area_views:(usage||[]).filter(item=>item.event_type==='AREA_VIEW').length,total_record_events:(usage||[]).filter(item=>item.event_type==='RECORD_CREATED'||item.event_type==='RECORD_UPDATED').length,active_users_7d:active7.size,active_users_30d:active30.size,areas:[...areaStats.entries()].map(([area,value])=>({area,views:value.views,users:value.users.size})).sort((a,b)=>b.views-a.views)};
      const tenantIds=new Set([...(riskCases||[]).map(item=>item.tenant_id),...(salesVolumes||[]).map(item=>item.tenant_id)]);
      const risks=[...tenantIds].map(tenantId=>{const tenantRisks=(riskCases||[]).filter(item=>item.tenant_id===tenantId),tenantActions=(riskActions||[]).filter(item=>item.tenant_id===tenantId),units=(salesVolumes||[]).filter(item=>item.tenant_id===tenantId).reduce((sum,item)=>sum+Number(item.units_sold||0),0),occurrences=(ticketVolumes||[]).filter(item=>item.tenant_id===tenantId).length;return{tenant_id:tenantId,open_risks:tenantRisks.filter(item=>item.status!=='CLOSED').length,critical_risks:tenantRisks.filter(item=>item.status!=='CLOSED'&&Number(item.residual_score)>=15).length,pending_notifications:tenantRisks.filter(item=>item.regulatory_notification_required&&!['SUBMITTED','ACKNOWLEDGED','CLOSED'].includes(item.notification_status)).length,overdue_actions:tenantActions.filter(item=>!['DONE','CANCELLED'].includes(item.status)&&item.when_due<new Date().toISOString().slice(0,10)).length,units_sold:units,occurrences_ppm:units?Math.round(occurrences/units*1000000):0};});
      return response(origin,{trials:trials||[],subscriptions:subscriptions||[],orders:orders||[],alerts:alerts||[],users:enrichedUsers,engagement,risks});
    }
    if(body.action==='update_platform_user'){
      const profileId=clean(body.id,40),roleCode=clean(body.roleCode,40).toUpperCase(),isActive=body.isActive;
      const assignableRoles=new Set(['DIRETORIA','RESPONSAVEL_TECNICA','TECNICO','GERENTE_LOJA','SAC','LOGISTICA','ADMIN_EMPRESA']);
      if(!/^[0-9a-f-]{36}$/i.test(profileId)||!assignableRoles.has(roleCode)||typeof isActive!=='boolean')return response(origin,{error:'Usuário, perfil ou situação inválidos.'},400);
      if(profileId===user.id)return response(origin,{error:'O superadmin não pode alterar o próprio acesso por este painel.'},409);
      const {data:target,error:targetError}=await admin.from('profiles').select('id,tenant_id,role_code,is_active,email').eq('id',profileId).single();if(targetError)throw targetError;
      if(target.role_code==='SUPERADMIN')return response(origin,{error:'Outro superadmin não pode ser alterado por este painel.'},403);
      const {data:updated,error:updateError}=await admin.from('profiles').update({role_code:roleCode,is_active:isActive}).eq('id',profileId).select('id,tenant_id,full_name,email,role_code,is_active').single();if(updateError)throw updateError;
      const {error:auditError}=await admin.from('platform_admin_actions').insert({actor_id:user.id,target_user_id:profileId,tenant_id:target.tenant_id,action:isActive?'USER_ACCESS_UPDATED':'USER_BLOCKED',details:{previous_role:target.role_code,new_role:roleCode,previous_active:target.is_active,new_active:isActive,target_email:target.email}});if(auditError)throw auditError;
      return response(origin,{item:updated});
    }
    if(body.action==='edit_platform_user'){
      const profileId=clean(body.id,40),fullName=clean(body.fullName,160),targetEmail=clean(body.email,254).toLowerCase(),roleCode=clean(body.roleCode,40).toUpperCase(),isActive=body.isActive;
      const assignableRoles=new Set(['DIRETORIA','RESPONSAVEL_TECNICA','TECNICO','GERENTE_LOJA','SAC','LOGISTICA','ADMIN_EMPRESA']);
      if(!/^[0-9a-f-]{36}$/i.test(profileId)||fullName.length<3||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)||!assignableRoles.has(roleCode)||typeof isActive!=='boolean')return response(origin,{error:'Dados do usuário inválidos.'},400);
      if(profileId===user.id)return response(origin,{error:'O superadmin não pode editar o próprio cadastro neste painel.'},409);
      const {data:target,error:targetError}=await admin.from('profiles').select('id,tenant_id,full_name,email,role_code,is_active').eq('id',profileId).single();if(targetError)throw targetError;
      if(target.role_code==='SUPERADMIN')return response(origin,{error:'Outro superadmin não pode ser alterado por este painel.'},403);
      if(target.email.toLowerCase()!==targetEmail){const {error:authUpdateError}=await admin.auth.admin.updateUserById(profileId,{email:targetEmail,email_confirm:false});if(authUpdateError)throw authUpdateError;}
      const {data:updated,error:updateError}=await admin.from('profiles').update({full_name:fullName,email:targetEmail,role_code:roleCode,is_active:isActive}).eq('id',profileId).select('id,tenant_id,full_name,email,role_code,is_active').single();if(updateError)throw updateError;
      const {error:auditError}=await admin.from('platform_admin_actions').insert({actor_id:user.id,target_user_id:profileId,tenant_id:target.tenant_id,action:'USER_PROFILE_EDITED',details:{before:target,after:{full_name:fullName,email:targetEmail,role_code:roleCode,is_active:isActive}}});if(auditError)throw auditError;
      return response(origin,{item:updated});
    }
    if(body.action==='send_password_recovery'){
      const profileId=clean(body.id,40);if(!/^[0-9a-f-]{36}$/i.test(profileId)||profileId===user.id)return response(origin,{error:'Usuário inválido para recuperação.'},400);
      const {data:target,error:targetError}=await admin.from('profiles').select('id,tenant_id,email,role_code,is_active').eq('id',profileId).single();if(targetError)throw targetError;
      if(target.role_code==='SUPERADMIN')return response(origin,{error:'A recuperação de outro superadmin não é permitida neste painel.'},403);
      const redirectTo=(Deno.env.get('SAC_APP_URL')||'https://apps.sacproh.gritnews.com.br')+'/';
      const {error:resetError}=await auth.auth.resetPasswordForEmail(target.email,{redirectTo});if(resetError)throw resetError;
      const {error:auditError}=await admin.from('platform_admin_actions').insert({actor_id:user.id,target_user_id:profileId,tenant_id:target.tenant_id,action:'PASSWORD_RECOVERY_SENT',details:{target_email:target.email}});if(auditError)throw auditError;
      return response(origin,{ok:true});
    }
    if(body.action==='list'){
      let query=admin.from('commercial_trial_requests').select('*').order('created_at',{ascending:false}).limit(200);
      if(body.status&&allowedStatuses.has(body.status))query=query.eq('status',body.status);
      const {data,error}=await query;if(error)throw error;return response(origin,{items:data});
    }
    if(body.action==='list_alerts'){
      const {data,error}=await admin.from('commercial_alerts').select('id,severity,alert_type,message,status,created_at,order_id').eq('status','OPEN').order('created_at',{ascending:false}).limit(100);
      if(error)throw error;return response(origin,{items:data});
    }
    if(body.action==='list_customers'){
      const {data,error}=await admin.from('tenant_subscriptions').select('id,tenant_id,status,trial_ends_at,current_period_end,billing_email,updated_at,tenant:tenants(name,trade_name,document,is_active),plan:saas_plans(code,name,included_seats)').order('updated_at',{ascending:false}).limit(300);
      if(error)throw error;return response(origin,{items:data});
    }
    if(body.action==='update_subscription'){
      const subscriptionId=clean(body.id,40),nextStatus=clean(body.status,20),reason=clean(body.reason,1000);
      if(!/^[0-9a-f-]{36}$/i.test(subscriptionId)||!['ACTIVE','SUSPENDED','CANCELED'].includes(nextStatus)||reason.length<10)return response(origin,{error:'Assinatura, status e justificativa detalhada são obrigatórios.'},400);
      const {error:updateError}=await admin.rpc('manage_commercial_subscription',{p_subscription_id:subscriptionId,p_actor_id:user.id,p_new_status:nextStatus,p_reason:reason});if(updateError)throw updateError;
      await notifyCommercial(`[SAC 4.0] Assinatura alterada para ${nextStatus}`,`Assinatura: ${subscriptionId}\nNovo status: ${nextStatus}\nJustificativa: ${reason}\nOperador: ${user.email}`,`subscription-${subscriptionId}-${nextStatus}-${Date.now()}`);
      return response(origin,{ok:true});
    }
    if(body.action==='acknowledge_alert'){
      const alertId=clean(body.id,40);if(!/^[0-9a-f-]{36}$/i.test(alertId))return response(origin,{error:'Alerta inválido.'},400);
      const {error}=await admin.from('commercial_alerts').update({status:'ACKNOWLEDGED'}).eq('id',alertId);if(error)throw error;return response(origin,{ok:true});
    }
    if(body.action==='update'){
      const id=clean(body.id,40), status=clean(body.status,30);
      if(!/^[0-9a-f-]{36}$/i.test(id)||!allowedStatuses.has(status))return response(origin,{error:'Atualização inválida.'},400);
      const companyDocument=clean(body.companyDocument,30).replace(/\D/g,'');
      if(companyDocument&&companyDocument.length!==14)return response(origin,{error:'O CNPJ deve conter 14 dígitos.'},400);
      const patch:Record<string,unknown>={status,company_document:companyDocument||null,qualification_notes:clean(body.qualificationNotes,3000)||null,loss_reason:clean(body.lossReason,500)||null,assigned_to:user.id,updated_at:new Date().toISOString()};
      if(status==='TRIAL_ACTIVE')patch.trial_starts_at=new Date().toISOString(),patch.trial_ends_at=new Date(Date.now()+15*86400000).toISOString();
      const {data,error}=await admin.from('commercial_trial_requests').update(patch).eq('id',id).select('*').single();if(error)throw error;return response(origin,{item:data});
    }
    if(body.action==='provision'){
      const id=clean(body.id,40);if(!/^[0-9a-f-]{36}$/i.test(id))return response(origin,{error:'Solicitação inválida.'},400);
      const {data:trial,error:trialError}=await admin.from('commercial_trial_requests').select('id,company_name,contact_name,work_email,status,provisioned_tenant_id').eq('id',id).single();if(trialError)throw trialError;
      const {data:result,error:provisionError}=await admin.rpc('provision_commercial_trial',{p_request_id:id,p_actor_id:user.id});if(provisionError)throw provisionError;
      const tenantId=String(result.tenantId);let adminUserId='';
      const {data:existingProfile}=await admin.from('profiles').select('id,tenant_id').ilike('email',trial.work_email).maybeSingle();
      if(existingProfile){if(existingProfile.tenant_id!==tenantId)throw new Error('O e-mail administrador já pertence a outra empresa.');adminUserId=existingProfile.id;}
      if(!adminUserId){
        const redirectTo=(Deno.env.get('SAC_APP_URL')||'https://apps.sacproh.gritnews.com.br')+'/';
        const {data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(trial.work_email,{redirectTo,data:{full_name:trial.contact_name,tenant_id:tenantId}});
        const invitedUser=invited.user||(inviteError?await findInvitedUser(admin,trial.work_email,tenantId):null);
        if(!invitedUser)throw inviteError||new Error('Convite não criado.');adminUserId=invitedUser.id;
        const {error:profileError}=await admin.from('profiles').upsert({id:adminUserId,tenant_id:tenantId,full_name:trial.contact_name,email:trial.work_email,role_code:'ADMIN_EMPRESA',is_active:true},{onConflict:'id'});if(profileError)throw profileError;
      }
      const {error:linkError}=await admin.from('commercial_trial_requests').update({provisioned_admin_id:adminUserId,updated_at:new Date().toISOString()}).eq('id',id);if(linkError)throw linkError;
      await notifyCommercial(`[SAC 4.0] Trial ativado: ${trial.company_name}`,`Empresa: ${trial.company_name}\nAdministrador: ${trial.contact_name} <${trial.work_email}>\nTenant: ${tenantId}\nTrial de 15 dias e 1 usuário provisionado.`,`provision-${id}`);
      return response(origin,{tenantId,adminEmail:trial.work_email},201);
    }
    if(body.action==='prepare_order'){
      const id=clean(body.id,40),contractReference=clean(body.contractEvidenceReference,300),contractVersion=clean(body.contractVersion,80);
      if(!/^[0-9a-f-]{36}$/i.test(id)||!contractReference||!contractVersion)return response(origin,{error:'Informe a evidência e a versão do contrato assinado.'},400);
      const {data:trial,error:trialError}=await admin.from('commercial_trial_requests').select('id,work_email,company_document,plan_interest,provisioned_tenant_id,status').eq('id',id).single();if(trialError)throw trialError;
      if(!trial.provisioned_tenant_id||!['TRIAL_ACTIVE','TRIAL_REVIEW','WON'].includes(trial.status))return response(origin,{error:'O trial precisa estar provisionado antes do pedido anual.'},409);
      if(!['START','PRO','ENTERPRISE'].includes(trial.plan_interest))return response(origin,{error:'Defina o plano anual antes de preparar o pedido.'},400);
      const totals:Record<string,number>={START:6878,PRO:15938,ENTERPRISE:32978};
      const {data:existing}=await admin.from('commercial_orders').select('id,status,checkout_token').eq('trial_request_id',id).maybeSingle();
      if(existing?.status==='PAID')return response(origin,{error:'Este pedido já foi pago.'},409);
      const site=(Deno.env.get('PUBLIC_SITE_URL')||'https://apps.sactrial.gritnews.com.br').replace(/\/$/,'');
      if(existing?.status==='PAYMENT_PENDING')return response(origin,{paymentLink:`${site}/?order=${existing.checkout_token}`});
      if(existing&&existing.status!=='APPROVED')return response(origin,{error:'O pedido está em revisão e não pode ser recriado.'},409);
      const values={trial_request_id:id,tenant_id:trial.provisioned_tenant_id,plan_code:trial.plan_interest,company_document:trial.company_document,buyer_email:trial.work_email,
        contract_evidence_reference:contractReference,contract_version:contractVersion,contract_accepted_at:new Date().toISOString(),contract_confirmed_by:user.id,
        expected_amount:totals[trial.plan_interest],currency:'BRL',status:'APPROVED',updated_at:new Date().toISOString()};
      const {data:order,error:orderError}=existing
        ?await admin.from('commercial_orders').update(values).eq('id',existing.id).select('checkout_token').single()
        :await admin.from('commercial_orders').insert(values).select('checkout_token').single();
      if(orderError)throw orderError;
      return response(origin,{paymentLink:`${site}/?order=${order.checkout_token}`},201);
    }
    return response(origin,{error:'Ação inválida.'},400);
  }catch(error){console.error('manage-trials',error instanceof Error?error.message:error);return response(origin,{error:'Não foi possível processar o funil.'},500);}
});
