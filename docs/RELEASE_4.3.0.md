# SACPROH 4.3 — Rastreabilidade, Encerramento e Custos

## Objetivo

Fechar as lacunas operacionais observadas no uso real do SAC: correção auditável de clientes, histórico permanente, persistência de comentários, documentos adicionais, encerramento controlado, prazos e custos por ocorrência.

## Backend implantado

- `ticket_events`: timeline unificada do protocolo.
- `customer_change_history`: trilha de alterações cadastrais com motivo, usuário e antes/depois.
- `ticket_costs`: centro de custos por SAC, incluindo bonificação, devolução, fretes, assistência, peças, reposição e reembolso.
- `ticket_comments.comment_type`: classificação dos registros diários.
- `ticket_attachments.document_type`: classificação documental.
- campos de prazo de consumidor em `tickets`.
- RPC `update_customer_controlled`: correção cadastral com autorização, motivo obrigatório e auditoria; CPF/CNPJ somente para administrador.
- RPC `close_ticket_controlled`: encerramento com procedência, parecer, data de resolução e data de encerramento.
- triggers que convertem mudanças de status, qualificação, comentários, anexos, custos e correções cadastrais em eventos da timeline.
- backfill do histórico existente para `ticket_events`.

## Frontend em integração

A camada de serviço `src/services/sacV43Service.ts` expõe os contratos para:

- carregar timeline;
- carregar e corrigir cliente;
- listar e registrar custos;
- encerrar SAC de forma controlada;
- validar PDF, Word, Excel, CSV, imagens e vídeos até 25 MB.

## Critérios de homologação da interface

1. Aba Cliente deve buscar dados reais e permitir correção autorizada com motivo obrigatório.
2. Aba Histórico deve renderizar `ticket_events` em ordem cronológica.
3. Comentário deve confirmar persistência apenas após retorno 201 do banco e atualizar a timeline.
4. Anexos devem aceitar PDF/DOC/DOCX/XLS/XLSX/CSV/TXT e mídia autorizada.
5. Encerramento deve usar `close_ticket_controlled`, exigir parecer e mostrar `resolved_at` e `closed_at`.
6. Aba Custos deve usar `ticket_costs`, exibir total do SAC e vínculo opcional com NF.
7. SLA deve exibir abertura, primeira resposta, resolução, encerramento, prazo interno e prazo de consumidor configurável.

## Segurança

As novas tabelas usam RLS forçado por tenant. Funções internas de trigger tiveram `EXECUTE` removido de `PUBLIC`, `anon` e `authenticated`. As RPCs expostas validam sessão, tenant e papel do usuário antes de executar alterações.
