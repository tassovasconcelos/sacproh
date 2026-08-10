import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set(['https://apps.sactrial.gritnews.com.br']);
try { const configured = Deno.env.get('PUBLIC_SITE_URL'); if (configured) allowedOrigins.add(new URL(configured).origin); } catch { /* configuração inválida não amplia o CORS */ }
const allowedSegments = new Set(['Importador','Distribuidor','Fabricante','Indústria','Varejo','Serviços','Outro']);
const allowedVolumes = new Set(['UP_TO_100','101_TO_500','501_TO_3000','OVER_3000']);
const allowedPlans = new Set(['START','PRO','ENTERPRISE','UNDECIDED']);
const corsHeaders = { 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS' };

function json(origin: string, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers:{...corsHeaders,'Access-Control-Allow-Origin':origin,'Content-Type':'application/json','Cache-Control':'no-store'} });
}

const clean = (value: unknown, max: number) => String(value || '').trim().slice(0,max);

Deno.serve(async req => {
  const origin=req.headers.get('origin') || '';
  if(!allowedOrigins.has(origin)) return json('null',{error:'Origem não autorizada.'},403);
  if(req.method==='OPTIONS') return new Response('ok',{headers:{...corsHeaders,'Access-Control-Allow-Origin':origin}});
  if(req.method!=='POST') return json(origin,{error:'Método não permitido.'},405);
  try {
    const body=await req.json();
    if(clean(body.website,200)) return json(origin,{requestId:crypto.randomUUID(),status:'received'},201);
    const companyName=clean(body.companyName,160), contactName=clean(body.contactName,120);
    const workEmail=clean(body.workEmail,200).toLowerCase(), phone=clean(body.phone,30) || null;
    const segment=clean(body.segment,40), monthlyTicketVolume=clean(body.monthlyTicketVolume,30);
    const planInterest=clean(body.planInterest,20) || 'UNDECIDED', message=clean(body.message,1200) || null;
    if(!companyName || !contactName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) return json(origin,{error:'Empresa, contato e e-mail profissional são obrigatórios.'},400);
    if(!allowedSegments.has(segment) || !allowedVolumes.has(monthlyTicketVolume) || !allowedPlans.has(planInterest)) return json(origin,{error:'Dados de qualificação inválidos.'},400);
    if(body.acceptedPrivacy!==true) return json(origin,{error:'O consentimento de privacidade é obrigatório.'},400);

    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const since=new Date(Date.now()-24*60*60*1000).toISOString();
    const {count,error:countError}=await admin.from('commercial_trial_requests').select('id',{count:'exact',head:true}).eq('work_email',workEmail).gte('created_at',since);
    if(countError) throw countError;
    if((count || 0)>=2) return json(origin,{error:'Já recebemos sua solicitação. Aguarde o contato da equipe comercial.'},429);

    const {data,error}=await admin.from('commercial_trial_requests').insert({company_name:companyName,contact_name:contactName,work_email:workEmail,phone,segment,
      monthly_ticket_volume:monthlyTicketVolume,plan_interest:planInterest,message,privacy_consent_at:new Date().toISOString()}).select('id,status').single();
    if(error) throw error;
    return json(origin,{requestId:data.id,status:data.status},201);
  } catch(error) {
    console.error('request-trial',error instanceof Error?error.message:error);
    return json(origin,{error:'Não foi possível registrar a solicitação.'},500);
  }
});
