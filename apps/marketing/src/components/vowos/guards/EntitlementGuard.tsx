import React from 'react';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { Lock, Zap, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface EntitlementGuardProps {
  featureKey: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  showUpsell?: boolean;
}

export const EntitlementGuard: React.FC<EntitlementGuardProps> = ({ 
  featureKey, 
  fallback, 
  children,
  showUpsell = true
}) => {
  const { can, getEntitlement, isLoading } = useTenantEntitlements();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="flex justify-center items-center h-32"><div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full"></div></div>;
  }

  const hasAccess = can(featureKey);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpsell) {
    return null; // Silent failure (for inline components)
  }

  const entitlement = getEntitlement(featureKey);

  return (
    <div className="flex items-center justify-center p-8 min-h-[400px]">
      <Card className="max-w-md w-full border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Upgrade Required
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {entitlement?.reason || 'This feature is not available on your current plan.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 pb-6">
          <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              Unlock this and other premium capabilities by upgrading your VowOS subscription tier. Our Growth and Pro plans offer advanced tools designed to scale your bridal retail operations.
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button 
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            onClick={() => navigate('/settings/billing')}
          >
            <Zap className="w-4 h-4 mr-2" />
            View Subscription Options
          </Button>
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => navigate(-1)}
          >
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
