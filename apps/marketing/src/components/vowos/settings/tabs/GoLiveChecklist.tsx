import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVowosData } from '@/contexts/VowosDataContext';
import { useStaffProfiles } from '@/lib/services/schedulingService';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';

type ItemStatus = 'COMPLETED' | 'PENDING' | 'MANAGED';

/**
 * Go-live readiness, computed from the organization's actual state. The
 * previous version was a fixed array (three items COMPLETED, three PENDING, a
 * 50% score) with a "Configure" link and a "Certify & Go Live" button that did
 * nothing, shown identically to every tenant.
 */
export default function GoLiveChecklist() {
  const { tenant } = useAuth();
  const { gowns, appointments, brides } = useVowosData();
  const { data: staff } = useStaffProfiles();
  const { navigateToView } = useApplicationRoute();

  const items = useMemo(() => {
    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
    const hasProfile = Boolean(tenant?.name && tenant.name.trim().length > 0);
    const staffCount = staff?.length ?? 0;
    const list: { id: string; label: string; description: string; status: ItemStatus; tab?: string; evidence: string }[] = [
      {
        id: 'business-profile',
        label: 'Complete Business Profile',
        description: 'Organization name, address and contact details.',
        status: hasProfile ? 'COMPLETED' : 'PENDING',
        tab: 'organization',
        evidence: hasProfile ? `Organization: ${tenant?.name}` : 'No organization name saved yet',
      },
      {
        id: 'locations',
        label: 'Configure Locations',
        description: 'At least one boutique with operating hours.',
        status: Object.keys(settings).some((k) => k.toLowerCase().includes('location')) ? 'COMPLETED' : 'PENDING',
        tab: 'locations',
        evidence: 'Review boutique addresses and hours',
      },
      {
        id: 'users',
        label: 'Invite Staff Members',
        description: 'Stylists and managers with the right roles.',
        status: staffCount > 1 ? 'COMPLETED' : 'PENDING',
        tab: 'security',
        evidence: `${staffCount} staff profile${staffCount === 1 ? '' : 's'} on this organization`,
      },
      {
        id: 'inventory',
        label: 'Import Inventory',
        description: 'Initial catalog of gowns and stock levels.',
        status: gowns.length > 0 ? 'COMPLETED' : 'PENDING',
        tab: 'inventory',
        evidence: `${gowns.length.toLocaleString()} gown${gowns.length === 1 ? '' : 's'} in inventory`,
      },
      {
        id: 'booking',
        label: 'Setup Booking Rules',
        description: 'Appointment types and scheduling rules.',
        status: appointments.length > 0 ? 'COMPLETED' : 'PENDING',
        tab: 'scheduling',
        evidence: appointments.length > 0 ? `${appointments.length.toLocaleString()} appointments recorded` : 'No appointments booked yet',
      },
      {
        id: 'customers',
        label: 'Load Customers',
        description: 'Existing brides and leads imported.',
        status: brides.length > 0 ? 'COMPLETED' : 'PENDING',
        tab: 'data',
        evidence: `${brides.length.toLocaleString()} customer${brides.length === 1 ? '' : 's'} in the CRM`,
      },
      {
        id: 'payment',
        label: 'Payment Processing',
        description: 'Card processing is provisioned by the VowOS team during onboarding.',
        status: 'MANAGED',
        tab: 'payments',
        evidence: 'Handled with VowOS onboarding',
      },
    ];
    return list;
  }, [tenant, staff, gowns, appointments, brides]);

  const scored = items.filter((i) => i.status !== 'MANAGED');
  const completedCount = scored.filter((i) => i.status === 'COMPLETED').length;
  const pct = scored.length ? Math.round((completedCount / scored.length) * 100) : 0;
  const isReady = completedCount === scored.length;

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-serif text-stone-800">Go-Live Readiness</h2>
        <p className="text-sm text-stone-500">Each item is checked against what this organization actually has configured.</p>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border-4 border-stone-100 mb-4 shadow-sm">
          <span className="text-2xl font-serif text-stone-800">{pct}%</span>
        </div>
        <h3 className="text-lg font-medium text-stone-800">Readiness</h3>
        <p className="text-sm text-stone-500 max-w-sm mx-auto mt-2">
          {isReady ? 'Every setup item has real data behind it.' : `${scored.length - completedCount} setup item${scored.length - completedCount === 1 ? '' : 's'} still need attention.`}
        </p>
      </div>

      <Card className="shadow-xs border-stone-200/60">
        <CardHeader>
          <CardTitle className="text-lg">Pre-Launch Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          {items.map((item, idx) => (
            <div key={item.id} className={`flex items-start gap-4 p-4 ${idx !== items.length - 1 ? 'border-b border-stone-100' : ''}`}>
              <div className="mt-0.5">
                {item.status === 'COMPLETED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : item.status === 'MANAGED' ? (
                  <CheckCircle2 className="w-5 h-5 text-stone-300" />
                ) : (
                  <Circle className="w-5 h-5 text-stone-300" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${item.status === 'COMPLETED' ? 'text-stone-800' : 'text-stone-600'}`}>{item.label}</h4>
                  {item.status === 'COMPLETED' ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">Done</Badge>
                  ) : item.status === 'MANAGED' ? (
                    <Badge variant="outline" className="bg-stone-50 text-stone-500 border-stone-200 text-[10px]">Managed by VowOS</Badge>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-brand-primary text-xs"
                      onClick={() => item.tab && navigateToView('settings', { tab: item.tab })}
                    >
                      Configure
                    </Button>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1">{item.description}</p>
                <p className="text-[11px] text-stone-400 mt-0.5">{item.evidence}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
