-- ==========================================================================
-- Platform failed-job recovery state and privileged status mutation.
-- ==========================================================================

ALTER TABLE public.platform_failed_jobs
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution text;

ALTER TABLE public.platform_failed_jobs
  DROP CONSTRAINT IF EXISTS platform_failed_jobs_status_check;

ALTER TABLE public.platform_failed_jobs
  ADD CONSTRAINT platform_failed_jobs_status_check
  CHECK (status IN ('FAILED','RETRYING','MANUAL_REVIEW','PROCESSING','RECOVERED','CANCELLED'));

CREATE INDEX IF NOT EXISTS idx_platform_failed_jobs_business_status
  ON public.platform_failed_jobs(business_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.platform_set_failed_job_status(
  p_job_id uuid,
  p_status text,
  p_resolution text DEFAULT NULL,
  p_increment_attempt boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before public.platform_failed_jobs;
  v_after public.platform_failed_jobs;
  v_status text := upper(p_status);
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
  END IF;
  IF v_status NOT IN ('FAILED','RETRYING','MANUAL_REVIEW','PROCESSING','RECOVERED','CANCELLED') THEN
    RAISE EXCEPTION 'Invalid failed-job status';
  END IF;

  SELECT * INTO v_before FROM public.platform_failed_jobs WHERE id = p_job_id;
  IF v_before.id IS NULL THEN RAISE EXCEPTION 'Failed job not found'; END IF;

  UPDATE public.platform_failed_jobs
  SET status = v_status,
      attempts = attempts + CASE WHEN p_increment_attempt THEN 1 ELSE 0 END,
      resolution = COALESCE(p_resolution, resolution),
      resolved_at = CASE WHEN v_status IN ('RECOVERED','CANCELLED') THEN now() ELSE NULL END,
      next_retry_at = CASE WHEN v_status IN ('RECOVERED','CANCELLED','MANUAL_REVIEW') THEN NULL ELSE next_retry_at END,
      updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_after;

  PERFORM public.log_platform_event(
    'PLATFORM_FAILED_JOB_STATUS_CHANGED',
    p_job_id,
    'platform_failed_job',
    jsonb_build_object(
      'organization_id', v_after.business_id,
      'job_type', v_after.job_type,
      'before', v_before.status,
      'after', v_after.status,
      'attempts', v_after.attempts,
      'resolution', v_after.resolution
    )
  );

  RETURN to_jsonb(v_after);
END;
$$;
