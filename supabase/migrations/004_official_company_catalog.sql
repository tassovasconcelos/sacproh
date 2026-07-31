-- GRIT SAC 4.0 - cadastro oficial recebido em 30/07/2026
-- Fonte: ficha cadastral consolidada Health Clean e catálogo Procirúrgica 2026.
-- Dados bancários, referências comerciais e contatos pessoais foram deliberadamente excluídos.

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS legal_document VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);

CREATE UNIQUE INDEX IF NOT EXISTS units_legal_document_unique
  ON units (legal_document)
  WHERE legal_document IS NOT NULL;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
  ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO tenants (id, name, trade_name, document, settings)
VALUES (
  '48196341-0001-4000-8000-000000000001',
  'HEALTH CLEAN COMERCIAL LTDA',
  'Procirúrgica',
  '48.196.341/0001-00',
  jsonb_build_object(
    'brand', 'Procirúrgica',
    'brand_group', 'Grupo Prohospital',
    'sac_email', 'sac@prohospital.com.br',
    'service_phone', '(85) 3452-3100',
    'website', 'https://www.grupoprohospital.com.br',
    'catalog_reference', 'Catálogo Procirúrgica Produtos 2026'
  )
)
ON CONFLICT (document) DO UPDATE SET
  name = EXCLUDED.name,
  trade_name = EXCLUDED.trade_name,
  settings = tenants.settings || EXCLUDED.settings,
  updated_at = NOW(),
  is_active = TRUE;

WITH official_tenant AS (
  SELECT id FROM tenants WHERE document = '48.196.341/0001-00'
)
INSERT INTO units (tenant_id, code, name, city, state, legal_document, address, zip_code)
SELECT id, code, name, city, state, legal_document, address, zip_code
FROM official_tenant
CROSS JOIN (
  VALUES
    ('MATRIZ-SC', 'Health Clean Matriz — Itajaí', 'Itajaí', 'SC',
     '48.196.341/0001-00', 'Rua João Thomaz Pinto, 1570, Módulo 5, Galpão A — Canhanduba', '88.313-045'),
    ('FILIAL-CE', 'Health Clean Filial — Fortaleza', 'Fortaleza', 'CE',
     '48.196.341/0002-91', 'Rua Manoel Costa, 161 — Paupina', '60.873-540'),
    ('FILIAL-SP', 'Health Clean Filial — Itapevi', 'Itapevi', 'SP',
     '48.196.341/0003-72', 'Avenida Caio Cotrim, 1174 — Itaqui', '06.696-060')
) AS unit_data(code, name, city, state, legal_document, address, zip_code)
ON CONFLICT (tenant_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  legal_document = EXCLUDED.legal_document,
  address = EXCLUDED.address,
  zip_code = EXCLUDED.zip_code,
  is_active = TRUE;

WITH official_tenant AS (
  SELECT id FROM tenants WHERE document = '48.196.341/0001-00'
)
INSERT INTO product_families (tenant_id, name, code)
SELECT id, family_name, family_code
FROM official_tenant
CROSS JOIN (
  VALUES
    ('Mobilidade e Locomoção', 'MOBILIDADE'),
    ('Material de Consumo Médico', 'CONSUMO'),
    ('Estomias e Produtos Especializados', 'ESTOMIAS'),
    ('Urologia', 'UROLOGIA'),
    ('Terapia Respiratória', 'RESPIRATORIA')
) AS families(family_name, family_code)
WHERE NOT EXISTS (
  SELECT 1 FROM product_families pf
  WHERE pf.tenant_id = official_tenant.id AND pf.code = families.family_code
);

WITH official_tenant AS (
  SELECT id FROM tenants WHERE document = '48.196.341/0001-00'
), catalog(code_sku, name, model, family_code, description) AS (
  VALUES
    ('PRO10000', 'Cadeira de rodas', 'PRO10000', 'MOBILIDADE', NULL),
    ('PRO9000', 'Cadeira de rodas', 'PRO9000', 'MOBILIDADE', NULL),
    ('PRO8000', 'Cadeira de rodas', 'PRO8000', 'MOBILIDADE', NULL),
    ('PRO800', 'Cadeira de higienização', 'PRO800', 'MOBILIDADE', NULL),
    ('PRO700', 'Cadeira de higienização', 'PRO700', 'MOBILIDADE', NULL),
    ('PRO400', 'Cadeira de higienização', 'PRO400', 'MOBILIDADE', NULL),
    ('PRO300', 'Cadeira de higienização', 'PRO300', 'MOBILIDADE', NULL),
    ('PRO100', 'Cadeira de higienização', 'PRO100', 'MOBILIDADE', NULL),
    ('PRO2', 'Cama hospitalar', 'PRO2', 'MOBILIDADE', NULL),
    ('PRO2PLUS', 'Cama hospitalar', 'PRO2PLUS', 'MOBILIDADE', NULL),
    ('PRO3', 'Cama hospitalar', 'PRO3', 'MOBILIDADE', NULL),
    ('PRO3PLUS', 'Cama hospitalar', 'PRO3PLUS', 'MOBILIDADE', NULL),
    ('PRO-CLASSIC', 'Colchão pneumático', 'PRO Classic', 'MOBILIDADE', NULL),
    ('PRO6000', 'Cadeira de transporte', 'PRO6000', 'MOBILIDADE', NULL),
    ('PRO170', 'Andador com rodas', 'PRO170', 'MOBILIDADE', NULL),
    ('PRO160', 'Andador com rodas', 'PRO160', 'MOBILIDADE', NULL),
    ('PRO140', 'Andador sem rodas', 'PRO140', 'MOBILIDADE', NULL),
    ('PRO150', 'Andador sem rodas', 'PRO150', 'MOBILIDADE', NULL),
    ('PRO20', 'Bengala com quatro pontas cromada', 'PRO20', 'MOBILIDADE', NULL),
    ('PROMASK-TRIPLA', 'Máscara descartável tripla', 'PROMASK-TRIPLA', 'CONSUMO', NULL),
    ('AVENTAL-30G', 'Avental descartável', '30G', 'CONSUMO', NULL),
    ('AVENTAL-40G', 'Avental descartável', '40G', 'CONSUMO', NULL),
    ('BOLSA-UNITAR', 'Bolsa de colostomia e urostomia — peça única', 'Linha Unitar', 'ESTOMIAS', NULL),
    ('BOLSA-DUETTO', 'Bolsa de colostomia e urostomia — duas peças', 'Linha Duetto', 'ESTOMIAS', NULL),
    ('ACESSORIOS-CONFORTA', 'Acessórios para estomias', 'Linha Conforta', 'ESTOMIAS', NULL),
    ('CATETER-NELATON', 'Cateter uretral hidrofílico', 'Nelaton', 'UROLOGIA',
     'Produto de uso único para drenagem do sistema urinário, fabricado em TPU.'),
    ('CATETER-TIEMANN', 'Cateter uretral hidrofílico', 'Tiemann', 'UROLOGIA',
     'Produto de uso único para drenagem do sistema urinário, fabricado em TPU.'),
    ('CPAP-AUTO', 'CPAP automático', 'CPAP/APAP 4–20 cmH₂O', 'RESPIRATORIA',
     'CPAP automático para tratamento da apneia do sono.'),
    ('MASCARA-CPAP-NASAL', 'Máscara nasal para CPAP', 'Nasal', 'RESPIRATORIA', NULL)
)
INSERT INTO products (
  tenant_id, family_id, code_sku, name, model, brand, description, country_origin
)
SELECT
  ot.id, pf.id, c.code_sku, c.name, c.model, 'Procirúrgica', c.description, NULL
FROM official_tenant ot
JOIN catalog c ON TRUE
JOIN product_families pf
  ON pf.tenant_id = ot.id AND pf.code = c.family_code
ON CONFLICT (tenant_id, code_sku) DO UPDATE SET
  family_id = EXCLUDED.family_id,
  name = EXCLUDED.name,
  model = EXCLUDED.model,
  brand = EXCLUDED.brand,
  description = EXCLUDED.description,
  is_active = TRUE;


