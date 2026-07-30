# Guia de Exportação, Prompt de Arquitetura e Implantação no Servidor

**Aplicação:** SAC Procirúrgica 4.0 & Portal Grit News  
**Endereço Alvo:** `https://www.gritnews.com.br/sacproh`  
**Data:** 30 de Julho de 2026  

---

## 1. Como Exportar o Código Fonte no AI Studio

Você pode exportar este código completo diretamente pelo AI Studio:

1. **Download via ZIP:**
   - No canto superior do Google AI Studio, clique no menu **Settings** (ícone de engrenagem ou menu de reticências `...`).
   - Selecione a opção **Export Project** / **Download ZIP**.
   - O arquivo `.zip` contendo todo o código-fonte TypeScript, React, Tailwind CSS e Express será baixado para o seu computador.

2. **Sincronização com GitHub:**
   - Se preferir conectar diretamente com o GitHub, acesse as **Configurações do Projeto** no menu superior.
   - Clique em **Connect to GitHub** (ou **Export to Repository**).
   - *Nota de Permissão:* Certifique-se de que o aplicativo **Google AI Studio GitHub App** possui permissão concedida na sua conta do GitHub para criar/atualizar repositórios.

---

## 2. Prompt de Arquitetura do Sistema (System Prompt)

Caso precise recriar ou evoluir a aplicação em outro ambiente de IA, este é o **prompt de arquitetura unificado**:

```text
Desenvolva uma aplicação full-stack de classe corporativa para o SAC 4.0 do Grupo Procirúrgica com portal de entrada gritnews.com.br e subdiretório dedicado em /sacproh.

Requisitos de Arquitetura e Funcionalidades:
1. Portal de Notícias Grit News (gritnews.com.br):
   - Landing page com notícias do setor de tecnologia médica, regulatório ANVISA (RDC 67/2009 e RDC 551/2021) e pós-venda hospitalar.
   - Botões em destaque na parte superior e no rodapé direcionando para a Central SAC Procirúrgica no caminho /sacproh.
   - Botão para Área Restrita de Administração (ADM) com modal de login por e-mail e senha.

2. Sistema SAC Procirúrgica 4.0 (/sacproh):
   - Módulo Operacional Completo:
     * Dashboard Executivo com estatísticas, prazos SLA e distribuição por departamento.
     * Gestão de Chamados SAC (Abertura, Triagem com IA Gemini, Devoluções de Materiais Cirúrgicos e Status RDC).
     * Qualidade e Planos de Ação 5W2H para tratativa de desvios e farmacovigilância.
     * Assistência Técnica (OS - Ordens de Serviço de Bancada com calibração, peças e orçamento).
     * Logística & Coletas (Rastreio de Logística Reversa e recolhimento cirúrgico).
     * Base de Conhecimento e Relatórios Gerenciais.
   
3. Segurança e Área Restrita ADM:
   - Os módulos de edição (Editar Usuários e Perfis RBAC, Importador de Planilhas SAC, Configurações de Banco de Dados e Trilha de Auditoria) exigem autenticação prévia de Administrador.
   - Autenticação ADM obrigatória pelo Supabase Auth, sem credenciais padrão no código.

4. Configuração para Hospedagem em Subdiretório (/sacproh):
   - Definir base relativa ("./") no vite.config.ts para correto carregamento de scripts, imagens e estilos sem quebra de caminhos absolutos.
   - Suporte a rotas por histórico e subpasta /sacproh.
```

---

## 3. Passo a Passo de Implantação no Servidor (gritnews.com.br/sacproh)

### Opção A: Servidor Node.js / Docker (Recomendado)

1. **Extraia os arquivos no servidor:**
   ```bash
   unzip projeto-sacproh.zip -d /var/www/gritnews/sacproh
   cd /var/www/gritnews/sacproh
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Gere o build de produção:**
   ```bash
   npm run build
   ```

4. **Inicie o serviço com PM2:**
   ```bash
   npm install -g pm2
   pm2 start dist/server.cjs --name "grit-sacproh"
   pm2 save
   ```

---

### Opção B: Configuração do Nginx para o Subdiretório `/sacproh`

Adicione a seguinte regra ao arquivo de configuração do seu site no Nginx (ex: `/etc/nginx/sites-available/gritnews.com.br`):

```nginx
server {
    server_name gritnews.com.br www.gritnews.com.br;

    # Aplicação Principal / Portal
    location / {
        root /var/www/gritnews/portal;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Redirecionamento e Proxy do SAC Procirúrgica para /sacproh
    location /sacproh {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Após editar, teste e reinicie o Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. Estrutura de Arquivos Gerada

- `vite.config.ts`: Configurado com `base: './'` para garantir compatibilidade com subdiretórios.
- `server.ts`: Servidor Node.js Express para rotas `/api` e integração com IA Gemini.
- `src/App.tsx`: Gerenciador de navegação e detector de rotas `/sacproh`.
- `src/components/grit/GritNewsPortal.tsx`: Página principal do portal gritnews.com.br.
- `src/components/auth/AdminLoginModal.tsx`: Modal de proteção e autenticação da área restrita ADM.
- `src/components/layout/Sidebar.tsx`: Menu lateral com divisões operacionais e seção ADM restrita.
