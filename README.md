# GRIT SAC 4.0 — ProCirúrgica

Plataforma de atendimento, qualidade, assistência técnica e logística reversa da ProCirúrgica.

Endereço de produção: `https://gritnews.com.br/sacproh/`

## Módulos

- dashboard executivo e indicadores de SLA;
- abertura, triagem, acompanhamento e encerramento de chamados;
- produtos, lotes, fabricantes, fornecedores e notas fiscais;
- ordens de serviço e assistência técnica;
- qualidade, análise de causa e planos 5W2H;
- logística, coletas, devoluções e comprovantes;
- anexos privados, auditoria e controle de acesso por perfil;
- apoio de IA para classificação e resumo, sempre sujeito à validação humana.

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Preencha apenas a URL e a chave pública do Supabase.
3. Mantenha `GEMINI_API_KEY` exclusivamente no servidor.
4. Execute `pnpm install` e `pnpm dev`.

## Banco de dados

As migrações estão em `supabase/migrations`. A migração `002_enterprise_controls.sql` acrescenta fornecedores, fabricantes, notas fiscais, ordens de serviço, políticas de SLA, armazenamento privado e visões gerenciais.

## Segurança

Não existem credenciais administrativas padrão. Usuários são autenticados pelo Supabase Auth e autorizados por perfil ativo em `profiles`. Chaves privadas e senhas nunca devem ser enviadas ao repositório.

As rotas de IA e importação exigem um token válido do Supabase e aplicam limite de requisições. Em produção, configure também `SUPABASE_URL` e `SUPABASE_ANON_KEY` no servidor, além das variáveis públicas usadas pelo navegador.

## Critérios para lançamento comercial

Antes de habilitar vendas para clientes externos:

1. aplique todas as migrações, incluindo `010_saas_idor_hardening.sql`;
2. configure e teste os segredos das funções Mercado Pago e Supabase;
3. valide checkout aprovado, pendente, recusado, estorno e duplicidade de webhook;
4. publique termos de uso, política de privacidade/LGPD e canais de suporte;
5. execute `pnpm check` e confirme o workflow `quality` sem falhas;
6. faça um teste de isolamento com dois tenants e usuários de perfis diferentes;
7. valide backup, restauração, monitoramento e resposta a incidentes.

Consulte `ARQUITETURA_SAC_4.md` para decisões de arquitetura e prioridades.

Para o lançamento comercial, consulte também `COMMERCIAL_TRIAL_PLAYBOOK.md`, `COMMERCIAL_READINESS.md` e `SAC4_PRODUCT_ROADMAP.md`.

O procedimento protegido para homologar migrações, segredos e funções está em `STAGING_RELEASE_RUNBOOK.md`.
