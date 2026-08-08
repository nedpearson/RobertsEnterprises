CREATE POLICY "Users can view their own memberships" ON business_memberships
    FOR SELECT USING (user_id = auth.uid());
