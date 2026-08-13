# Relatórios regulatórios do Responsável Técnico

## Objetivo

O módulo consolida dados internos para revisão do Responsável Técnico de importadoras e distribuidoras de dispositivos médicos. Ele não transmite informações automaticamente à Anvisa ou ao Inmetro e não substitui a análise profissional, os formulários vigentes nem os sistemas oficiais.

## Acesso

Somente o perfil `RESPONSAVEL_TECNICA` visualiza o menu, abre o módulo, consulta ou altera a conformidade dos produtos e salva relatórios. A restrição também é aplicada no Supabase por RLS; ocultar o menu não é a única proteção.

## Relatório Anvisa

- Queixas técnicas e atendimentos do período.
- Eventos adversos, risco ao usuário e dano.
- Investigações abertas, concluídas e sem parecer final.
- Produtos, registros Anvisa, UDI, lotes e números de série.
- Lacunas de rastreabilidade e apoio à decisão sobre notificabilidade.
- Base para monitoramento de ação de campo, alerta, correção, recolhimento e recall.

## Relatório Inmetro

- Produtos marcados como sujeitos à avaliação da conformidade.
- Registro, certificado, OCP, norma aplicável e validade.
- Certificados válidos e pendências críticas.
- Evidência de revisão periódica da regularidade para comercialização.

## Referências oficiais verificadas em 11/08/2026

- RDC 665/2022: Boas Práticas de Fabricação, Distribuição e Armazenamento de produtos médicos e IVD.
- RDC 67/2009: tecnovigilância aplicável aos detentores de registro.
- RDC 551/2021: ações de campo de dispositivos médicos.
- RDC 591/2021 e IN 426/2026: UDI e operação do SIUD.
- RDC 751/2022 e RDC 810/2023: regularização e importação de dispositivos médicos.
- Portaria Inmetro 384/2020, alterada pela Portaria 254/2021: certificação de equipamentos sob regime de vigilância sanitária.
- Programas de Avaliação da Conformidade Compulsórios e Registro de Produtos e Serviços do Inmetro.

Antes de emitir ou protocolar qualquer informação, o RT deve confirmar a norma específica do produto, classificação de risco, enquadramento, prazo, formulário e canal oficial vigentes.
