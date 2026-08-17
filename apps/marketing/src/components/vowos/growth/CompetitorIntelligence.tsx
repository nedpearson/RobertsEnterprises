import React from 'react';
import { Crosshair, Target, Eye, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';

export function CompetitorIntelligence() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Competitor Intelligence</h1>
          <p className="text-sm text-stone-400 mt-1">
            Analyze local market gaps and track your visibility against competitors.
          </p>
        </div>
        <button className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <Crosshair className="w-4 h-4" /> Add Competitor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#1c1a1f] border-white/5 md:col-span-2">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-lg text-white">Local Search Share of Voice</CardTitle>
            <CardDescription>Estimated visibility for "wedding dresses" in your territory.</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-6">
              {/* You */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-brand-primary">Magnolia Bridal (You)</span>
                  <span className="text-white font-medium">42%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3">
                  <div className="bg-brand-primary h-3 rounded-full" style={{ width: '42%' }}></div>
                </div>
              </div>
              
              {/* Competitor 1 */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-300">David's Bridal - Baton Rouge</span>
                  <span className="text-stone-400 font-medium">28%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3">
                  <div className="bg-stone-600 h-3 rounded-full" style={{ width: '28%' }}></div>
                </div>
              </div>

              {/* Competitor 2 */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-300">I Do Bridal Couture</span>
                  <span className="text-stone-400 font-medium">18%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3">
                  <div className="bg-stone-600 h-3 rounded-full" style={{ width: '18%' }}></div>
                </div>
              </div>

              {/* Competitor 3 */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-300">Bella Bridesmaids</span>
                  <span className="text-stone-400 font-medium">12%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3">
                  <div className="bg-stone-600 h-3 rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1c1a1f] border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-lg text-white">Market Gaps Found</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-colors">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Plus Size Gowns
              </h4>
              <p className="text-xs text-stone-400 mt-2">
                None of your tracked competitors rank on page 1 for "plus size wedding dresses baton rouge".
              </p>
              <button className="mt-3 text-xs font-semibold text-brand-primary group-hover:text-brand-primary-hover transition-colors">
                Create Landing Page →
              </button>
            </div>
            
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-colors">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Justin Alexander
              </h4>
              <p className="text-xs text-stone-400 mt-2">
                "I Do Bridal Couture" recently removed Justin Alexander from their website's designer list.
              </p>
              <button className="mt-3 text-xs font-semibold text-brand-primary group-hover:text-brand-primary-hover transition-colors">
                Boost Ad Spend →
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
