-- 20260809000011_integration_webhook_secret_encryption.sql
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS webhook_secret_ciphertext TEXT;

COMMENT ON COLUMN integrations.webhook_secret IS 'LEGACY ONLY: do not write new webhook secrets here.';
COMMENT ON COLUMN integrations.webhook_secret_ciphertext IS 'AES-256-GCM ciphertext for integration webhook signing secrets.';
