CREATE TABLE IF NOT EXISTS carriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  legal_name VARCHAR(255) NOT NULL, trade_name VARCHAR(255), document VARCHAR(30), contact_name VARCHAR(255),
  email VARCHAR(255), phone VARCHAR(50), qualification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (qualification_status IN ('PENDING','QUALIFIED','SUSPENDED','REJECTED')),
  score NUMERIC(5,2) CHECK (score BETWEEN 0 AND 100), is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(tenant_id,document)
);
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS carriers_tenant_access ON carriers;
CREATE POLICY carriers_tenant_access ON carriers FOR ALL TO authenticated
  USING (tenant_id=user_tenant_id()) WITH CHECK (tenant_id=user_tenant_id());

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES carriers(id),
  ADD COLUMN IF NOT EXISTS qualification_stage VARCHAR(40) NOT NULL DEFAULT 'REGISTRATION',
  ADD COLUMN IF NOT EXISTS qualification_notes TEXT,
  ADD COLUMN IF NOT EXISTS qualification_updated_at TIMESTAMPTZ;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('sac-attachments','sac-attachments',FALSE,52428800,ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'])
ON CONFLICT(id) DO UPDATE SET file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS sac_attachments_read ON storage.objects;
DROP POLICY IF EXISTS sac_attachments_insert ON storage.objects;
CREATE POLICY sac_attachments_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='sac-attachments' AND (storage.foldername(name))[1]=user_tenant_id()::text);
CREATE POLICY sac_attachments_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='sac-attachments' AND (storage.foldername(name))[1]=user_tenant_id()::text);
