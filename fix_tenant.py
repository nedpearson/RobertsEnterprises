import re

def patch():
    with open('apps/marketing/src/pages/PlatformAdmin/TenantControlCenter.tsx', 'r') as f:
        content = f.read()

    # Change .single() to .maybeSingle() and remove the error throw if not found
    load_tenant_old = """      const [orgRes, subRes, memRes, locRes, brandsRes, overridesRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', tenantId).single(),
        supabase.from('organization_subscriptions').select('*').eq('business_id', tenantId).maybeSingle(),
        supabase.from('business_memberships').select('*, staff_profiles(name, email), auth_user:user_id').eq('business_id', tenantId),
        supabase.from('locations').select('*').eq('business_id', tenantId),
        supabase.from('business_brands').select('*').eq('business_id', tenantId),
        supabase.from('organization_feature_overrides').select('*').eq('business_id', tenantId)
      ]);

      if (orgRes.error) throw orgRes.error;
      
      setTenant(orgRes.data);
      if (subRes.data) setSubscription(subRes.data);
      if (memRes.data) setMembers(memRes.data);"""

    load_tenant_new = """      const [orgRes, subRes, memRes, locRes, brandsRes, overridesRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', tenantId).maybeSingle(),
        supabase.from('organization_subscriptions').select('*').eq('business_id', tenantId).maybeSingle(),
        supabase.from('business_memberships').select('id,user_id,role,status,created_at').eq('business_id', tenantId),
        supabase.from('locations').select('*').eq('business_id', tenantId),
        supabase.from('business_brands').select('*').eq('business_id', tenantId),
        supabase.from('organization_feature_overrides').select('*').eq('business_id', tenantId)
      ]);

      if (orgRes.error) throw orgRes.error;
      if (!orgRes.data) {
        setTenant(null);
        return;
      }
      
      setTenant(orgRes.data);
      if (subRes.data) setSubscription(subRes.data);
      if (memRes.data) {
        const userIds = [...new Set((memRes.data ?? []).map(m => m.user_id).filter(Boolean))];
        const { data: profiles } = userIds.length
          ? await supabase.from('staff_profiles').select('id,name,email').in('id', userIds)
          : { data: [] };
        
        const stitched = memRes.data.map(m => ({
          ...m,
          staff_profiles: profiles?.find(p => p.id === m.user_id)
        }));
        setMembers(stitched);
      }"""

    content = content.replace(load_tenant_old, load_tenant_new)

    # Change empty state UI
    empty_state_old = """  if (!tenant) {
    return <div className="p-8 text-center text-stone-500">Organization not found</div>;
  }"""

    empty_state_new = """  if (!tenant) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-stone-500">This organization no longer exists or was removed.</div>
        <Button variant="outline" onClick={() => navigate('/platform')}>Back to Directory</Button>
      </div>
    );
  }"""

    content = content.replace(empty_state_old, empty_state_new)

    with open('apps/marketing/src/pages/PlatformAdmin/TenantControlCenter.tsx', 'w') as f:
        f.write(content)
    print("Patched successfully")

if __name__ == '__main__':
    patch()
