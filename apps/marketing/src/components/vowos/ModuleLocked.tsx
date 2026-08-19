import React from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ModuleLocked({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed border-2 border-stone-200 bg-stone-50/50">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-white p-4 rounded-full shadow-sm border border-stone-100 mb-4">
          <Lock className="h-8 w-8 text-stone-300" />
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-2">{title}</h3>
        <p className="text-sm text-stone-500 max-w-sm mb-6">{description}</p>
        <Button variant="outline" className="bg-white">
          Explore Upgrades <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
