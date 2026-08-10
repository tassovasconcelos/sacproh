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

for (const path of ['supabase/functions/request-trial/index.ts','supabase/functions/manage-trials/index.ts','supabase/functions/mercadopago-checkout/index.ts']) {
  requireText(path, /allowedOrigins/, 'Função pública precisa de allowlist de origem.');
  forbidText(path, /Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"]/, 'CORS curinga é proibido.');
}
requireText('supabase/functions/manage-trials/index.ts', /COMMERCIAL_ADMIN_EMAILS/, 'Backoffice precisa de allowlist privada de operadores.');
requireText('supabase/functions/manage-trials/index.ts', /role_code!=='SUPERADMIN'/, 'Backoffice precisa validar o perfil de plataforma.');
requireText('supabase/functions/mercadopago-webhook/index.ts', /timingSafeEqual/, 'Webhook precisa comparar a assinatura com proteção temporal.');

requireText('.github/workflows/release-supabase.yml', /environment:\s*\$\{\{ inputs\.target \}\}/, 'Release precisa usar ambiente protegido.');
requireText('.github/workflows/release-supabase.yml', /db push[^\n]*--dry-run/, 'Release precisa revisar migrações antes da aplicação.');
forbidText('.github/workflows/deploy-sacproh.yml', /supabase (db push|functions deploy)/, 'Push comum não pode alterar o backend Supabase.');

if (failures.length) {
  console.error('Proteções comerciais ausentes:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('Proteções comerciais verificadas.');
