import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
  if (req.method === 'OPTIONS') return new Response('ok',{headers:cors});
  try {
    const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token=(req.headers.get('Authorization') || '').replace(/^Bearer\s+/i,'').trim();
    if(!token) throw new Error('Sessão não enviada. Entre novamente no sistema.');
    const admin=createClient(url,service);
    const {data:{user},error:authError}=await admin.auth.getUser(token);
    if(authError || !user) throw new Error('Sessão expirada. Saia e entre novamente no sistema.');
    const {data:profile}=await admin.from('profiles').select('tenant_id,role_code').eq('id',user.id).single();
    if(!profile || !['SUPERADMIN','ADMIN_EMPRESA'].includes(profile.role_code)) throw new Error('Sem permissão para convidar usuários.');
    const body=await req.json();
    const email=String(body.email || '').trim().toLowerCase();
    if(!email || !body.fullName || !body.roleCode) throw new Error('Nome, e-mail e perfil são obrigatórios.');
    const redirectTo='https://gritnews.com.br/sacproh/';
    let userId='';
    let invitationSent=false;
    const {data:listed,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
    if(listError) throw listError;
    const existing=listed.users.find(candidate=>candidate.email?.toLowerCase()===email);
    if(existing){
      userId=existing.id;
    }else{
      const {data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo,data:{full_name:body.fullName}});
      if(inviteError || !invited?.user?.id) throw inviteError || new Error('Convite não retornou um usuário.');
      userId=invited.user.id;
      invitationSent=true;
    }
    const {data:saved,error:saveError}=await admin.from('profiles').upsert({id:userId,tenant_id:profile.tenant_id,
      full_name:body.fullName,email,phone:body.phone || null,job_title:body.jobTitle || null,
      department:body.department || null,role_code:body.roleCode,is_active:true}).select().single();
    if(saveError) throw saveError;
    return new Response(JSON.stringify({profile:saved,invitationSent,alreadyExisted:!invitationSent}),{headers:{...cors,'Content-Type':'application/json'}});
  } catch(error) {
    console.error('invite-user:',error);
    return new Response(JSON.stringify({error:error instanceof Error?error.message:'Erro no convite'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
  }
});
