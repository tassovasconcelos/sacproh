# Configuração do servidor de backup do SACPROH

O arquivo `.env.local` é local, não deve ser versionado e não substitui o cofre de segredos do ambiente de publicação.

## Variáveis necessárias

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_COMMERCIAL_CHECKOUT_ENABLED=false
VITE_GA_MEASUREMENT_ID=
SUPABASE_URL=
SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

No SACPROH, `VITE_COMMERCIAL_CHECKOUT_ENABLED` deve permanecer `false`. A gestão comercial, os trials, as assinaturas e os pagamentos pertencem exclusivamente ao SACTRIAL.

## Procedimento seguro

1. Obter os valores no cofre de segredos do ambiente de produção ou em **GitHub > Settings > Secrets and variables > Actions**.
2. Criar o arquivo `.env.local` diretamente no servidor de backup.
3. Não enviar o arquivo por e-mail, chat ou Git e não registrar seus valores em capturas de tela.
4. Restringir a leitura do arquivo ao usuário que executa a aplicação.
5. Executar a validação e a publicação no servidor de backup.
6. Testar autenticação, abertura de SAC, anexos, relatórios, riscos e auditorias sem alterar registros de produção.

## Separação dos produtos

- **SACPROH:** sistema interno completo da Procirúrgica, com identidade própria, gestão operacional, relatórios, riscos, conformidade e auditorias.
- **SACTRIAL / SAC 4.0:** produto comercial GRIT, multiempresa, modular, com trials, planos, assinaturas, pagamentos e administração de clientes.

Embora funcionalidades operacionais possam evoluir em paralelo, identidade, configuração de ambiente, dados e processos comerciais devem permanecer separados.

