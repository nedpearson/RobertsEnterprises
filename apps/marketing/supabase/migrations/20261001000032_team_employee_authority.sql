-- Authoritative Team / Employees domain.
--
-- Authorization remains exclusively in business_memberships. Employment metadata
-- (department, job title, lifecycle, contact details) is tenant-scoped here so
-- role/access decisions are never inferred from a profile title or settings blob.

CREATE UNIQUE INDEX IF NOT EXISTS uq_business_memberships_business_user
  ON public.business_memberships(business_id, user_id);

CREATE TABLE IF NOT EXISTS public.team_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_department_name
  ON public.team_departments(business_id, lower(name));

CREATE TABLE IF NOT EXISTS public.team_job_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.team_departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_job_title_name
  ON public.team_job_titles(business_id, lower(name));

CREATE TABLE IF NOT EXISTS public.team_employee_profiles (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  work_email text,
  phone text,
  department_id uuid REFERENCES public.team_departments(id) ON DELETE SET NULL,
  job_title_id uuid REFERENCES public.team_job_titles(id) ON DELETE SET NULL,
  employment_status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (employment_status IN ('INVITED','ACTIVE','LEAVE','SUSPENDED','TERMINATED','ARCHIVED')),
  start_date date,
  end_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, user_id),
  CONSTRAINT team_employee_membership_fk
    FOREIGN KEY (business_id, user_id)
    REFERENCES public.business_memberships(business_id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT team_employee_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_team_employee_status
  ON public.team_employee_profiles(business_id, employment_status, display_name);
CREATE INDEX IF NOT EXISTS idx_team_employee_department
  ON public.team_employee_profiles(business_id, department_id);
CREATE INDEX IF NOT EXISTS idx_team_employee_job_title
  ON public.team_employee_profiles(business_id, job_title_id);

-- Backfill every existing tenant membership. staff_profiles is used only as a
-- compatibility source for the human-readable name; membership is authoritative.
INSERT INTO public.team_employee_profiles (
  business_id,
  user_id,
  display_name,
  employment_status,
  created_at,
  updated_at
)
SELECT
  bm.business_id,
  bm.user_id,
  COALESCE(NULLIF(BTRIM(sp.name), ''), 'Team Member'),
  CASE
    WHEN COALESCE(UPPER(BTRIM(bm.status)), 'ACTIVE') = 'ACTIVE' THEN 'ACTIVE'
    ELSE 'SUSPENDED'
  END,
  COALESCE(bm.created_at, now()),
  now()
FROM public.business_memberships bm
LEFT JOIN public.staff_profiles sp ON sp.id = bm.user_id
WHERE public.canonical_workspace_role(bm.role) IS NOT NULL
ON CONFLICT (business_id, user_id) DO UPDATE
SET display_name = CASE
      WHEN public.team_employee_profiles.display_name = 'Team Member'
        THEN EXCLUDED.display_name
      ELSE public.team_employee_profiles.display_name
    END,
    updated_at = now();

ALTER TABLE public.team_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_employee_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members read departments" ON public.team_departments;
CREATE POLICY "Team members read departments" ON public.team_departments
FOR SELECT USING (public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "Managers manage departments" ON public.team_departments;
CREATE POLICY "Managers manage departments" ON public.team_departments
FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

DROP POLICY IF EXISTS "Team members read job titles" ON public.team_job_titles;
CREATE POLICY "Team members read job titles" ON public.team_job_titles
FOR SELECT USING (public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "Managers manage job titles" ON public.team_job_titles;
CREATE POLICY "Managers manage job titles" ON public.team_job_titles
FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

DROP POLICY IF EXISTS "Team members read employee profiles" ON public.team_employee_profiles;
CREATE POLICY "Team members read employee profiles" ON public.team_employee_profiles
FOR SELECT USING (public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "Managers manage employee profiles" ON public.team_employee_profiles;
CREATE POLICY "Managers manage employee profiles" ON public.team_employee_profiles
FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

-- Keep profile lifecycle aligned with tenant membership lifecycle. This is a
-- projection only; business_memberships remains the authorization source.
CREATE OR REPLACE FUNCTION public.sync_team_employee_membership_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.team_employee_profiles
  SET employment_status = CASE
        WHEN COALESCE(UPPER(BTRIM(NEW.status)), 'ACTIVE') = 'ACTIVE'
          AND employment_status IN ('INVITED','SUSPENDED') THEN 'ACTIVE'
        WHEN COALESCE(UPPER(BTRIM(NEW.status)), 'ACTIVE') <> 'ACTIVE'
          AND employment_status NOT IN ('TERMINATED','ARCHIVED') THEN 'SUSPENDED'
        ELSE employment_status
      END,
      updated_at = now()
  WHERE business_id = NEW.business_id
    AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_team_employee_membership_status ON public.business_memberships;
CREATE TRIGGER trg_sync_team_employee_membership_status
AFTER UPDATE OF status ON public.business_memberships
FOR EACH ROW EXECUTE FUNCTION public.sync_team_employee_membership_status();
