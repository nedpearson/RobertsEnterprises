import { useState } from 'react';
import PayrollView from './PayrollView';
import PayrollProviderFinalizationView from './PayrollProviderFinalizationView';

type Section = 'register' | 'provider';

export default function PayrollOperationsView() {
  const [section, setSection] = useState<Section>('register');
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto border-b border-stone-200">
        <div className="flex min-w-max gap-1">
          <button onClick={() => setSection('register')} className={`border-b-2 px-4 py-3 text-sm font-semibold ${section === 'register' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500'}`}>Payroll Register</button>
          <button onClick={() => setSection('provider')} className={`border-b-2 px-4 py-3 text-sm font-semibold ${section === 'provider' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500'}`}>Provider Finalization</button>
        </div>
      </div>
      {section === 'register' ? <PayrollView /> : <PayrollProviderFinalizationView />}
    </div>
  );
}
