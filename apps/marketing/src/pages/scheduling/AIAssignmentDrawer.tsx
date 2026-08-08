import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Star, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { useAIRecommendations } from '@/lib/services/schedulingService';

interface AIAssignmentDrawerProps {
  request: any;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (recommendation: any) => void;
}

export function AIAssignmentDrawer({ request, isOpen, onClose, onAssign }: AIAssignmentDrawerProps) {
  const { data: recommendations, isLoading } = useAIRecommendations(request?.id);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col h-full bg-muted/20 p-0">
        <div className="p-6 bg-background border-b">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-500" />
              AI Assignment Engine
            </SheetTitle>
            <SheetDescription>
              Assigning {request?.customer?.first_name || 'Customer'} for {request?.service?.name || 'Service'}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Top Recommendations
          </div>
          
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="animate-pulse">Analyzing schedules and constraints...</p>
            </div>
          ) : recommendations && recommendations.length > 0 ? (
            recommendations.map((rec: any, index: number) => (
              <Card key={rec.id} className={`border-2 ${index === 0 ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/20' : 'border-transparent'}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{rec.employee?.first_name} {rec.employee?.last_name}</CardTitle>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <Clock className="h-3 w-3" /> 
                        {new Date(rec.recommended_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(rec.recommended_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    <Badge variant={rec.score >= 90 ? "default" : "secondary"} className={rec.score >= 90 ? "bg-indigo-500" : ""}>
                      {rec.score}% Match
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {rec.match_reasons?.map((reason: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400">
                        <Star className="h-3 w-3 mt-1 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                    {rec.conflict_warnings?.map((warning: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500">
                        <AlertTriangle className="h-3 w-3 mt-1 shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    variant={index === 0 ? "default" : "outline"}
                    onClick={() => onAssign(rec)}
                  >
                    Assign to {rec.employee?.first_name}
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center border rounded-lg bg-background text-muted-foreground space-y-3">
              <Brain className="h-12 w-12 text-muted-foreground/30" />
              <p>No AI recommendations available for this request. Ensure employee schedules are published and the request has valid service requirements.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
