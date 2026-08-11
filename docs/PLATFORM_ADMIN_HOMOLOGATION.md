# Homologação da gestão da plataforma e Mercado Pago

## Acesso central

- Endereço: `https://apps.sactrial.gritnews.com.br/admin`
- Autenticação: o mesmo usuário `SUPERADMIN` ativo do SACPROH.
- Camada adicional: o e-mail deve constar no segredo `COMMERCIAL_ADMIN_EMAILS`.
- Clientes de trial recebem `ADMIN_EMPRESA`; nunca recebem `SUPERADMIN`.

## Estrutura única de usuários

O SAC 4.0 usa o mesmo projeto Supabase, `auth.users`, `profiles`, `tenants` e `tenant_subscriptions` do SACPROH. Não deve ser criado um segundo cadastro de usuários. O isolamento permanece por empresa e as operações globais passam pela função protegida `manage-trials`.

## Roteiro de homologação

1. Executar o workflow **Homologar e publicar Supabase** com `target=staging` e `operation=preview`.
2. Revisar as migrações pendentes, em especial `20260817_platform_admin_security.sql`.
3. Executar novamente com `target=staging` e `operation=apply`.
4. Entrar em `/admin` com o superadmin da GRIT.
5. Confirmar a visão de leads, trials, empresas, usuários, assinaturas, pedidos e alertas.
6. Criar um trial de homologação e confirmar: 15 dias, 1 usuário e papel `ADMIN_EMPRESA`.
7. Bloquear e reativar o usuário de homologação; conferir a trilha `platform_admin_actions`.
8. Preparar um pedido com evidência contratual e manter `COMMERCIAL_CHECKOUT_ENABLED=false`.
9. Usar credenciais de teste do Mercado Pago e validar pagamento aprovado, pendente e rejeitado.
10. Validar assinatura do webhook, conciliação de valor/moeda/tenant/plano, idempotência, estorno e chargeback.
11. Somente após aprovação formal, definir `COMMERCIAL_CHECKOUT_ENABLED=true` no ambiente de produção e executar `preview` antes de `apply`.

## Critérios de liberação

- Check `Quality` verde.
- Migrações aplicadas sem divergência.
- Nenhum cliente com papel `SUPERADMIN`.
- Acesso bloqueado para e-mails fora de `COMMERCIAL_ADMIN_EMAILS`.
- Pagamento divergente enviado para `PAYMENT_REVIEW`.
- Chargeback suspende a assinatura e gera alerta crítico.
- Eventos financeiros e ações administrativas não podem ser alterados ou apagados.
- Checkout permanece desligado até o aceite da homologação.
