import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import OwnerExecutiveOverview from '@/components/vowos/OwnerExecutiveOverview';
import DashboardView from '@/components/vowos/DashboardView';
import NeedsAttention from '@/components/vowos/NeedsAttention';

export default function TodayWorkspace() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'Owner';

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-serif font-bold text-stone-900">Today</h1>
        <p className="text-stone-500">
          {isOwner ? "Here's what needs your attention today." : "Here's your schedule for today."}
        </p>
      </div>

      {isOwner ? (
        <>
          <OwnerExecutiveOverview />
          <NeedsAttention />
        </>
      ) : (
        <DashboardView />
      )}
    </div>
  );
}
