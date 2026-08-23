-- Existing website form shadow intake.
--
-- The storefront form remains the customer-facing source and continues sending
-- its current emails. VowOS receives a second, authenticated copy through the
-- worker and stores the raw (redacted) submission plus the appointment request
-- it created. Provider submission ids make retries safe.

ALTER TABLE form_submissions
  ADD COLUMN IF NOT EXISTS source_provider TEXT,
  ADD COLUMN IF NOT EXISTS external_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS source_domain TEXT,
  ADD COLUMN IF NOT EXISTS appointment_request_id UUID REFERENCES appointment_requests(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS form_submissions_provider_external_unique
  ON form_submissions (business_id, source_provider, external_submission_id)
  WHERE source_provider IS NOT NULL AND external_submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS form_submissions_appointment_request_idx
  ON form_submissions (appointment_request_id)
  WHERE appointment_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS form_submissions_source_domain_created_idx
  ON form_submissions (business_id, source_domain, created_at DESC)
  WHERE source_domain IS NOT NULL;
