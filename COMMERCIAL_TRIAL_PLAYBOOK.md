# Playbook comercial e trial do SAC 4.0

## Proposta do trial

O trial é um piloto assistido de 30 dias, sem cartão, destinado a validar um processo real do cliente. Ele não deve ser uma conta aberta e sem acompanhamento. O objetivo é provar aderência, segurança, ganho operacional e qualidade dos indicadores antes da contratação anual.

## Funil e responsáveis

| Etapa | Prazo | Critério de saída | Responsável |
|---|---:|---|---|
| Lead novo | 4 horas úteis | contato realizado e dados mínimos confirmados | SDR/comercial |
| Qualificação | 1 dia útil | problema, volume, equipe, urgência e decisor identificados | executivo comercial |
| Demonstração | até 3 dias | caso de uso prioritário e metas do piloto definidos | comercial + produto |
| Trial aprovado | 1 dia | escopo, responsáveis, dados permitidos e agenda aceitos | produto/implantação |
| Trial ativo | 30 dias | usuários treinados e fluxo piloto em execução | customer success |
| Revisão do trial | até 2 dias após término | métricas, gaps, plano recomendado e proposta apresentados | CS + comercial |
| Conversão | até 7 dias | contrato, pagamento e onboarding produtivo | comercial + financeiro |

## Qualificação obrigatória

- Segmento, número de unidades e localização.
- Volume mensal de chamados e sazonalidade.
- Canais atuais: telefone, e-mail, WhatsApp, portal e planilhas.
- Necessidade de lote, validade, série, garantia, ANVISA, assistência técnica e logística reversa.
- Usuários, perfis, integrações e dados a importar.
- Problema prioritário e impacto financeiro/operacional.
- Decisor, aprovador técnico, prazo e orçamento.
- Restrições de segurança, LGPD e retenção.

## Plano do piloto

1. Definir um processo prioritário e até cinco indicadores de sucesso.
2. Criar tenant exclusivo e usuários mínimos necessários.
3. Usar dados fictícios ou amostra aprovada; não importar base completa no trial.
4. Configurar SLA, categorias, responsáveis e um modelo de dashboard.
5. Treinar usuários-chave e executar checkpoints nos dias 3, 10, 20 e 28.
6. Encerrar com relatório de valor, riscos, gaps e recomendação de plano.

## Indicadores de sucesso

- Tempo até o primeiro valor: primeiro chamado concluído em até 48 horas após ativação.
- Adoção: ao menos 70% dos usuários convidados ativos na primeira semana.
- Processo: ao menos 20 chamados reais ou simulados concluídos.
- Dados: 100% dos chamados piloto com categoria, responsável, SLA e resolução registrados.
- Gestão: dashboard revisado pelo decisor ao menos uma vez.
- Conversão: proposta apresentada até dois dias após a revisão final.

## Política de encerramento

Trials sem atividade por sete dias entram em recuperação comercial. Ao término, o acesso deve ser suspenso até conversão ou aprovação formal de extensão. A exclusão ou retenção dos dados segue contrato e política de privacidade; extensões precisam de justificativa, nova meta e data final.

## Checklist de publicação do trial

1. Aplicar `20260810_commercial_trial_requests.sql` no ambiente de staging e validar a tabela protegida por RLS.
2. Publicar a função `request-trial` sem exigir sessão, mantendo validação de origem, consentimento, campos permitidos, honeypot e limite por e-mail.
3. Fazer uma solicitação real pelo portal e confirmar o registro, o status `NEW` e a ausência de leitura pública da tabela.
4. Definir a fila operacional e o responsável que consultará os leads até a entrega do backoffice.
5. Publicar a política de privacidade e transformar o texto de consentimento em link antes de campanhas abertas.
6. Repetir o processo em produção e acompanhar erros e tempo da primeira resposta nas primeiras 72 horas.

## Backoffice comercial

O funil interno fica em `/commercial-trials` no domínio do portal. O acesso exige simultaneamente uma sessão Supabase ativa, perfil `SUPERADMIN` e e-mail presente no segredo `COMMERCIAL_ADMIN_EMAILS` da função `manage-trials`. Configure o segredo como uma lista de e-mails separados por vírgula e nunca exponha essa lista no frontend.

No painel, o operador pode consultar até 200 solicitações recentes, registrar notas, motivo de perda e movimentar a oportunidade pelo funil. Ao ativar o trial, o sistema registra automaticamente o início e o término de 30 dias. A criação do tenant e dos usuários continua sendo uma etapa separada até o provisionamento automatizado.

## Métricas do funil

- Leads por origem e segmento.
- Tempo de primeira resposta.
- Conversão lead → demonstração → trial → contrato.
- Dias médios por etapa e motivo de perda.
- Ativação, usuários ativos e chamados concluídos durante o piloto.
- Receita anual contratada, setup, CAC, payback e churn.
