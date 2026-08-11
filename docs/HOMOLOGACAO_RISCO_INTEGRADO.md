# Homologação — operação integrada de riscos

## Objetivo

Validar o fluxo SAC → risco → quarentena → CAPA → retorno ao cliente → auditoria, garantindo isolamento por empresa, rastreabilidade e simplicidade operacional.

## Matriz modular

| Módulo | START | PRO | ENTERPRISE |
|---|---:|---:|---:|
| SAC | Sim | Sim | Sim |
| Qualidade | Não | Sim | Sim |
| Lotes e rastreabilidade | Não | Sim | Sim |
| Gestão de riscos | Não | Sim | Sim |
| CAPA / 5W2H | Não | Sim | Sim |
| Regulatório | Não | Sim | Sim |
| Auditoria OCP | Não | Não | Sim |

O SUPERADMIN pode sobrescrever cada módulo por empresa na Central Gerencial. O SAC permanece sempre habilitado.

## Cenários obrigatórios

1. Abrir um SAC com cliente, produto, lote e relato completo.
2. Na Central de Riscos, localizar o SAC pelo protocolo ou cliente.
3. Criar a questão de risco e confirmar que produto, lote e protocolo foram vinculados sem redigitação.
4. Marcar quarentena preventiva e confirmar:
   - criação do caso de quarentena;
   - alteração do lote conhecido para `QUARANTINE`;
   - inclusão de quem abriu, responsável e RT como acompanhadores;
   - geração de alertas internos e itens na fila de e-mail.
5. Editar perigo, dano, controles, risco residual, eficácia e próxima revisão.
6. Criar CAPA/5W2H com causa raiz, responsável, prazo e critério de eficácia.
7. Reconhecer o alerta e verificar que ele deixa a fila de pendências.
8. Confirmar a quarentena, bloquear ou liberar o lote e registrar retorno ao cliente.
9. Cadastrar a organização OCP, auditoria, grupo empresarial, escopo e datas.
10. Anexar PDF ou imagem, informar validade e verificar o alerta de vencimento em até 30 dias.
11. Repetir os testes com outra empresa e confirmar que nenhum dado é compartilhado.
12. Desativar módulos no contrato e confirmar que a operação apresenta a orientação comercial sem expor formulários bloqueados.

## Critérios de aceite

- Nenhum risco é criado sem SAC de origem quando a fonte é atendimento.
- Toda quarentena tem motivo, responsável, prazo, cliente e lote quando disponível.
- A criação integrada é transacional: se a quarentena falhar, o risco não fica parcialmente cadastrado.
- Atualizações mantêm empresa, autor, responsável e vínculo de origem.
- Alertas apresentam destinatário, gravidade, estado de leitura e estado de entrega.
- Documentos de auditoria ficam em armazenamento privado e separados pelo identificador da empresa.
- Auditoria OCP somente aparece quando o módulo está contratado.

## Implantação

Aplicar `supabase/migrations/20260824_integrated_risk_operations.sql` antes de publicar a aplicação. Depois, executar `select public.refresh_operational_deadline_alerts();` diariamente por agendamento seguro. O envio efetivo de e-mail deve consumir apenas alertas com `delivery_status = 'QUEUED'`, registrar sucesso como `SENT` e falha como `FAILED`.

## Limites de conformidade

O módulo organiza evidências, prazos e decisões. Ele não substitui avaliação da Responsável Técnica, auditoria do OCP nem protocolos oficiais da ANVISA ou do INMETRO.
