# GRIT SAC 4.0 — ProCirúrgica

Plataforma de atendimento, qualidade, assistência técnica e logística reversa da ProCirúrgica.

Endereço de produção: `https://gritnews.com.br/sacproh/`

## Módulos

- dashboard executivo e indicadores de SLA;
- abertura, triagem, acompanhamento e encerramento de chamados;
- produtos, lotes, fabricantes, fornecedores e notas fiscais;
- ordens de serviço e assistência técnica;
- qualidade, análise de causa e planos 5W2H;
- logística, coletas, devoluções e comprovantes;
- anexos privados, auditoria e controle de acesso por perfil;
- apoio de IA para classificação e resumo, sempre sujeito à validação humana.

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Preencha apenas a URL e a chave pública do Supabase.
3. Mantenha `GEMINI_API_KEY` exclusivamente no servidor.
4. Execute `pnpm install` e `pnpm dev`.

## Banco de dados

As migrações estão em `supabase/migrations`. A migração `002_enterprise_controls.sql` acrescenta fornecedores, fabricantes, notas fiscais, ordens de serviço, políticas de SLA, armazenamento privado e visões gerenciais.

## Segurança

Não existem credenciais administrativas padrão. Usuários são autenticados pelo Supabase Auth e autorizados por perfil ativo em `profiles`. Chaves privadas e senhas nunca devem ser enviadas ao repositório.

Consulte `ARQUITETURA_SAC_4.md` para decisões de arquitetura e prioridades.
