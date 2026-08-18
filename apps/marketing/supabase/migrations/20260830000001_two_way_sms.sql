ALTER TABLE customers ADD COLUMN sms_opt_in BOOLEAN DEFAULT false;

ALTER TABLE messages 
ADD COLUMN channel TEXT DEFAULT 'sms',
ADD COLUMN status TEXT DEFAULT 'sent',
ADD COLUMN external_id TEXT,
ADD COLUMN direction TEXT DEFAULT 'outbound';
