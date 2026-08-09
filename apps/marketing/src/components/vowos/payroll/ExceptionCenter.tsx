import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, MapPin, Search } from 'lucide-react';
import { TimeEntry } from '@/lib/services/workforceStore';

export interface ExceptionData {
  id: string;
  type: 'missing_punch' | 'overtime_risk' | 'location_mismatch' | 'unapproved';
  title: string;
  employeeName: string;
  description: string;
  timeEntryId?: string;
}

interface ExceptionCenterProps {
  exceptions: ExceptionData[];
  onResolve: (exception: ExceptionData) => void;
}

export function ExceptionCenter({ exceptions, onResolve }: ExceptionCenterProps) {
  if (exceptions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-48 text-gray-500">
          <Search className="w-8 h-8 mb-4 text-gray-300" />
          <p>No exceptions found in this scope.</p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'missing_punch': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'location_mismatch': return <MapPin className="w-5 h-5 text-red-500" />;
      case 'overtime_risk': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {exceptions.map((ex) => (
        <Card key={ex.id} className="flex flex-row items-center p-4 gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 p-3 bg-gray-50 rounded-full">
            {getIcon(ex.type)}
          </div>
          <div className="flex-grow">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">{ex.title}</h4>
              <Badge variant="outline" className="text-xs uppercase bg-gray-50">{ex.type.replace('_', ' ')}</Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">{ex.employeeName} — {ex.description}</p>
          </div>
          <div>
            <Button size="sm" onClick={() => onResolve(ex)}>Resolve</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
