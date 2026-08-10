# Homologação e liberação comercial

## Ambientes protegidos no GitHub

Crie os ambientes `staging` e `production` em **Settings → Environments**. No ambiente de produção, habilite aprovação obrigatória e restrinja a branch a `main`. Cadastre os seguintes segredos separadamente em cada ambiente:

| Segredo | Finalidade |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | autorizar a CLI do Supabase |
| `SUPABASE_PROJECT_REF` | identificar o projeto do ambiente |
| `SUPABASE_DB_PASSWORD` | revisar e aplicar migrações |
| `COMMERCIAL_ADMIN_EMAILS` | operadores autorizados, separados por vírgula |
| `PUBLIC_SITE_URL` | origem HTTPS do portal, sem caminho ou barra final |
| `SAC_APP_URL` | endereço HTTPS usado no convite do administrador |
| `MERCADO_PAGO_ACCESS_TOKEN` | credencial do provedor para o ambiente |
| `MERCADO_PAGO_WEBHOOK_SECRET` | validação criptográfica dos webhooks |
| `RESEND_API_KEY` | envio seguro dos alertas comerciais |
| `COMMERCIAL_ALERT_FROM` | remetente em domínio verificado, por exemplo `SAC 4.0 <alertas@seudominio.com>` |
| `COMMERCIAL_ALERT_TO` | destinatário; usar `gritsolucoes@gmail.com` |

Crie também a variável de ambiente `COMMERCIAL_CHECKOUT_ENABLED`. Mantenha `false` até CNPJ, contrato, aceite e pedido estarem conciliados. Para liberar o pagamento, ela deve ser `true` no ambiente e o build do portal deve receber `VITE_COMMERCIAL_CHECKOUT_ENABLED=true`.

Nunca reutilize credenciais produtivas no staging. O Mercado Pago deve usar uma conta ou credenciais de teste na homologação.

## Execução segura

1. Abra **Actions → Homologar e publicar Supabase → Run workflow**.
2. Selecione `staging` e `preview`. Essa opção vincula o projeto e mostra as migrações pendentes sem aplicá-las.
3. Revise a lista. Se o banco já recebeu migrações manualmente, corrija o histórico antes de usar `apply`; não reaplique uma migração por tentativa.
4. Execute novamente com `staging` e `apply`. O workflow aplica migrações, configura segredos, publica as funções e testa o preflight da captação.
5. Realize o roteiro funcional abaixo e registre evidências.
6. Somente após aprovação da homologação repita `preview` e `apply` em `production`.

## Roteiro funcional obrigatório

- Enviar um pedido de trial pelo portal e confirmar status `NEW`.
- Verificar que uma pessoa anônima não consegue ler `commercial_trial_requests`.
- Entrar em `/commercial-trials` com operador autorizado e negar um usuário fora da lista.
- Qualificar o lead, informar CNPJ e aprovar o trial.
- Provisionar e confirmar tenant, assinatura com 30 dias e convite do primeiro administrador.
- Repetir o provisionamento e confirmar que nenhum registro foi duplicado.
- Entrar pelo convite e validar que o novo administrador não acessa dados de outro tenant.
- Criar um checkout de teste e validar assinatura do webhook, conciliação, duplicidade e reprocessamento.
- Registrar evidências de backup/restauração e do procedimento de reversão antes do go-live.

## Critério de aprovação

A liberação comercial só avança quando o workflow estiver verde, o roteiro não apresentar vazamento entre tenants, o convite chegar corretamente e os documentos jurídicos estiverem publicados. Falhas devem gerar correção no código ou nova migração; nunca edite uma migração que já tenha sido aplicada.
