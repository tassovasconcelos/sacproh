-- ==========================================
-- GRIT SAC 4.0 - Initial Seed Data for Procirúrgica
-- ==========================================

-- 1. Tenants
INSERT INTO tenants (id, name, trade_name, document) VALUES
('11111111-1111-1111-1111-111111111111', 'Procirúrgica Hospitalar Ltda', 'Procirúrgica', '12.345.678/0001-90'),
('22222222-2222-2222-2222-222222222222', 'Grupo Prohospital S.A.', 'Prohospital', '98.765.432/0001-10')
ON CONFLICT DO NOTHING;

-- 2. Units
INSERT INTO units (id, tenant_id, code, name, city, state) VALUES
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'MATRIZ', 'Procirúrgica Matriz Fortaleza', 'Fortaleza', 'CE'),
('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'LOJA-01', 'Procirúrgica Aldeota', 'Fortaleza', 'CE'),
('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'LOJA-02', 'Procirúrgica Recife', 'Recife', 'PE')
ON CONFLICT DO NOTHING;

-- 3. Roles
INSERT INTO roles (code, name, description) VALUES
('SUPERADMIN', 'Superadministrador GRIT', 'Acesso global multi-tenant e gestão da plataforma'),
('DIRETORIA', 'Diretoria / Executivo', 'Visão analítica, custos, relatórios estratégicos e aprovações'),
('RESPONSAVEL_TECNICA', 'Responsável Técnica / Farmacêutica', 'Classificação regulatória, risco ao usuário, parecer ANVISA e ações de qualidade'),
('TECNICO', 'Técnico Especializado', 'Atendimento de assistência técnica, laudos, visitas e peças'),
('GERENTE_LOJA', 'Gerente de Loja / Unidade', 'Abertura e acompanhamento dos chamados da sua unidade'),
('SAC', 'Pós-Venda / SAC', 'Abertura, triagem, contato com cliente e controle de retornos'),
('LOGISTICA', 'Logística', 'Gestão de coletas, devoluções, fretes e transportadoras'),
('ADMIN_EMPRESA', 'Administrador da Empresa', 'Gestão de usuários, parâmetros e cadastros do tenant')
ON CONFLICT DO NOTHING;

-- 4. Sample Customers
INSERT INTO customers (id, tenant_id, type, name, trade_name, document, email, phone, whatsapp, city, state) VALUES
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'HOSPITAL', 'Hospital São Mateus Ltda', 'Hospital São Mateus', '07.123.456/0001-88', 'sac@saomateus.com.br', '(85) 3456-7890', '(85) 99876-5432', 'Fortaleza', 'CE'),
('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'CLINIC', 'Clínica Cirúrgica Monte Sina', 'Clínica Monte Sina', '14.987.654/0001-22', 'compras@montesina.com', '(81) 3222-1100', '(81) 98888-2211', 'Recife', 'PE'),
('c3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'PF', 'Dr. Roberto Vasconcelos', 'Dr. Roberto', '123.456.789-00', 'dr.roberto@gmail.com', '(85) 98765-4321', '(85) 98765-4321', 'Fortaleza', 'CE')
ON CONFLICT DO NOTHING;

-- 5. Product Families & Products
INSERT INTO product_families (id, tenant_id, name, code) VALUES
('f1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Equipamentos Eletromédicos', 'EQP'),
('f2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Correlatos / Descartáveis Cirúrgicos', 'DES'),
('f3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Mobiliário Hospitalar', 'MOB')
ON CONFLICT DO NOTHING;

INSERT INTO products (id, tenant_id, family_id, code_sku, name, model, anvisa_register, supplier_name, country_origin) VALUES
('p1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'BIST-ELECT-01', 'Bisturi Eletrônico Alta Frequência', 'HF-400W', '10234567890', 'Wem Equipamentos', 'Brasil'),
('p2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'MONIT-PARAM-02', 'Monitor Multiparamétrico Vitals', 'V-12 Touch', '80123456789', 'Mindray Bio-Medical', 'China'),
('p3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222', 'LUVA-STER-80', 'Luva Cirúrgica Estéril Par Tam 8.0', 'Latex Powder Free', '10112233445', 'Semperit', 'Malásia')
ON CONFLICT DO NOTHING;
