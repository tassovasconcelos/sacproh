# Marketing Analytics — ativação

## Entregue no produto

- Google Analytics 4 carregado por variável de ambiente.
- Eventos próprios de visita, clique no Instagram e conversão do formulário de trial.
- Preservação dos parâmetros UTM de origem, mídia e campanha.
- Dashboard gerencial dos últimos 30 dias.
- SEO técnico, dados estruturados, Open Graph, robots.txt e sitemap.

## Ativação

1. Crie uma propriedade Web no Google Analytics 4 para `apps.sactrial.gritnews.com.br`.
2. Defina `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX` no ambiente de produção.
3. Aplique a migration `20260816_marketing_analytics.sql` no Supabase.
4. Publique uma nova versão do site.
5. Acesse o painel em `https://apps.sactrial.gritnews.com.br/marketing-analytics`.
6. Cadastre o sitemap `https://apps.sactrial.gritnews.com.br/sitemap.xml` no Google Search Console.

## Padrão recomendado de campanhas

Use links como:

`https://apps.sactrial.gritnews.com.br/?utm_source=instagram&utm_medium=social&utm_campaign=lancamento_sac40&utm_content=carrossel_processos`

Não envie nome, e-mail ou telefone em parâmetros UTM.
