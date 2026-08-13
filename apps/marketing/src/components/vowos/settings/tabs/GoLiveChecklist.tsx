import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, AlertCircle, Rocket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

const CHECKLIST_ITEMS = [
  { id: 'business-profile', label: 'Complete Business Profile', description: 'Address, contact info, and tax settings configured.', status: 'COMPLETED' },
  { id: 'locations', label: 'Configure Locations', description: 'At least one physical location with operating hours.', status: 'COMPLETED' },
  { id: 'users', label: 'Invite Staff Members', description: 'Add stylists and managers with appropriate roles.', status: 'COMPLETED' },
  { id: 'inventory', label: 'Import Inventory', description: 'Initial catalog of products and stock levels loaded.', status: 'PENDING' },
  { id: 'booking', label: 'Setup Booking Rules', description: 'Appointment types and scheduling rules defined.', status: 'PENDING' },
  { id: 'payment', label: 'Connect Payment Gateway', description: 'Stripe account linked for deposits and invoicing.', status: 'COMPLETED' },
];

export default function GoLiveChecklist() {
  const [items, setItems] = useState(CHECKLIST_ITEMS);

  const completedCount = items.filter(i => i.status === 'COMPLETED').length;
  const isReady = completedCount === items.length;

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-serif text-stone-800">Go-Live Certification</h2>
        <p className="text-sm text-stone-500">Ensure your workspace is fully configured before switching to live production mode.</p>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border-4 border-stone-100 mb-4 shadow-sm">
          <span className="text-2xl font-serif text-stone-800">{Math.round((completedCount / items.length) * 100)}%</span>
        </div>
        <h3 className="text-lg font-medium text-stone-800">Readiness Score</h3>
        <p className="text-sm text-stone-500 max-w-sm mx-auto mt-2">
          {isReady ? 'Your workspace is fully configured and ready to launch.' : 'Complete the remaining setup tasks to unlock production mode.'}
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
                ) : (
                  <Circle className="w-5 h-5 text-stone-300" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${item.status === 'COMPLETED' ? 'text-stone-800' : 'text-stone-600'}`}>{item.label}</h4>
                  {item.status === 'COMPLETED' ? (
                     <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">Done</Badge>
                  ) : (
                     <Button variant="link" size="sm" className="h-auto p-0 text-brand-primary text-xs">Configure</Button>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="bg-stone-50 border-t border-stone-200 justify-end p-4">
          <Button 
            disabled={!isReady} 
            className={isReady ? 'bg-brand-primary text-white' : 'bg-stone-200 text-stone-400'}
          >
            <Rocket className="w-4 h-4 mr-2" />
            Certify & Go Live
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
