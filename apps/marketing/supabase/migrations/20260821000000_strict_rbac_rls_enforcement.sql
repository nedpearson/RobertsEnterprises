-- 20260821000000_strict_rbac_rls_enforcement.sql
-- Final Audit: Convert all overly permissive "FOR ALL" policies to strict RBAC

CREATE OR REPLACE FUNCTION public.user_has_role(check_business_id uuid, allowed_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.business_memberships
    WHERE business_id = check_business_id
    AND user_id = auth.uid()
    AND role = ANY(allowed_roles)
    AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Enable all access for business members" ON rooms;
DROP POLICY IF EXISTS "Members can view rooms" ON rooms;
CREATE POLICY "Members can view rooms" ON rooms FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify rooms" ON rooms;
CREATE POLICY "Managers can modify rooms" ON rooms FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update rooms" ON rooms;
CREATE POLICY "Managers can update rooms" ON rooms FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete rooms" ON rooms;
CREATE POLICY "Managers can delete rooms" ON rooms FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_services;
DROP POLICY IF EXISTS "Members can view appointment_services" ON appointment_services;
CREATE POLICY "Members can view appointment_services" ON appointment_services FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify appointment_services" ON appointment_services;
CREATE POLICY "Managers can modify appointment_services" ON appointment_services FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update appointment_services" ON appointment_services;
CREATE POLICY "Managers can update appointment_services" ON appointment_services FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete appointment_services" ON appointment_services;
CREATE POLICY "Managers can delete appointment_services" ON appointment_services FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON employee_service_eligibility;
DROP POLICY IF EXISTS "Members can view employee_service_eligibility" ON employee_service_eligibility;
CREATE POLICY "Members can view employee_service_eligibility" ON employee_service_eligibility FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify employee_service_eligibility" ON employee_service_eligibility;
CREATE POLICY "Managers can modify employee_service_eligibility" ON employee_service_eligibility FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update employee_service_eligibility" ON employee_service_eligibility;
CREATE POLICY "Managers can update employee_service_eligibility" ON employee_service_eligibility FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete employee_service_eligibility" ON employee_service_eligibility;
CREATE POLICY "Managers can delete employee_service_eligibility" ON employee_service_eligibility FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON employee_schedules;
DROP POLICY IF EXISTS "Members can view employee_schedules" ON employee_schedules;
CREATE POLICY "Members can view employee_schedules" ON employee_schedules FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify employee_schedules" ON employee_schedules;
CREATE POLICY "Managers can modify employee_schedules" ON employee_schedules FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update employee_schedules" ON employee_schedules;
CREATE POLICY "Managers can update employee_schedules" ON employee_schedules FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete employee_schedules" ON employee_schedules;
CREATE POLICY "Managers can delete employee_schedules" ON employee_schedules FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_requests;
DROP POLICY IF EXISTS "Members can view appointment_requests" ON appointment_requests;
CREATE POLICY "Members can view appointment_requests" ON appointment_requests FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify appointment_requests" ON appointment_requests;
CREATE POLICY "Managers can modify appointment_requests" ON appointment_requests FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update appointment_requests" ON appointment_requests;
CREATE POLICY "Managers can update appointment_requests" ON appointment_requests FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete appointment_requests" ON appointment_requests;
CREATE POLICY "Managers can delete appointment_requests" ON appointment_requests FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_holds;
DROP POLICY IF EXISTS "Members can view appointment_holds" ON appointment_holds;
CREATE POLICY "Members can view appointment_holds" ON appointment_holds FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify appointment_holds" ON appointment_holds;
CREATE POLICY "Managers can modify appointment_holds" ON appointment_holds FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update appointment_holds" ON appointment_holds;
CREATE POLICY "Managers can update appointment_holds" ON appointment_holds FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete appointment_holds" ON appointment_holds;
CREATE POLICY "Managers can delete appointment_holds" ON appointment_holds FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_audit_events;
DROP POLICY IF EXISTS "Members can view appointment_audit_events" ON appointment_audit_events;
CREATE POLICY "Members can view appointment_audit_events" ON appointment_audit_events FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify appointment_audit_events" ON appointment_audit_events;
CREATE POLICY "Managers can modify appointment_audit_events" ON appointment_audit_events FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update appointment_audit_events" ON appointment_audit_events;
CREATE POLICY "Managers can update appointment_audit_events" ON appointment_audit_events FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete appointment_audit_events" ON appointment_audit_events;
CREATE POLICY "Managers can delete appointment_audit_events" ON appointment_audit_events FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON employee_schedule_breaks;
DROP POLICY IF EXISTS "Members can view employee_schedule_breaks" ON employee_schedule_breaks;
CREATE POLICY "Members can view employee_schedule_breaks" ON employee_schedule_breaks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM employee_schedules
    WHERE employee_schedules.id = employee_schedule_breaks.schedule_id
    AND public.user_has_role(employee_schedules.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist'])
  )
);
DROP POLICY IF EXISTS "Managers can modify employee_schedule_breaks" ON employee_schedule_breaks;
CREATE POLICY "Managers can modify employee_schedule_breaks" ON employee_schedule_breaks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee_schedules
    WHERE employee_schedules.id = employee_schedule_breaks.schedule_id
    AND public.user_has_role(employee_schedules.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can update employee_schedule_breaks" ON employee_schedule_breaks;
CREATE POLICY "Managers can update employee_schedule_breaks" ON employee_schedule_breaks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM employee_schedules
    WHERE employee_schedules.id = employee_schedule_breaks.schedule_id
    AND public.user_has_role(employee_schedules.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can delete employee_schedule_breaks" ON employee_schedule_breaks;
CREATE POLICY "Managers can delete employee_schedule_breaks" ON employee_schedule_breaks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM employee_schedules
    WHERE employee_schedules.id = employee_schedule_breaks.schedule_id
    AND public.user_has_role(employee_schedules.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_request_location_preferences;
DROP POLICY IF EXISTS "Members can view appointment_request_location_preferences" ON appointment_request_location_preferences;
CREATE POLICY "Members can view appointment_request_location_preferences" ON appointment_request_location_preferences FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_request_location_preferences.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist'])
  )
);
DROP POLICY IF EXISTS "Managers can modify appointment_request_location_preferences" ON appointment_request_location_preferences;
CREATE POLICY "Managers can modify appointment_request_location_preferences" ON appointment_request_location_preferences FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_request_location_preferences.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can update appointment_request_location_preferences" ON appointment_request_location_preferences;
CREATE POLICY "Managers can update appointment_request_location_preferences" ON appointment_request_location_preferences FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_request_location_preferences.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can delete appointment_request_location_preferences" ON appointment_request_location_preferences;
CREATE POLICY "Managers can delete appointment_request_location_preferences" ON appointment_request_location_preferences FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_request_location_preferences.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_assignment_recommendations;
DROP POLICY IF EXISTS "Members can view appointment_assignment_recommendations" ON appointment_assignment_recommendations;
CREATE POLICY "Members can view appointment_assignment_recommendations" ON appointment_assignment_recommendations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_assignment_recommendations.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist'])
  )
);
DROP POLICY IF EXISTS "Managers can modify appointment_assignment_recommendations" ON appointment_assignment_recommendations;
CREATE POLICY "Managers can modify appointment_assignment_recommendations" ON appointment_assignment_recommendations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_assignment_recommendations.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can update appointment_assignment_recommendations" ON appointment_assignment_recommendations;
CREATE POLICY "Managers can update appointment_assignment_recommendations" ON appointment_assignment_recommendations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_assignment_recommendations.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can delete appointment_assignment_recommendations" ON appointment_assignment_recommendations;
CREATE POLICY "Managers can delete appointment_assignment_recommendations" ON appointment_assignment_recommendations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_assignment_recommendations.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);

DROP POLICY IF EXISTS "Enable access to own calendar connection" ON employee_calendar_connections;
DROP POLICY IF EXISTS "Users can access own employee_calendar_connections" ON employee_calendar_connections;
CREATE POLICY "Users can access own employee_calendar_connections" ON employee_calendar_connections FOR ALL USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "Enable all access for business members" ON files;
DROP POLICY IF EXISTS "Members can view files" ON files;
CREATE POLICY "Members can view files" ON files FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify files" ON files;
CREATE POLICY "Managers can modify files" ON files FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update files" ON files;
CREATE POLICY "Managers can update files" ON files FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete files" ON files;
CREATE POLICY "Managers can delete files" ON files FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON file_versions;
DROP POLICY IF EXISTS "Members can view file_versions" ON file_versions;
CREATE POLICY "Members can view file_versions" ON file_versions FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify file_versions" ON file_versions;
CREATE POLICY "Managers can modify file_versions" ON file_versions FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update file_versions" ON file_versions;
CREATE POLICY "Managers can update file_versions" ON file_versions FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete file_versions" ON file_versions;
CREATE POLICY "Managers can delete file_versions" ON file_versions FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON file_links;
DROP POLICY IF EXISTS "Members can view file_links" ON file_links;
CREATE POLICY "Members can view file_links" ON file_links FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify file_links" ON file_links;
CREATE POLICY "Managers can modify file_links" ON file_links FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update file_links" ON file_links;
CREATE POLICY "Managers can update file_links" ON file_links FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete file_links" ON file_links;
CREATE POLICY "Managers can delete file_links" ON file_links FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON file_permissions;
DROP POLICY IF EXISTS "Members can view file_permissions" ON file_permissions;
CREATE POLICY "Members can view file_permissions" ON file_permissions FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify file_permissions" ON file_permissions;
CREATE POLICY "Managers can modify file_permissions" ON file_permissions FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update file_permissions" ON file_permissions;
CREATE POLICY "Managers can update file_permissions" ON file_permissions FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete file_permissions" ON file_permissions;
CREATE POLICY "Managers can delete file_permissions" ON file_permissions FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON communication_threads;
DROP POLICY IF EXISTS "Members can view communication_threads" ON communication_threads;
CREATE POLICY "Members can view communication_threads" ON communication_threads FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify communication_threads" ON communication_threads;
CREATE POLICY "Managers can modify communication_threads" ON communication_threads FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update communication_threads" ON communication_threads;
CREATE POLICY "Managers can update communication_threads" ON communication_threads FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete communication_threads" ON communication_threads;
CREATE POLICY "Managers can delete communication_threads" ON communication_threads FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON communications;
DROP POLICY IF EXISTS "Members can view communications" ON communications;
CREATE POLICY "Members can view communications" ON communications FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify communications" ON communications;
CREATE POLICY "Managers can modify communications" ON communications FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update communications" ON communications;
CREATE POLICY "Managers can update communications" ON communications FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete communications" ON communications;
CREATE POLICY "Managers can delete communications" ON communications FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON communication_attachments;
DROP POLICY IF EXISTS "Members can view communication_attachments" ON communication_attachments;
CREATE POLICY "Members can view communication_attachments" ON communication_attachments FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify communication_attachments" ON communication_attachments;
CREATE POLICY "Managers can modify communication_attachments" ON communication_attachments FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update communication_attachments" ON communication_attachments;
CREATE POLICY "Managers can update communication_attachments" ON communication_attachments FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete communication_attachments" ON communication_attachments;
CREATE POLICY "Managers can delete communication_attachments" ON communication_attachments FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON communication_delivery_events;
DROP POLICY IF EXISTS "Members can view communication_delivery_events" ON communication_delivery_events;
CREATE POLICY "Members can view communication_delivery_events" ON communication_delivery_events FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify communication_delivery_events" ON communication_delivery_events;
CREATE POLICY "Managers can modify communication_delivery_events" ON communication_delivery_events FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update communication_delivery_events" ON communication_delivery_events;
CREATE POLICY "Managers can update communication_delivery_events" ON communication_delivery_events FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete communication_delivery_events" ON communication_delivery_events;
CREATE POLICY "Managers can delete communication_delivery_events" ON communication_delivery_events FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON call_logs;
DROP POLICY IF EXISTS "Members can view call_logs" ON call_logs;
CREATE POLICY "Members can view call_logs" ON call_logs FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify call_logs" ON call_logs;
CREATE POLICY "Managers can modify call_logs" ON call_logs FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update call_logs" ON call_logs;
CREATE POLICY "Managers can update call_logs" ON call_logs FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete call_logs" ON call_logs;
CREATE POLICY "Managers can delete call_logs" ON call_logs FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_notes;
DROP POLICY IF EXISTS "Members can view appointment_notes" ON appointment_notes;
CREATE POLICY "Members can view appointment_notes" ON appointment_notes FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify appointment_notes" ON appointment_notes;
CREATE POLICY "Managers can modify appointment_notes" ON appointment_notes FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update appointment_notes" ON appointment_notes;
CREATE POLICY "Managers can update appointment_notes" ON appointment_notes FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete appointment_notes" ON appointment_notes;
CREATE POLICY "Managers can delete appointment_notes" ON appointment_notes FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON customer_notes;
DROP POLICY IF EXISTS "Members can view customer_notes" ON customer_notes;
CREATE POLICY "Members can view customer_notes" ON customer_notes FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify customer_notes" ON customer_notes;
CREATE POLICY "Managers can modify customer_notes" ON customer_notes FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update customer_notes" ON customer_notes;
CREATE POLICY "Managers can update customer_notes" ON customer_notes FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete customer_notes" ON customer_notes;
CREATE POLICY "Managers can delete customer_notes" ON customer_notes FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON employee_notes;
DROP POLICY IF EXISTS "Members can view employee_notes" ON employee_notes;
CREATE POLICY "Members can view employee_notes" ON employee_notes FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify employee_notes" ON employee_notes;
CREATE POLICY "Managers can modify employee_notes" ON employee_notes FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update employee_notes" ON employee_notes;
CREATE POLICY "Managers can update employee_notes" ON employee_notes FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete employee_notes" ON employee_notes;
CREATE POLICY "Managers can delete employee_notes" ON employee_notes FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON tasks;
DROP POLICY IF EXISTS "Members can view tasks" ON tasks;
CREATE POLICY "Members can view tasks" ON tasks FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify tasks" ON tasks;
CREATE POLICY "Managers can modify tasks" ON tasks FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update tasks" ON tasks;
CREATE POLICY "Managers can update tasks" ON tasks FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete tasks" ON tasks;
CREATE POLICY "Managers can delete tasks" ON tasks FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON task_assignments;
DROP POLICY IF EXISTS "Members can view task_assignments" ON task_assignments;
CREATE POLICY "Members can view task_assignments" ON task_assignments FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify task_assignments" ON task_assignments;
CREATE POLICY "Managers can modify task_assignments" ON task_assignments FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update task_assignments" ON task_assignments;
CREATE POLICY "Managers can update task_assignments" ON task_assignments FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete task_assignments" ON task_assignments;
CREATE POLICY "Managers can delete task_assignments" ON task_assignments FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON task_events;
DROP POLICY IF EXISTS "Members can view task_events" ON task_events;
CREATE POLICY "Members can view task_events" ON task_events FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify task_events" ON task_events;
CREATE POLICY "Managers can modify task_events" ON task_events FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update task_events" ON task_events;
CREATE POLICY "Managers can update task_events" ON task_events FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete task_events" ON task_events;
CREATE POLICY "Managers can delete task_events" ON task_events FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON payments;
DROP POLICY IF EXISTS "Members can view payments" ON payments;
CREATE POLICY "Members can view payments" ON payments FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify payments" ON payments;
CREATE POLICY "Managers can modify payments" ON payments FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update payments" ON payments;
CREATE POLICY "Managers can update payments" ON payments FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete payments" ON payments;
CREATE POLICY "Managers can delete payments" ON payments FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON booking_fees;
DROP POLICY IF EXISTS "Members can view booking_fees" ON booking_fees;
CREATE POLICY "Members can view booking_fees" ON booking_fees FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify booking_fees" ON booking_fees;
CREATE POLICY "Managers can modify booking_fees" ON booking_fees FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update booking_fees" ON booking_fees;
CREATE POLICY "Managers can update booking_fees" ON booking_fees FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete booking_fees" ON booking_fees;
CREATE POLICY "Managers can delete booking_fees" ON booking_fees FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON refunds;
DROP POLICY IF EXISTS "Members can view refunds" ON refunds;
CREATE POLICY "Members can view refunds" ON refunds FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify refunds" ON refunds;
CREATE POLICY "Managers can modify refunds" ON refunds FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update refunds" ON refunds;
CREATE POLICY "Managers can update refunds" ON refunds FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete refunds" ON refunds;
CREATE POLICY "Managers can delete refunds" ON refunds FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON reminders;
DROP POLICY IF EXISTS "Members can view reminders" ON reminders;
CREATE POLICY "Members can view reminders" ON reminders FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify reminders" ON reminders;
CREATE POLICY "Managers can modify reminders" ON reminders FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update reminders" ON reminders;
CREATE POLICY "Managers can update reminders" ON reminders FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete reminders" ON reminders;
CREATE POLICY "Managers can delete reminders" ON reminders FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON reminder_events;
DROP POLICY IF EXISTS "Members can view reminder_events" ON reminder_events;
CREATE POLICY "Members can view reminder_events" ON reminder_events FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.reminders WHERE id = reminder_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify reminder_events" ON reminder_events;
CREATE POLICY "Managers can modify reminder_events" ON reminder_events FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.reminders WHERE id = reminder_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update reminder_events" ON reminder_events;
CREATE POLICY "Managers can update reminder_events" ON reminder_events FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.reminders WHERE id = reminder_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete reminder_events" ON reminder_events;
CREATE POLICY "Managers can delete reminder_events" ON reminder_events FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.reminders WHERE id = reminder_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable access to own calendar sync events" ON calendar_sync_events;
DROP POLICY IF EXISTS "Users can access own calendar_sync_events" ON calendar_sync_events;
CREATE POLICY "Users can access own calendar_sync_events" ON calendar_sync_events FOR ALL USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "Enable all access for business members" ON customer_preferences;
DROP POLICY IF EXISTS "Members can view customer_preferences" ON customer_preferences;
CREATE POLICY "Members can view customer_preferences" ON customer_preferences FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify customer_preferences" ON customer_preferences;
CREATE POLICY "Managers can modify customer_preferences" ON customer_preferences FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update customer_preferences" ON customer_preferences;
CREATE POLICY "Managers can update customer_preferences" ON customer_preferences FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete customer_preferences" ON customer_preferences;
CREATE POLICY "Managers can delete customer_preferences" ON customer_preferences FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON employee_time_off;
DROP POLICY IF EXISTS "Members can view employee_time_off" ON employee_time_off;
CREATE POLICY "Members can view employee_time_off" ON employee_time_off FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify employee_time_off" ON employee_time_off;
CREATE POLICY "Managers can modify employee_time_off" ON employee_time_off FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update employee_time_off" ON employee_time_off;
CREATE POLICY "Managers can update employee_time_off" ON employee_time_off FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete employee_time_off" ON employee_time_off;
CREATE POLICY "Managers can delete employee_time_off" ON employee_time_off FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON communication_recipients;
DROP POLICY IF EXISTS "Members can view communication_recipients" ON communication_recipients;
CREATE POLICY "Members can view communication_recipients" ON communication_recipients FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify communication_recipients" ON communication_recipients;
CREATE POLICY "Managers can modify communication_recipients" ON communication_recipients FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update communication_recipients" ON communication_recipients;
CREATE POLICY "Managers can update communication_recipients" ON communication_recipients FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete communication_recipients" ON communication_recipients;
CREATE POLICY "Managers can delete communication_recipients" ON communication_recipients FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON vendors;
DROP POLICY IF EXISTS "Members can view vendors" ON vendors;
CREATE POLICY "Members can view vendors" ON vendors FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify vendors" ON vendors;
CREATE POLICY "Managers can modify vendors" ON vendors FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update vendors" ON vendors;
CREATE POLICY "Managers can update vendors" ON vendors FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete vendors" ON vendors;
CREATE POLICY "Managers can delete vendors" ON vendors FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON brands;
DROP POLICY IF EXISTS "Members can view brands" ON brands;
CREATE POLICY "Members can view brands" ON brands FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify brands" ON brands;
CREATE POLICY "Managers can modify brands" ON brands FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update brands" ON brands;
CREATE POLICY "Managers can update brands" ON brands FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete brands" ON brands;
CREATE POLICY "Managers can delete brands" ON brands FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON collections;
DROP POLICY IF EXISTS "Members can view collections" ON collections;
CREATE POLICY "Members can view collections" ON collections FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify collections" ON collections;
CREATE POLICY "Managers can modify collections" ON collections FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update collections" ON collections;
CREATE POLICY "Managers can update collections" ON collections FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete collections" ON collections;
CREATE POLICY "Managers can delete collections" ON collections FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON size_systems;
DROP POLICY IF EXISTS "Members can view size_systems" ON size_systems;
CREATE POLICY "Members can view size_systems" ON size_systems FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify size_systems" ON size_systems;
CREATE POLICY "Managers can modify size_systems" ON size_systems FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update size_systems" ON size_systems;
CREATE POLICY "Managers can update size_systems" ON size_systems FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete size_systems" ON size_systems;
CREATE POLICY "Managers can delete size_systems" ON size_systems FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON vendor_colors;
DROP POLICY IF EXISTS "Members can view vendor_colors" ON vendor_colors;
CREATE POLICY "Members can view vendor_colors" ON vendor_colors FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify vendor_colors" ON vendor_colors;
CREATE POLICY "Managers can modify vendor_colors" ON vendor_colors FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update vendor_colors" ON vendor_colors;
CREATE POLICY "Managers can update vendor_colors" ON vendor_colors FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete vendor_colors" ON vendor_colors;
CREATE POLICY "Managers can delete vendor_colors" ON vendor_colors FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON products;
DROP POLICY IF EXISTS "Members can view products" ON products;
CREATE POLICY "Members can view products" ON products FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify products" ON products;
CREATE POLICY "Managers can modify products" ON products FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update products" ON products;
CREATE POLICY "Managers can update products" ON products FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete products" ON products;
CREATE POLICY "Managers can delete products" ON products FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON product_variants;
DROP POLICY IF EXISTS "Members can view product_variants" ON product_variants;
CREATE POLICY "Members can view product_variants" ON product_variants FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify product_variants" ON product_variants;
CREATE POLICY "Managers can modify product_variants" ON product_variants FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update product_variants" ON product_variants;
CREATE POLICY "Managers can update product_variants" ON product_variants FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete product_variants" ON product_variants;
CREATE POLICY "Managers can delete product_variants" ON product_variants FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON import_jobs;
DROP POLICY IF EXISTS "Members can view import_jobs" ON import_jobs;
CREATE POLICY "Members can view import_jobs" ON import_jobs FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify import_jobs" ON import_jobs;
CREATE POLICY "Managers can modify import_jobs" ON import_jobs FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update import_jobs" ON import_jobs;
CREATE POLICY "Managers can update import_jobs" ON import_jobs FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete import_jobs" ON import_jobs;
CREATE POLICY "Managers can delete import_jobs" ON import_jobs FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON import_staging_records;
DROP POLICY IF EXISTS "Members can view import_staging_records" ON import_staging_records;
CREATE POLICY "Members can view import_staging_records" ON import_staging_records FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify import_staging_records" ON import_staging_records;
CREATE POLICY "Managers can modify import_staging_records" ON import_staging_records FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update import_staging_records" ON import_staging_records;
CREATE POLICY "Managers can update import_staging_records" ON import_staging_records FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete import_staging_records" ON import_staging_records;
CREATE POLICY "Managers can delete import_staging_records" ON import_staging_records FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON time_off_requests;
DROP POLICY IF EXISTS "Members can view time_off_requests" ON time_off_requests;
CREATE POLICY "Members can view time_off_requests" ON time_off_requests FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify time_off_requests" ON time_off_requests;
CREATE POLICY "Managers can modify time_off_requests" ON time_off_requests FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update time_off_requests" ON time_off_requests;
CREATE POLICY "Managers can update time_off_requests" ON time_off_requests FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete time_off_requests" ON time_off_requests;
CREATE POLICY "Managers can delete time_off_requests" ON time_off_requests FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON employee_availability;
DROP POLICY IF EXISTS "Members can view employee_availability" ON employee_availability;
CREATE POLICY "Members can view employee_availability" ON employee_availability FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify employee_availability" ON employee_availability;
CREATE POLICY "Managers can modify employee_availability" ON employee_availability FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update employee_availability" ON employee_availability;
CREATE POLICY "Managers can update employee_availability" ON employee_availability FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete employee_availability" ON employee_availability;
CREATE POLICY "Managers can delete employee_availability" ON employee_availability FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON open_shifts;
DROP POLICY IF EXISTS "Members can view open_shifts" ON open_shifts;
CREATE POLICY "Members can view open_shifts" ON open_shifts FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify open_shifts" ON open_shifts;
CREATE POLICY "Managers can modify open_shifts" ON open_shifts FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update open_shifts" ON open_shifts;
CREATE POLICY "Managers can update open_shifts" ON open_shifts FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete open_shifts" ON open_shifts;
CREATE POLICY "Managers can delete open_shifts" ON open_shifts FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON shift_swap_requests;
DROP POLICY IF EXISTS "Members can view shift_swap_requests" ON shift_swap_requests;
CREATE POLICY "Members can view shift_swap_requests" ON shift_swap_requests FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify shift_swap_requests" ON shift_swap_requests;
CREATE POLICY "Managers can modify shift_swap_requests" ON shift_swap_requests FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update shift_swap_requests" ON shift_swap_requests;
CREATE POLICY "Managers can update shift_swap_requests" ON shift_swap_requests FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete shift_swap_requests" ON shift_swap_requests;
CREATE POLICY "Managers can delete shift_swap_requests" ON shift_swap_requests FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON staff_profiles;
DROP POLICY IF EXISTS "Members can view staff_profiles" ON staff_profiles;
CREATE POLICY "Members can view staff_profiles" ON staff_profiles FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify staff_profiles" ON staff_profiles;
CREATE POLICY "Managers can modify staff_profiles" ON staff_profiles FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update staff_profiles" ON staff_profiles;
CREATE POLICY "Managers can update staff_profiles" ON staff_profiles FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete staff_profiles" ON staff_profiles;
CREATE POLICY "Managers can delete staff_profiles" ON staff_profiles FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for settings versions via business" ON settings_versions;
DROP POLICY IF EXISTS "Members can view settings_versions" ON settings_versions;
CREATE POLICY "Members can view settings_versions" ON settings_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM settings_values
    WHERE settings_values.id = settings_versions.setting_value_id
    AND public.user_has_role(settings_values.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist'])
  )
);
DROP POLICY IF EXISTS "Managers can modify settings_versions" ON settings_versions;
CREATE POLICY "Managers can modify settings_versions" ON settings_versions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM settings_values
    WHERE settings_values.id = settings_versions.setting_value_id
    AND public.user_has_role(settings_values.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can update settings_versions" ON settings_versions;
CREATE POLICY "Managers can update settings_versions" ON settings_versions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM settings_values
    WHERE settings_values.id = settings_versions.setting_value_id
    AND public.user_has_role(settings_values.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can delete settings_versions" ON settings_versions;
CREATE POLICY "Managers can delete settings_versions" ON settings_versions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM settings_values
    WHERE settings_values.id = settings_versions.setting_value_id
    AND public.user_has_role(settings_values.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);

DROP POLICY IF EXISTS "Enable all access for location permissions via business memberships" ON location_permissions;
DROP POLICY IF EXISTS "Members can view location_permissions" ON location_permissions;
CREATE POLICY "Members can view location_permissions" ON location_permissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM business_memberships
    WHERE business_memberships.id = location_permissions.membership_id
    AND public.user_has_role(business_memberships.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist'])
  )
);
DROP POLICY IF EXISTS "Managers can modify location_permissions" ON location_permissions;
CREATE POLICY "Managers can modify location_permissions" ON location_permissions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_memberships
    WHERE business_memberships.id = location_permissions.membership_id
    AND public.user_has_role(business_memberships.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can update location_permissions" ON location_permissions;
CREATE POLICY "Managers can update location_permissions" ON location_permissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM business_memberships
    WHERE business_memberships.id = location_permissions.membership_id
    AND public.user_has_role(business_memberships.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can delete location_permissions" ON location_permissions;
CREATE POLICY "Managers can delete location_permissions" ON location_permissions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM business_memberships
    WHERE business_memberships.id = location_permissions.membership_id
    AND public.user_has_role(business_memberships.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);

DROP POLICY IF EXISTS "Enable all access for business members" ON connected_accounts;
DROP POLICY IF EXISTS "Members can view connected_accounts" ON connected_accounts;
CREATE POLICY "Members can view connected_accounts" ON connected_accounts FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify connected_accounts" ON connected_accounts;
CREATE POLICY "Managers can modify connected_accounts" ON connected_accounts FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update connected_accounts" ON connected_accounts;
CREATE POLICY "Managers can update connected_accounts" ON connected_accounts FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete connected_accounts" ON connected_accounts;
CREATE POLICY "Managers can delete connected_accounts" ON connected_accounts FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON connected_resources;
DROP POLICY IF EXISTS "Members can view connected_resources" ON connected_resources;
CREATE POLICY "Members can view connected_resources" ON connected_resources FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify connected_resources" ON connected_resources;
CREATE POLICY "Managers can modify connected_resources" ON connected_resources FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update connected_resources" ON connected_resources;
CREATE POLICY "Managers can update connected_resources" ON connected_resources FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete connected_resources" ON connected_resources;
CREATE POLICY "Managers can delete connected_resources" ON connected_resources FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON business_brands;
DROP POLICY IF EXISTS "Members can view business_brands" ON business_brands;
CREATE POLICY "Members can view business_brands" ON business_brands FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify business_brands" ON business_brands;
CREATE POLICY "Managers can modify business_brands" ON business_brands FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update business_brands" ON business_brands;
CREATE POLICY "Managers can update business_brands" ON business_brands FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete business_brands" ON business_brands;
CREATE POLICY "Managers can delete business_brands" ON business_brands FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON business_sites;
DROP POLICY IF EXISTS "Members can view business_sites" ON business_sites;
CREATE POLICY "Members can view business_sites" ON business_sites FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify business_sites" ON business_sites;
CREATE POLICY "Managers can modify business_sites" ON business_sites FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update business_sites" ON business_sites;
CREATE POLICY "Managers can update business_sites" ON business_sites FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete business_sites" ON business_sites;
CREATE POLICY "Managers can delete business_sites" ON business_sites FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON commerce_channels;
DROP POLICY IF EXISTS "Members can view commerce_channels" ON commerce_channels;
CREATE POLICY "Members can view commerce_channels" ON commerce_channels FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify commerce_channels" ON commerce_channels;
CREATE POLICY "Managers can modify commerce_channels" ON commerce_channels FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update commerce_channels" ON commerce_channels;
CREATE POLICY "Managers can update commerce_channels" ON commerce_channels FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete commerce_channels" ON commerce_channels;
CREATE POLICY "Managers can delete commerce_channels" ON commerce_channels FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON channel_listings;
DROP POLICY IF EXISTS "Members can view channel_listings" ON channel_listings;
CREATE POLICY "Members can view channel_listings" ON channel_listings FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify channel_listings" ON channel_listings;
CREATE POLICY "Managers can modify channel_listings" ON channel_listings FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update channel_listings" ON channel_listings;
CREATE POLICY "Managers can update channel_listings" ON channel_listings FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete channel_listings" ON channel_listings;
CREATE POLICY "Managers can delete channel_listings" ON channel_listings FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON channel_product_overrides;
DROP POLICY IF EXISTS "Members can view channel_product_overrides" ON channel_product_overrides;
CREATE POLICY "Members can view channel_product_overrides" ON channel_product_overrides FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify channel_product_overrides" ON channel_product_overrides;
CREATE POLICY "Managers can modify channel_product_overrides" ON channel_product_overrides FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update channel_product_overrides" ON channel_product_overrides;
CREATE POLICY "Managers can update channel_product_overrides" ON channel_product_overrides FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete channel_product_overrides" ON channel_product_overrides;
CREATE POLICY "Managers can delete channel_product_overrides" ON channel_product_overrides FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON sync_jobs;
DROP POLICY IF EXISTS "Members can view sync_jobs" ON sync_jobs;
CREATE POLICY "Members can view sync_jobs" ON sync_jobs FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify sync_jobs" ON sync_jobs;
CREATE POLICY "Managers can modify sync_jobs" ON sync_jobs FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update sync_jobs" ON sync_jobs;
CREATE POLICY "Managers can update sync_jobs" ON sync_jobs FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete sync_jobs" ON sync_jobs;
CREATE POLICY "Managers can delete sync_jobs" ON sync_jobs FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON sync_conflicts;
DROP POLICY IF EXISTS "Members can view sync_conflicts" ON sync_conflicts;
CREATE POLICY "Members can view sync_conflicts" ON sync_conflicts FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify sync_conflicts" ON sync_conflicts;
CREATE POLICY "Managers can modify sync_conflicts" ON sync_conflicts FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update sync_conflicts" ON sync_conflicts;
CREATE POLICY "Managers can update sync_conflicts" ON sync_conflicts FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete sync_conflicts" ON sync_conflicts;
CREATE POLICY "Managers can delete sync_conflicts" ON sync_conflicts FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON customer_external_identities;
DROP POLICY IF EXISTS "Members can view customer_external_identities" ON customer_external_identities;
CREATE POLICY "Members can view customer_external_identities" ON customer_external_identities FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify customer_external_identities" ON customer_external_identities;
CREATE POLICY "Managers can modify customer_external_identities" ON customer_external_identities FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update customer_external_identities" ON customer_external_identities;
CREATE POLICY "Managers can update customer_external_identities" ON customer_external_identities FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete customer_external_identities" ON customer_external_identities;
CREATE POLICY "Managers can delete customer_external_identities" ON customer_external_identities FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON form_submissions;
DROP POLICY IF EXISTS "Members can view form_submissions" ON form_submissions;
CREATE POLICY "Members can view form_submissions" ON form_submissions FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify form_submissions" ON form_submissions;
CREATE POLICY "Managers can modify form_submissions" ON form_submissions FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update form_submissions" ON form_submissions;
CREATE POLICY "Managers can update form_submissions" ON form_submissions FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete form_submissions" ON form_submissions;
CREATE POLICY "Managers can delete form_submissions" ON form_submissions FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

