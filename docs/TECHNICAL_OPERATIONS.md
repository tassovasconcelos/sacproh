# Operação técnica

- Mudanças entram por PR com CI verde e revisão proporcional ao risco.
- Migrações passam por `preview` e `apply` em staging antes da produção.
- Segredos ficam nos ambientes protegidos; nunca no repositório ou frontend.
- Backups, restauração, logs, webhooks e filas de reprocessamento são testados periodicamente.
- Rollback de código não desfaz migração automaticamente; correções usam nova migração.
- A disponibilidade, erros, latência, falhas de e-mail, pagamentos e alertas abertos devem ser monitorados.
