import { useMemo } from 'react';
import { useStaffProfiles } from '@/lib/services/schedulingService';
import { getActiveDataPlane } from '@/lib/supabase';
import { teamMembers as SAMPLE_TEAM_MEMBERS } from '@/data/vowosData';

/**
 * Names of the tenant's real staff, for stylist / "taken by" / assignee pickers.
 *
 * Every picker used to read the static `teamMembers` constant
 * ('Dana R.', 'Priya K.', 'Marcus T.'), so appointments, measurements and
 * purchase orders on live tenants were being assigned to people who do not
 * exist. The sample names now appear only in the demo plane and only when the
 * tenant has no staff profiles at all.
 */
export function useStylistNames(): string[] {
  const { data } = useStaffProfiles();
  const isDemo = getActiveDataPlane() === 'demo';
  return useMemo(() => {
    const names = (data ?? [])
      .map((s: any) => String(s?.name ?? s?.full_name ?? '').trim())
      .filter((n: string) => n.length > 0);
    const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    if (unique.length > 0) return unique;
    return isDemo ? SAMPLE_TEAM_MEMBERS : [];
  }, [data, isDemo]);
}
