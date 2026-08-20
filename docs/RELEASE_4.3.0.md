# SACPROH 4.3 — Rastreabilidade, Encerramento e Custos

## Objetivo

Corrigir os principais pontos observados na operação real do SAC, priorizando persistência, rastreabilidade, encerramento formal e mensuração financeira de cada ocorrência.

## Entregas

- Timeline persistente por protocolo, com backfill do histórico existente.
- Qualificação progressiva visível na aba Histórico.
- Comentários com confirmação de persistência no banco antes de apresentar sucesso ao usuário.
- Cadastro real do cliente na tela do protocolo, removendo dados fixos de exemplo.
- Correção cadastral auditável com registro de antes/depois, usuário e motivo.
- Proteção adicional para alteração de CPF/CNPJ por perfil autorizado.
- Anexos ampliados para PDF, Word, Excel, CSV, TXT, imagens e vídeos, com validação de formato e limite de tamanho.
- Centro de custos por SAC para bonificação, devolução, fretes, assistência técnica, peças, substituição, reembolso e outros.
- Encerramento formal com procedência, parecer final, data da solução e data efetiva do encerramento.
- Proteção de banco para impedir que atualizações redundantes sobrescrevam `resolved_at` e `closed_at` após o encerramento.
- Aba de prazos mostrando abertura, primeiro retorno, solução e encerramento.
- RLS e isolamento por tenant nas novas estruturas.

## Interface

A tela `TicketDetailViewV43` substitui o detalhe legado mantendo a exportação pública `TicketDetailView`, evitando quebra dos imports existentes no aplicativo.

## Banco

Novas estruturas principais:

- `ticket_events`
- `customer_change_history`
- `ticket_costs`
- `update_customer_controlled(...)`
- `close_ticket_controlled(...)`
- `preserve_ticket_closure_dates()`

O backfill inicial recuperou 572 eventos da base existente para a nova timeline.

## Validação

- Migrações aplicadas e verificadas no Supabase de produção.
- Estruturas e triggers validados por consulta direta.
- GitHub Actions `Quality` executado com `pnpm check` concluído com sucesso após a integração da interface.

## Estado de release

A implementação está versionada na branch `feature/sac-v4-3-rastreabilidade` e no PR #17. O PR permanece em draft até autorização de publicação/merge e homologação operacional final.
