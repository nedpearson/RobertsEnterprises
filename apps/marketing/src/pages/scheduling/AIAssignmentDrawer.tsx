import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@vowos/design-system';
import { Card, CardHeader, CardTitle, CardContent } from '@vowos/design-system';
import { Badge } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
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
          {(!request?.preferred_location_id && !request?.location_id) && (
            <div className="p-4 bg-red-50 text-red-900 rounded-md border border-red-200 mb-4">
              <AlertTriangle className="h-5 w-5 mb-2" />
              <h3 className="font-semibold">Location Review Required</h3>
              <p className="text-sm">This request cannot be assigned because its location is not configured. Select a location to continue.</p>
            </div>
          )}
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
                        {new Date(rec.proposed_start_at || rec.recommended_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(rec.proposed_end_at || rec.recommended_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      {request.preferred_date_1 && rec.proposed_start_at && new Date(rec.proposed_start_at).toISOString().split('T')[0] !== new Date(request.preferred_date_1).toISOString().split('T')[0] && (
                        <div className="text-xs text-amber-600 mt-1">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          Proposed date differs from requested date. Customer approval required.
                        </div>
                      )}
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
                      <div key={i} className="flex items-start gap-2 text-sm text-status-warning dark:text-status-warning">
                        <AlertTriangle className="h-3 w-3 mt-1 shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    variant={index === 0 && rec.score >= 50 ? "default" : "outline"}
                    disabled={rec.score === 0 || rec.confidence === 'Low' || (!request?.preferred_location_id && !request?.location_id)}
                    onClick={() => onAssign(rec)}
                  >
                    {rec.score === 0 ? 'Cannot Assign (Conflict)' : `Assign to ${rec.employee?.first_name}`}
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
