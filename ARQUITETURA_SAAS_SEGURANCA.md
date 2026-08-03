# SACPROH como SaaS multiempresa

## Segurança e isolamento

Cada cliente é um `tenant`. O sistema nunca usa o identificador de empresa enviado pela tela como autorização: o banco deriva o tenant de `auth.uid()` e do perfil ativo. RLS protege todas as tabelas operacionais e gatilhos impedem que anexos ou ordens de serviço apontem para SACs de outra empresa.

O papel `SUPERADMIN` permanece limitado à sua própria empresa. Operações globais da GRIT devem usar um painel separado e Edge Functions auditadas; um perfil comercial editável não deve virar chave-mestra de todos os clientes.

## Cobrança

- `saas_plans`: mensalidade, usuários incluídos, usuário adicional, chamados e armazenamento.
- `tenant_subscriptions`: plano, trial, ciclo, situação e referências do provedor financeiro.
- `usage_events`: medição por empresa, usuário e operação.
- O limite de usuários ativos é aplicado no banco; desativar libera a vaga sem apagar histórico.

Modelo recomendado: assinatura mensal antecipada mais usuários contratados. Armazenamento, IA e chamados excedentes podem ser cobrados no ciclo seguinte. Cartões nunca ficam no SACPROH; usar Stripe, Asaas ou Mercado Pago com webhooks assinados e idempotentes.

## Onboarding de clientes

1. Criar tenant e assinatura em `TRIAL`.
2. Criar o primeiro administrador por função idempotente.
3. Configurar marca, unidades, categorias, SLA e perfis.
4. Importar dados em staging e validar antes de promover.
5. Registrar aceite contratual e papéis LGPD.
6. Ativar cobrança depois da homologação.

## Próximas camadas

1. Painel GRIT separado para onboarding, assinatura e suporte.
2. MFA obrigatório para administradores e responsáveis técnicos.
3. Rate limiting distribuído em login, convites, importação e anexos.
4. Antimalware e quarentena para arquivos.
5. Webhooks financeiros assinados, idempotentes e com retentativa.
6. Backups com restauração testada, RPO/RTO e exportação por tenant.
7. Auditoria append-only em armazenamento imutável.
8. Testes negativos automatizados entre tenant A e tenant B.
9. Observabilidade por cliente sem expor dados pessoais.
10. SSO/SAML, SCIM e residência de dados no plano Enterprise.

