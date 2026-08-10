import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins=new Set(['https://apps.sactrial.gritnews.com.br']);
const allowedStatuses=new Set(['NEW','QUALIFYING','DEMO_SCHEDULED','TRIAL_APPROVED','TRIAL_ACTIVE','TRIAL_REVIEW','WON','LOST','DISQUALIFIED']);
const headers={'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const response=(origin:string,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Access-Control-Allow-Origin':origin,'Content-Type':'application/json','Cache-Control':'no-store'}});
const clean=(value:unknown,max:number)=>String(value||'').trim().slice(0,max);

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
      const patch:Record<string,unknown>={status,qualification_notes:clean(body.qualificationNotes,3000)||null,loss_reason:clean(body.lossReason,500)||null,assigned_to:user.id,updated_at:new Date().toISOString()};
      if(status==='TRIAL_ACTIVE')patch.trial_starts_at=new Date().toISOString(),patch.trial_ends_at=new Date(Date.now()+30*86400000).toISOString();
      const {data,error}=await admin.from('commercial_trial_requests').update(patch).eq('id',id).select('*').single();if(error)throw error;return response(origin,{item:data});
    }
    return response(origin,{error:'Ação inválida.'},400);
  }catch(error){console.error('manage-trials',error instanceof Error?error.message:error);return response(origin,{error:'Não foi possível processar o funil.'},500);}
});
