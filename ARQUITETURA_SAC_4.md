# Arquitetura recomendada — GRIT SAC 4.0

## Estado encontrado

O front-end já cobre chamados, assistência técnica, logística, qualidade, importação e painel executivo. Entretanto, a versão recebida ainda mistura dados de demonstração com acesso ao Supabase e tinha autenticação administrativa apenas no navegador.

## Arquitetura de produção

- **Front-end:** React/Vite publicado em `https://gritnews.com.br/sacproh/`.
- **Identidade:** Supabase Auth com perfis e RBAC por empresa e unidade.
- **Banco:** PostgreSQL/Supabase com isolamento por `tenant_id` e RLS.
- **Arquivos:** bucket privado `sac-attachments`; imagens, PDFs e notas são entregues por URL assinada.
- **IA:** Gemini somente por função de servidor/Edge Function, sem chave no navegador.
- **Auditoria:** registro imutável de abertura, alteração de status, atribuição, parecer, OS e encerramento.

## Fluxo operacional

1. Entrada do chamado e consentimento LGPD.
2. Identificação de cliente, NF, produto, lote, série, fabricante e fornecedor.
3. Triagem e classificação de risco; IA apenas sugere, o operador confirma.
4. Definição automática do SLA por categoria e prioridade.
5. Encaminhamento para SAC, qualidade, assistência técnica, logística ou fornecedor.
6. Ordens de serviço, coleta, imagens, laudos e custos vinculados ao protocolo.
7. Parecer conclusivo e classificação de procedência.
8. Pesquisa de satisfação/NPS e encerramento.

## Indicadores gerenciais

- volume recebido, encerrado e estoque em aberto;
- cumprimento de primeira resposta e solução;
- tempo médio de atendimento e resolução;
- reincidência por produto, lote, fabricante e fornecedor;
- Pareto de causas e custos por natureza;
- NPS, taxa de reabertura e procedência;
- eventos adversos, risco ao usuário e pendências regulatórias;
- produtividade por área, técnico, unidade e responsável.

## Próximas prioridades

1. Aplicar as migrações e criar o primeiro administrador no Supabase.
2. Substituir todos os adaptadores de demonstração por persistência real.
3. Implantar upload privado e URLs assinadas.
4. Calcular dashboards por consultas e views do banco.
5. Adicionar testes, alertas de SLA e política de backup/restauração.
