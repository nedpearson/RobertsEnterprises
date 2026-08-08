-- 20260807000002_indexing_and_realtime.sql
-- Optimized database indexes and real-time replication enablement

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_employee ON public.appointments(employee_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_at ON public.appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_recs_request ON public.appointment_assignment_recommendations(request_id);
CREATE INDEX IF NOT EXISTS idx_schedules_employee_date ON public.employee_schedules(employee_id, shift_date);

-- Ensure the tables are added to the real-time publication safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'appointment_holds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_holds;
  END IF;
END $$;
