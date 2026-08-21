import re
import sys

def patch():
    with open('apps/marketing/src/contexts/AuthContext.tsx', 'r') as f:
        content = f.read()

    safe_func = """
async function safe<T>(fn: () => Promise<{data: T | null, error: any}>, fallback: T): Promise<T> {
  try {
    const { data, error } = await fn();
    if (error) {
      console.warn("Safe query caught error:", error);
      return fallback;
    }
    return data !== null ? data : fallback;
  } catch (err) {
    console.warn("Safe query caught exception:", err);
    return fallback;
  }
}
"""

    if 'async function safe' not in content:
        content = content.replace('export function AuthProvider({ children }: { children: ReactNode }) {', safe_func + '\nexport function AuthProvider({ children }: { children: ReactNode }) {')

    load_profile_old = """      const { data: membership } = await supabase
        .from('business_memberships')
        .select(`
          role,
          businesses (
            id,
            status,
            onboarding_status,
            plan_id,
            organization_module_preferences,
            feature_overrides
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')
        .limit(1)
        .maybeSingle();"""

    load_profile_new = """      const { data: membershipRaw } = await supabase
        .from('business_memberships')
        .select('role, business_id')
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')
        .limit(1)
        .maybeSingle();

      let membership: any = null;
      if (membershipRaw && membershipRaw.business_id) {
        const { data: biz } = await supabase
          .from('businesses')
          .select('id, status, onboarding_status')
          .eq('id', membershipRaw.business_id)
          .maybeSingle();

        if (biz) {
          const planSub = await safe(() => supabase.from('organization_subscriptions').select('plan_id').eq('business_id', biz.id).maybeSingle(), null);
          const overrides = await safe(() => supabase.from('organization_feature_overrides').select('feature_key,state').eq('business_id', biz.id), []);
          const modulePrefs = await safe(() => supabase.from('organization_module_preferences').select('module_id,is_enabled').eq('business_id', biz.id), []);

          membership = {
            role: membershipRaw.role,
            businesses: {
              ...biz,
              plan_id: planSub?.plan_id,
              feature_overrides: overrides,
              organization_module_preferences: modulePrefs
            }
          };
        }
      }"""

    content = content.replace(load_profile_old, load_profile_new)

    enter_support_old = """    const { data: org } = await supabase
      .from('organizations')
      .select('id, status, onboarding_status, organization_subscriptions(plan_id), organization_feature_overrides(feature_key, state), organization_module_preferences(module_id, is_enabled)')
      .eq('id', tenantId)
      .single();"""

    enter_support_new = """    const { data: orgData, error: orgErr } = await supabase
      .from('businesses')
      .select('id, status, onboarding_status')
      .eq('id', tenantId)
      .maybeSingle();
      
    if (orgErr || !orgData) {
      console.error("Failed to load business for support mode", orgErr);
      return;
    }

    const planSub = await safe(() => supabase.from('organization_subscriptions').select('plan_id').eq('business_id', orgData.id).maybeSingle(), null);
    const overridesList = await safe(() => supabase.from('organization_feature_overrides').select('feature_key,state').eq('business_id', orgData.id), []);
    const modulePrefsList = await safe(() => supabase.from('organization_module_preferences').select('module_id,is_enabled').eq('business_id', orgData.id), []);

    const org = {
      ...orgData,
      organization_subscriptions: planSub,
      organization_feature_overrides: overridesList,
      organization_module_preferences: modulePrefsList
    };"""

    content = content.replace(enter_support_old, enter_support_new)

    with open('apps/marketing/src/contexts/AuthContext.tsx', 'w') as f:
        f.write(content)
    
    print("Patched successfully")

if __name__ == '__main__':
    patch()
