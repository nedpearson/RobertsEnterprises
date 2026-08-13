import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, Users, ShoppingBag, Calendar, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import ImportWorkflowWizard from '@/features/migration/ImportWorkflowWizard';

const MIGRATION_ENTITIES = [
  { id: 'customers', name: 'Customers', icon: <Users className="w-5 h-5" />, status: 'PENDING', description: 'Import client profiles, contact details, and measurements.' },
  { id: 'products', name: 'Products & Inventory', icon: <ShoppingBag className="w-5 h-5" />, status: 'COMPLETED', description: 'Import dresses, accessories, and stock levels.' },
  { id: 'appointments', name: 'Appointments', icon: <Calendar className="w-5 h-5" />, status: 'PENDING', description: 'Import historical and upcoming bookings.' },
];

export default function DataMigrationTab() {
  const [activeImport, setActiveImport] = useState<string | null>(null);

  if (activeImport) {
    return (
      <ImportWorkflowWizard 
        entityType={activeImport} 
        onCancel={() => setActiveImport(null)}
        onComplete={() => setActiveImport(null)}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-serif text-stone-800">Data Migration Workspace</h2>
        <p className="text-sm text-stone-500">Safely import historical data from your previous system. Imports run in an isolated environment before committing to production.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800 text-sm">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
        <p>Ensure your CSV files match the required VowOS format templates before uploading to avoid mapping errors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MIGRATION_ENTITIES.map(entity => (
          <Card key={entity.id} className="shadow-xs border-stone-200/60 transition-all hover:shadow-sm">
            <CardHeader className="pb-3 flex flex-row justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-100 rounded-lg text-stone-600">
                  {entity.icon}
                </div>
                <div>
                  <CardTitle className="text-base">{entity.name}</CardTitle>
                </div>
              </div>
              {entity.status === 'COMPLETED' ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Imported
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-stone-50 text-stone-500 border-stone-200">
                  Not Started
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4 h-10">{entity.description}</CardDescription>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setActiveImport(entity.id)}
                  variant={entity.status === 'COMPLETED' ? 'outline' : 'default'}
                  className={entity.status !== 'COMPLETED' ? "bg-stone-900 text-white hover:bg-stone-800" : ""}
                >
                  <UploadCloud className="w-4 h-4 mr-2" /> 
                  {entity.status === 'COMPLETED' ? 'Import More' : 'Start Import'}
                </Button>
                <Button variant="ghost" size="sm" className="text-stone-500">
                  <FileText className="w-4 h-4 mr-2" /> Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
