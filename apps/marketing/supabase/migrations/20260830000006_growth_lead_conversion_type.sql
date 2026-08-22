-- 20260830000006_growth_lead_conversion_type.sql
-- The marketing funnel must distinguish all acquired leads from qualified leads.
ALTER TABLE public.growth_verified_conversions
  DROP CONSTRAINT IF EXISTS growth_verified_conversions_conversion_type_check;

ALTER TABLE public.growth_verified_conversions
  ADD CONSTRAINT growth_verified_conversions_conversion_type_check CHECK (conversion_type IN (
    'lead',
    'qualified_lead',
    'appointment_booked',
    'appointment_attended',
    'purchase',
    'refund'
  ));
