# SAC 4.0 — Gestão de riscos, CAPA e evidências para auditoria

## Objetivo

O módulo organiza o ciclo completo de pós-mercado: identificação de perigo, avaliação do risco, controles, risco residual, notificações, ação de campo, CAPA/5W2H, verificação de eficácia, amostragem e evidências de auditoria. Ele apoia a decisão técnica; não substitui a Responsável Técnica, o Organismo de Certificação de Produto (OCP), o regulamento específico do produto ou os sistemas oficiais.

## Referências de governança

- ABNT NBR ISO 14971:2020 (versão corrigida 2020): estrutura de gestão de riscos de produtos para saúde ao longo do ciclo de vida.
- RDC Anvisa 551/2021: ações de campo para produtos para saúde.
- RDC Anvisa 67/2009: tecnovigilância e notificações compulsórias pelos detentores de registro.
- RDC Anvisa 665/2022: boas práticas de fabricação, distribuição e armazenamento.
- Portaria Inmetro 200/2021 (RGCP) e o RAC específico de cada produto.
- Procedimentos, planos de amostragem e critérios Ac/Re aprovados pelo OCP e pela RT.

Antes do uso produtivo, a RT deve confirmar versões vigentes, enquadramento, prazos, RAC aplicável e obrigações específicas do produto.

## Fluxo controlado

1. Identificar fonte, produto, lote, perigo, sequência previsível, situação perigosa e dano.
2. Estimar severidade, probabilidade e detectabilidade; registrar a matriz usada.
3. Definir controles priorizando segurança por projeto, proteção e informação de segurança.
4. Reavaliar o risco residual e documentar a análise benefício-risco quando aplicável.
5. Avaliar notificação à Anvisa, Inmetro, OCP ou outra autoridade e registrar prazo/protocolo.
6. Abrir contenção, correção, ação corretiva ou preventiva com causa raiz e 5W2H.
7. Verificar eficácia com critério mensurável e janela temporal definida.
8. Monitorar recorrência, exposição de vendas, produto, lote, fornecedor e tendência.
9. Congelar um dossiê como evidência para auditoria.

## Modelo 5W2H — exemplo auditável

| Campo | Exemplo |
|---|---|
| O quê | Segregar o lote L2408, revisar a embalagem e inspecionar 100% do saldo |
| Por quê | Dano recorrente no transporte confirmou proteção mecânica insuficiente |
| Onde | Estoque, assistência técnica, distribuidor e clientes afetados |
| Quando | Contenção imediata; solução definitiva até a data aprovada |
| Quem | Qualidade, RT, logística, fabricante e responsável nomeado |
| Como | Bloqueio sistêmico, análise de causa, alteração validada, treinamento e comunicação |
| Quanto | Custo previsto e realizado, com aprovação conforme alçada |
| Eficácia | Zero recorrência em 90 dias e taxa abaixo do limite aprovado por 10.000 unidades |

O encerramento exige evidência objetiva; marcar uma tarefa como concluída não comprova eficácia.

## Sinais preditivos

O painel prioriza, para validação humana:

- risco residual crítico ou sem revisão;
- CAPA vencida ou considerada ineficaz;
- recorrência por produto/lote;
- avaliação regulatória sem submissão registrada;
- aumento de ocorrências por milhão de unidades vendidas;
- ausência do denominador de vendas;
- concentração de problemas por fabricante, importador, distribuidor ou canal.

Esses sinais são apoio à investigação. Não determinam automaticamente causalidade, recolhimento, notificação ou aceitabilidade do risco.

## Importação de vendas

O arquivo CSV deve usar ponto e vírgula ou vírgula e conter:

`period_start;period_end;sku;product_name;lot_number;units_sold;customers_count;revenue`

Exemplo:

`2026-07-01;2026-07-31;MED-001;Monitor Multiparamétrico;L2407;1250;84;875000.00`

Os dados permitem calcular ocorrências por milhão de unidades e investigar tendências por período, produto e lote. Antes da importação, deve haver conciliação com o ERP/faturamento e controle de duplicidades por lote e período.

## Amostragem

O módulo registra população, tamanho da amostra, método, Ac/Re, justificativa e aprovação. Não calcula automaticamente um plano “conforme”: a seleção depende do RAC, norma, risco, histórico, nível de inspeção, NQA/AQL e orientação do OCP. A justificativa deve permitir que outro auditor reproduza o método e identifique os itens selecionados.

## Dossiê OCP

O relatório reúne:

- escopo, período, empresa, emissão e responsáveis;
- registro mestre de riscos e risco residual;
- reclamações e tendência com denominador de vendas;
- notificações, protocolos, ações de campo e comunicações;
- causa raiz, CAPA/5W2H, prazos e eficácia;
- planos e resultados de amostragem;
- rastreabilidade por produto, lote, fabricante, importador e distribuidor;
- pendências, decisões da RT e evidências anexas.

“Congelar evidência” cria uma fotografia imutável dos indicadores e registros usados naquele relatório. A impressão permite gerar PDF para o pacote de auditoria.

## Perfis e segurança

- **SUPERADMIN:** leitura e gestão integral dentro da empresa vinculada, além da governança central autorizada.
- **RESPONSÁVEL TÉCNICA:** cria e altera riscos, CAPA, notificações, amostragem e evidências.
- **DIRETORIA / ADMIN_EMPRESA:** leitura executiva e acompanhamento.
- Demais perfis não recebem acesso ao módulo.

As políticas do banco isolam cada empresa. Alterações críticas preservam autor, data, responsável, prazo e evidência. A implantação deve incluir teste de segregação entre empresas, restauração, retenção, exportação e revisão periódica dos acessos.

