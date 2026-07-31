
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
  if (req.method === 'OPTIONS') return new Response('ok',{headers:cors});
  try {
    const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token=req.headers.get('Authorization') || '';
    const caller=createClient(url,anon,{global:{headers:{Authorization:token}}});
    const admin=createClient(url,service);
    const {data:{user}}=await caller.auth.getUser();
    if(!user) throw new Error('Sessão inválida.');
    const {data:profile}=await admin.from('profiles').select('tenant_id,role_code').eq('id',user.id).single();
    if(!profile || !['SUPERADMIN','ADMIN_EMPRESA'].includes(profile.role_code)) throw new Error('Sem permissão para convidar usuários.');
    const body=await req.json();
    const redirectTo='https://gritnews.com.br/sacproh/';
    const {data:invited,error}=await admin.auth.admin.inviteUserByEmail(body.email,{redirectTo,data:{full_name:body.fullName}});
    if(error) throw error;
    const {data:saved,error:saveError}=await admin.from('profiles').upsert({id:invited.user.id,tenant_id:profile.tenant_id,
      full_name:body.fullName,email:body.email,phone:body.phone || null,job_title:body.jobTitle || null,
      department:body.department || null,role_code:body.roleCode,is_active:true}).select().single();
    if(saveError) throw saveError;
    return new Response(JSON.stringify({profile:saved}),{headers:{...cors,'Content-Type':'application/json'}});
  } catch(error) {
    return new Response(JSON.stringify({error:error instanceof Error?error.message:'Erro no convite'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
  }
});

