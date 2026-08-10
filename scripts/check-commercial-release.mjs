import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const failures = [];
const requireText = (path, pattern, message) => {
  const content = read(path);
  if (!pattern.test(content)) failures.push(`${path}: ${message}`);
};
const forbidText = (path, pattern, message) => {
  const content = read(path);
  if (pattern.test(content)) failures.push(`${path}: ${message}`);
};

requireText('supabase/migrations/20260810_commercial_trial_requests.sql', /enable row level security/i, 'RLS precisa estar habilitado.');
requireText('supabase/migrations/20260810_commercial_trial_requests.sql', /force row level security/i, 'RLS precisa ser forçado.');
requireText('supabase/migrations/20260810_commercial_trial_requests.sql', /revoke all[\s\S]*anon, authenticated/i, 'A tabela comercial não pode ser lida diretamente.');
requireText('supabase/migrations/20260810_trial_provisioning.sql', /revoke all on function[\s\S]*public,anon,authenticated/i, 'O provisionamento deve permanecer restrito.');
requireText('supabase/migrations/20260810_trial_provisioning.sql', /grant execute on function[\s\S]*service_role/i, 'Somente service_role deve executar o provisionamento.');
requireText('supabase/migrations/20260811_commercial_orders.sql', /force row level security/i, 'Pedidos comerciais precisam forçar RLS.');
requireText('supabase/migrations/20260811_commercial_orders.sql', /contract_evidence_reference[\s\S]*contract_accepted_at/i, 'Pedido anual precisa manter evidência contratual.');
requireText('supabase/migrations/20260812_billing_lifecycle.sql', /trg_billing_events_immutable/i, 'Eventos financeiros precisam ser imutáveis.');
requireText('supabase/migrations/20260812_billing_lifecycle.sql', /dedupe_key text not null unique/i, 'Alertas financeiros precisam ser deduplicados.');
requireText('supabase/migrations/20260813_tenant_branding.sql', /tenant_id uuid not null unique/i, 'Identidade visual precisa ser isolada por tenant.');
requireText('supabase/migrations/20260813_tenant_branding.sql', /file_size_limit[\s\S]*allowed_mime_types/i, 'Upload de logo precisa limitar tamanho e formatos.');
requireText('supabase/migrations/20260813_tenant_branding.sql', /user_role_code\(\)[\s\S]*SUPERADMIN[\s\S]*ADMIN_EMPRESA/i, 'Somente administradores podem alterar a marca.');
requireText('supabase/migrations/20260814_subscription_management.sql', /manage_commercial_subscription[\s\S]*security definer/i, 'Bloqueio e cancelamento precisam ser transacionais.');
requireText('supabase/migrations/20260814_subscription_management.sql', /trg_subscription_actions_immutable/i, 'Ações de assinatura precisam ser imutáveis.');

for (const path of ['supabase/functions/request-trial/index.ts','supabase/functions/manage-trials/index.ts','supabase/functions/mercadopago-checkout/index.ts']) {
  requireText(path, /allowedOrigins/, 'Função pública precisa de allowlist de origem.');
  forbidText(path, /Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"]/, 'CORS curinga é proibido.');
}
requireText('supabase/functions/manage-trials/index.ts', /COMMERCIAL_ADMIN_EMAILS/, 'Backoffice precisa de allowlist privada de operadores.');
requireText('supabase/functions/manage-trials/index.ts', /role_code!=='SUPERADMIN'/, 'Backoffice precisa validar o perfil de plataforma.');
requireText('supabase/functions/request-trial/index.ts', /gritsolucoes@gmail\.com/, 'Alertas de novos leads precisam apontar para o e-mail comercial oficial.');
requireText('supabase/functions/mercadopago-webhook/index.ts', /timingSafeEqual/, 'Webhook precisa comparar a assinatura com proteção temporal.');
requireText('supabase/functions/mercadopago-webhook/index.ts', /paymentMatchesOrder/, 'Pagamento aprovado precisa ser conciliado com o pedido.');
requireText('supabase/functions/mercadopago-webhook/index.ts', /charged_back[\s\S]*SUSPENDED/, 'Chargeback precisa suspender a assinatura.');
requireText('supabase/functions/mercadopago-checkout/index.ts', /COMMERCIAL_CHECKOUT_ENABLED['"]\)\s*!==\s*['"]true/, 'Checkout deve permanecer bloqueado por padrão.');

requireText('.github/workflows/release-supabase.yml', /environment:\s*\$\{\{ inputs\.target \}\}/, 'Release precisa usar ambiente protegido.');
requireText('.github/workflows/release-supabase.yml', /db push[^\n]*--dry-run/, 'Release precisa revisar migrações antes da aplicação.');
forbidText('.github/workflows/deploy-sacproh.yml', /supabase (db push|functions deploy)/, 'Push comum não pode alterar o backend Supabase.');

if (failures.length) {
  console.error('Proteções comerciais ausentes:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('Proteções comerciais verificadas.');
