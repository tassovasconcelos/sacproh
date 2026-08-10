const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const allowedOrigins = new Set([
  'https://apps.sactrial.gritnews.com.br',
  'https://apps.sacproh.gritnews.com.br',
]);
try { const configured = Deno.env.get('PUBLIC_SITE_URL'); if (configured) allowedOrigins.add(new URL(configured).origin); } catch { /* configuração inválida não amplia o CORS */ }

const plans = {
  START: { name: 'SAC Start', annual: 5388, setup: 1490, seats: 5 },
  PRO: { name: 'SAC Profissional', annual: 12948, setup: 2990, seats: 15 },
  ENTERPRISE: { name: 'SAC Enterprise', annual: 26988, setup: 5990, seats: 40 },
} as const;

function json(origin: string, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  if (!allowedOrigins.has(origin)) return json('null', { error: 'Origem não autorizada.' }, 403);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin } });
  if (req.method !== 'POST') return json(origin, { error: 'Método não permitido.' }, 405);

  try {
    if (Deno.env.get('COMMERCIAL_CHECKOUT_ENABLED') !== 'true') {
      return json(origin, { error: 'Checkout disponível somente após validação comercial.' }, 403);
    }
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://apps.sactrial.gritnews.com.br';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!accessToken || !supabaseUrl) return json(origin, { error: 'Pagamento ainda não configurado.' }, 503);

    const payload = await req.json();
    const planCode = String(payload?.planCode || '').toUpperCase() as keyof typeof plans;
    const plan = plans[planCode];
    if (!plan) return json(origin, { error: 'Plano inválido.' }, 400);

    const orderReference = crypto.randomUUID();
    const preference = {
      items: [
        { id: `${planCode}-ANUAL`, title: `${plan.name} - licença de 12 meses`, quantity: 1, currency_id: 'BRL', unit_price: plan.annual },
        { id: `${planCode}-SETUP`, title: `${plan.name} - setup de implantação`, quantity: 1, currency_id: 'BRL', unit_price: plan.setup },
      ],
      external_reference: orderReference,
      metadata: { plan_code: planCode, seats: plan.seats, billing_period_months: 12 },
      back_urls: {
        success: `${publicSiteUrl}/?pagamento=aprovado`,
        pending: `${publicSiteUrl}/?pagamento=pendente`,
        failure: `${publicSiteUrl}/?pagamento=nao-concluido`,
      },
      auto_return: 'approved',
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'GRIT SAC 4.0',
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': orderReference,
      },
      body: JSON.stringify(preference),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error('Mercado Pago preference error', response.status, result?.message);
      return json(origin, { error: 'Não foi possível criar o checkout.' }, 502);
    }

    return json(origin, { checkoutUrl: result.init_point, preferenceId: result.id });
  } catch (error) {
    console.error('Checkout error', error instanceof Error ? error.message : error);
    return json(origin, { error: 'Erro interno ao iniciar o pagamento.' }, 500);
  }
});
