import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function validSignature(req: Request, dataId: string) {
  const secret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET');
  const signature = req.headers.get('x-signature') || '';
  const requestId = req.headers.get('x-request-id') || '';
  const parts = Object.fromEntries(signature.split(',').map((part) => part.trim().split('=')));
  if (!secret || !parts.ts || !parts.v1 || !requestId || !dataId) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
  return timingSafeEqual(expected, parts.v1);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const dataId = String(body?.data?.id || url.searchParams.get('data.id') || '');
    const topic = String(body?.type || url.searchParams.get('type') || '');
    if (topic !== 'payment' || !(await validSignature(req, dataId))) return new Response('invalid signature', { status: 401 });

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!paymentResponse.ok) return new Response('payment lookup failed', { status: 502 });
    const payment = await paymentResponse.json();

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const orderId = String(payment.external_reference || '');
    const { data: order } = /^[0-9a-f-]{36}$/i.test(orderId)
      ? await admin.from('commercial_orders').select('*').eq('id', orderId).maybeSingle()
      : { data: null };
    const paymentMatchesOrder = Boolean(order
      && Number(payment.transaction_amount) === Number(order.expected_amount)
      && payment.currency_id === order.currency
      && payment.metadata?.order_id === order.id
      && payment.metadata?.tenant_id === order.tenant_id
      && payment.metadata?.plan_code === order.plan_code);
    const { error } = await admin.from('commercial_payments').upsert({
      provider: 'mercado_pago',
      provider_payment_id: String(payment.id),
      external_reference: payment.external_reference || null,
      plan_code: payment.metadata?.plan_code || null,
      status: payment.status,
      status_detail: payment.status_detail,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      payer_email: payment.payer?.email || null,
      order_id: order?.id || null,
      paid_at: payment.date_approved || null,
      provider_payload: payment,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider,provider_payment_id' });
    if (error) throw error;
    if (payment.status === 'approved' && order && order.status !== 'PAID') {
      if (!paymentMatchesOrder) {
        const { error: reviewError } = await admin.from('commercial_orders').update({ status: 'PAYMENT_REVIEW', updated_at: new Date().toISOString() }).eq('id', order.id);
        if (reviewError) throw reviewError;
        return new Response('payment queued for review', { status: 200 });
      }
      const { data: plan, error: planError } = await admin.from('saas_plans').select('id').eq('code', order.plan_code).eq('is_active', true).single();
      if (planError) throw planError;
      const now = new Date();
      const periodEnd = new Date(now); periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
      const { error: subscriptionError } = await admin.from('tenant_subscriptions').update({ plan_id: plan.id, status: 'ACTIVE', trial_ends_at: null,
        current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(), billing_email: order.buyer_email,
        provider: 'mercado_pago', provider_subscription_id: String(payment.id), updated_at: now.toISOString() }).eq('tenant_id', order.tenant_id);
      if (subscriptionError) throw subscriptionError;
      const { error: paidError } = await admin.from('commercial_orders').update({ status: 'PAID', paid_at: payment.date_approved || now.toISOString(), updated_at: now.toISOString() }).eq('id', order.id);
      if (paidError) throw paidError;
    }
    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error('Webhook error', error instanceof Error ? error.message : error);
    return new Response('error', { status: 500 });
  }
});
