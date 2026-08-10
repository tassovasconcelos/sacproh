# Prontidão comercial do SAC Trial

## Estado atual

O produto já possui portal comercial, planos, checkout Mercado Pago, autenticação Supabase, módulos operacionais de SAC e uma base multiempresa. Esta revisão integrou o endurecimento de isolamento entre tenants, recuperou o lockfile reproduzível, protegeu as APIs do servidor, adicionou validação contínua e criou a captação segura para o trial assistido.

## Bloqueadores antes da venda em escala

- Provisionamento: o trial aprovado já cria tenant, assinatura e primeiro administrador de forma idempotente; falta conciliar e automatizar a conversão do pagamento aprovado para assinatura anual.
- Jurídico e LGPD: publicar termos de uso, política de privacidade, contrato, DPA, retenção e processo de atendimento ao titular.
- Operação: definir suporte, horários, SLA comercial, onboarding, migração assistida, treinamento e escalonamento de incidentes.
- Confiabilidade: testar backup/restauração, observabilidade, alertas, fila/reprocessamento de webhooks e recuperação de desastre.
- Qualidade: criar testes automatizados para autenticação, autorização, isolamento multiempresa, tickets, anexos, checkout e webhook.
- Comercial: confirmar preços, impostos, política de cancelamento, usuários excedentes, limites de armazenamento e chamadas de IA.
- Trial: criar o backoffice comercial e alertas de novos leads; até lá, a triagem da tabela protegida é uma operação interna controlada.

## Critérios de go-live

- Workflow `quality` aprovado na branch de lançamento.
- Migrações aplicadas e testadas em staging antes de produção.
- Teste de invasão focado em IDOR/RLS, uploads, convites e funções administrativas.
- Compra completa validada do checkout ao acesso do cliente, incluindo reembolso e cobrança duplicada.
- Dois tenants de teste sem qualquer leitura ou escrita cruzada.
- Runbook de incidentes, responsáveis e contatos de suporte definidos.
- Documentos legais publicados e aceitos no cadastro/checkout.

## Próxima fase recomendada

Validar o provisionamento do trial em staging e construir a conciliação `contrato/pedido -> pagamento aprovado -> assinatura anual`, com testes de integração, reprocessamento idempotente e tratamento de estorno. O checkout já capta pagamentos, mas a conversão financeira ainda não deve ativar automaticamente um cliente sem identificação empresarial e aceite contratual confirmados.
