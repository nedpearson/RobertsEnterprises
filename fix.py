import os
import glob

migrations_dir = 'apps/marketing/supabase/migrations'
for filepath in glob.glob(os.path.join(migrations_dir, '*.sql')):
    if os.path.basename(filepath) >= '20260816':
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content.replace('public.organizations', 'public.businesses')
        new_content = new_content.replace('"public"."organizations"', '"public"."businesses"')
        new_content = new_content.replace(' FROM organizations ', ' FROM businesses ')
        new_content = new_content.replace(' INTO organizations ', ' INTO businesses ')
        new_content = new_content.replace('ALTER TABLE organizations', 'ALTER TABLE businesses')
        new_content = new_content.replace('staff_profiles.organization_id', 'staff_profiles.business_id')
        new_content = new_content.replace('organization_id UUID NOT NULL REFERENCES public.businesses', 'business_id UUID NOT NULL REFERENCES public.businesses')
        new_content = new_content.replace('organization_id uuid REFERENCES "public"."businesses"', 'business_id uuid REFERENCES "public"."businesses"')
        new_content = new_content.replace('organizations.id', 'businesses.id')
        new_content = new_content.replace('organizations WHERE', 'businesses WHERE')
        new_content = new_content.replace('organizations (', 'businesses (')
        new_content = new_content.replace('organizations(', 'businesses(')
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Updated {os.path.basename(filepath)}')
