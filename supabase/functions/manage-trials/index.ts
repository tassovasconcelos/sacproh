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
    if(body.action==='list'){
      let query=admin.from('commercial_trial_requests').select('*').order('created_at',{ascending:false}).limit(200);
      if(body.status&&allowedStatuses.has(body.status))query=query.eq('status',body.status);
      const {data,error}=await query;if(error)throw error;return response(origin,{items:data});
    }
    if(body.action==='update'){
      const id=clean(body.id,40), status=clean(body.status,30);
      if(!/^[0-9a-f-]{36}$/i.test(id)||!allowedStatuses.has(status))return response(origin,{error:'Atualização inválida.'},400);
      const companyDocument=clean(body.companyDocument,30).replace(/\D/g,'');
      if(companyDocument&&companyDocument.length!==14)return response(origin,{error:'O CNPJ deve conter 14 dígitos.'},400);
      const patch:Record<string,unknown>={status,company_document:companyDocument||null,qualification_notes:clean(body.qualificationNotes,3000)||null,loss_reason:clean(body.lossReason,500)||null,assigned_to:user.id,updated_at:new Date().toISOString()};
      if(status==='TRIAL_ACTIVE')patch.trial_starts_at=new Date().toISOString(),patch.trial_ends_at=new Date(Date.now()+30*86400000).toISOString();
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
        const {error:profileError}=await admin.from('profiles').upsert({id:adminUserId,tenant_id:tenantId,full_name:trial.contact_name,email:trial.work_email,role_code:'SUPERADMIN',is_active:true},{onConflict:'id'});if(profileError)throw profileError;
      }
      const {error:linkError}=await admin.from('commercial_trial_requests').update({provisioned_admin_id:adminUserId,updated_at:new Date().toISOString()}).eq('id',id);if(linkError)throw linkError;
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
