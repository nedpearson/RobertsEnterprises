-- Fix action_center_records RLS policies to be case-insensitive for roles
DROP POLICY IF EXISTS "action_center_owner_policy" ON action_center_records;
CREATE POLICY "action_center_owner_policy" ON action_center_records
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM business_memberships bm
            WHERE bm.user_id = auth.uid()
            AND bm.business_id = action_center_records.business_id
            AND upper(bm.role) = 'OWNER'
        )
    );

DROP POLICY IF EXISTS "action_center_manager_policy" ON action_center_records;
CREATE POLICY "action_center_manager_policy" ON action_center_records
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM business_memberships bm
            WHERE bm.user_id = auth.uid()
            AND bm.business_id = action_center_records.business_id
            AND upper(bm.role) = 'MANAGER'
        )
        AND (
            action_center_records.location_id IS NULL OR
            EXISTS (
                SELECT 1 FROM location_permissions lp
                JOIN business_memberships bm ON lp.membership_id = bm.id
                WHERE bm.user_id = auth.uid()
                AND lp.location_id = action_center_records.location_id
            )
        )
    );

DROP POLICY IF EXISTS "action_center_assigned_policy" ON action_center_records;
CREATE POLICY "action_center_assigned_policy" ON action_center_records
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM business_memberships bm
            WHERE bm.user_id = auth.uid()
            AND bm.business_id = action_center_records.business_id
        )
        AND (
            action_center_records.assigned_user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM business_memberships bm
                WHERE bm.user_id = auth.uid()
                AND bm.business_id = action_center_records.business_id
                AND upper(bm.role) = upper(action_center_records.assigned_role)
            )
        )
    );
