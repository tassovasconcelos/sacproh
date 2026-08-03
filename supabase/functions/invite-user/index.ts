import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://gritnews.com.br',
  'https://www.gritnews.com.br',
  'https://apps.sacproh.gritnews.com.br',
]);

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') || '';
  if (origin && !allowedOrigins.has(origin)) {
    return new Response(JSON.stringify({ error: 'Origem não autorizada.' }), {
      status: 403, headers: { 'Content-Type': 'application/json', Vary: 'Origin' },
    });
  }
  const cors = {
    'Access-Control-Allow-Origin': origin || 'https://apps.sacproh.gritnews.com.br',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Método não permitido.' }), {
    status: 405, headers: { ...cors, 'Content-Type': 'application/json', Allow: 'POST' },
  });

  let invitedUserId = '';
  let invitationSent = false;
  let admin: ReturnType<typeof createClient> | null = null;
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new Error('Sessão não enviada. Entre novamente no sistema.');
    admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error('Sessão expirada. Saia e entre novamente no sistema.');

    const { data: caller } = await admin.from('profiles').select('tenant_id,role_code,is_active').eq('id', user.id).single();
    if (!caller?.is_active || !['SUPERADMIN', 'ADMIN_EMPRESA'].includes(caller.role_code)) {
      throw new Error('Sem permissão para convidar usuários.');
    }

    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.fullName || '').trim();
    const roleCode = String(body.roleCode || '').trim().toUpperCase();
    const assignableRoles = new Set(['DIRETORIA', 'RESPONSAVEL_TECNICA', 'TECNICO', 'GERENTE_LOJA', 'SAC', 'LOGISTICA', 'ADMIN_EMPRESA']);
    if (caller.role_code === 'SUPERADMIN') assignableRoles.add('SUPERADMIN');
    if (!/^\S+@\S+\.\S+$/.test(email) || !fullName || fullName.length > 180 || !assignableRoles.has(roleCode)) {
      throw new Error('Dados do usuário ou perfil inválidos.');
    }

    const { data: subscription } = await admin.from('tenant_subscriptions')
      .select('status,current_period_end,trial_ends_at,seat_limit,plan:saas_plans(included_seats)')
      .eq('tenant_id', caller.tenant_id).maybeSingle();
    const now = Date.now();
    const plan = (Array.isArray(subscription?.plan) ? subscription?.plan[0] : subscription?.plan) as { included_seats?: number } | null;
    const usable = subscription && ['ACTIVE', 'TRIAL'].includes(subscription.status)
      && new Date(subscription.current_period_end).getTime() > now
      && (subscription.status !== 'TRIAL' || !subscription.trial_ends_at || new Date(subscription.trial_ends_at).getTime() > now);
    if (!usable) throw new Error('Assinatura inativa ou vencida.');

    const limit = subscription.seat_limit || plan?.included_seats || 0;
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true })
      .eq('tenant_id', caller.tenant_id).eq('is_active', true);
    if (limit && (count || 0) >= limit) throw new Error('Limite de usuários ativos do plano atingido.');

    const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    const existing = listed.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (existing) {
      invitedUserId = existing.id;
      const { data: existingProfile } = await admin.from('profiles').select('tenant_id').eq('id', existing.id).maybeSingle();
      if (existingProfile && existingProfile.tenant_id !== caller.tenant_id) {
        throw new Error('Não foi possível vincular este e-mail. Contate o suporte da plataforma.');
      }
    } else {
      const redirectTo = Deno.env.get('APP_URL') || 'https://apps.sacproh.gritnews.com.br/';
      const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { full_name: fullName } });
      if (error || !invited?.user?.id) throw error || new Error('Convite não retornou um usuário.');
      invitedUserId = invited.user.id;
      invitationSent = true;
    }

    const { data: saved, error: saveError } = await admin.from('profiles').upsert({
      id: invitedUserId, tenant_id: caller.tenant_id, full_name: fullName, email,
      phone: String(body.phone || '').trim().slice(0, 40) || null,
      job_title: String(body.jobTitle || '').trim().slice(0, 120) || null,
      department: String(body.department || '').trim().slice(0, 120) || null,
      role_code: roleCode, is_active: true,
    }, { onConflict: 'id' }).select().single();
    if (saveError) throw saveError;
    return new Response(JSON.stringify({ profile: saved, invitationSent, alreadyExisted: !invitationSent }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (invitationSent && invitedUserId && admin) await admin.auth.admin.deleteUser(invitedUserId);
    console.error('invite-user:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro no convite' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});


