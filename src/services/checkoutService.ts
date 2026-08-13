import { supabase } from '../lib/supabase';

export type CommercialPlanCode = 'START' | 'PRO' | 'ENTERPRISE';

export async function startMercadoPagoCheckout(orderToken: string) {
  const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
    body: { orderToken },
  });

  if (error) throw new Error('Não foi possível iniciar o pagamento. Tente novamente.');
  if (!data?.checkoutUrl) throw new Error('O checkout não retornou um endereço de pagamento.');

  window.location.assign(data.checkoutUrl);
}
