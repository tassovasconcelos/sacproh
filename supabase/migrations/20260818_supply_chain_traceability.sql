-- SAC 4.0: snapshot auditavel da cadeia de fornecimento por item do chamado.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS manufacturer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS importer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS distributor_name VARCHAR(255);

ALTER TABLE ticket_items
  ADD COLUMN IF NOT EXISTS manufacturing_date DATE,
  ADD COLUMN IF NOT EXISTS manufacturer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS importer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS distributor_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS retailer_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS ticket_items_lot_trace_idx
  ON ticket_items (lot_number, expiration_date)
  WHERE lot_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS ticket_items_chain_trace_idx
  ON ticket_items (manufacturer_name, importer_name, distributor_name)
  WHERE manufacturer_name IS NOT NULL OR importer_name IS NOT NULL OR distributor_name IS NOT NULL;
