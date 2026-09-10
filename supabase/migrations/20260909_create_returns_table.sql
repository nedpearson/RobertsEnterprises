CREATE TABLE IF NOT EXISTS returns (
  return_id text PRIMARY KEY,
  business_id uuid,
  location_id text,
  vendor text NOT NULL,
  items integer NOT NULL DEFAULT 1,
  value_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft',
  date date NOT NULL,
  reason text NOT NULL,
  gown_id uuid,
  gown_name text,
  invoice_id text,
  tracking_number text,
  carrier text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
