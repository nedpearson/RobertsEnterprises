import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Building2, MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LOCATIONS } from '@/data/vowosData';

export interface ReportsScope {
  preset: 'mtd' | 'ytd' | 'lastYear' | 'all';
  startDate: string;
  endDate: string;
  businessIds: string[];
  locations: string[];
}

export function ReportsScopeBar({
  scope,
  onChange,
  onRefresh
}: {
  scope: ReportsScope;
  onChange: (s: ReportsScope) => void;
  onRefresh?: () => void;
}) {
  const businesses = [
    { id: 'I Do Bridal Couture', name: 'I Do Bridal Couture' },
    { id: 'Proper & Company', name: 'Proper & Company' }
  ];
  const locationsList = LOCATIONS.map(l => ({ id: l.id, name: l.short }));

  const businessIds = scope.businessIds || [];
  const locations = scope.locations || [];

  const toggleBusiness = (id: string) => {
    let newBiz = [...businessIds];
    if (newBiz.includes(id)) newBiz = newBiz.filter(x => x !== id);
    else newBiz.push(id);
    onChange({ ...scope, businessIds: newBiz });
  };

  const toggleLocation = (id: string) => {
    if (id === 'all') {
      onChange({ ...scope, locations: ['all'] });
      return;
    }
    let newLocs = locations.includes('all') ? [] : [...locations];
    if (newLocs.includes(id)) {
      newLocs = newLocs.filter(x => x !== id);
      if (newLocs.length === 0) newLocs = ['all'];
    } else newLocs.push(id);
    onChange({ ...scope, locations: newLocs });
  };

  const applyPreset = (preset: ReportsScope['preset']) => {
    const now = new Date();
    let start = '';
    let end = '';
    if (preset === 'mtd') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (preset === 'ytd') {
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    } else if (preset === 'lastYear') {
      start = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
    }
    onChange({ ...scope, preset, startDate: start, endDate: end });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-stone-200 rounded-xl shadow-sm text-sm">
      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 font-medium bg-gray-50 border border-gray-100 rounded-lg h-9">
            <CalendarIcon className="w-4 h-4 text-text-muted" />
            {scope.preset === 'mtd' ? 'Month to Date' : scope.preset === 'ytd' ? 'Year to Date' : scope.preset === 'lastYear' ? 'Last Year' : 'All Time'}
            <ChevronDown className="w-3 h-3 text-text-muted ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-2" align="start">
          <div className="space-y-1">
            <Button variant="ghost" className={`w-full justify-start ${scope.preset === 'mtd' ? 'bg-blue-50 text-blue-700' : ''}`} onClick={() => applyPreset('mtd')}>Month to Date</Button>
            <Button variant="ghost" className={`w-full justify-start ${scope.preset === 'ytd' ? 'bg-blue-50 text-blue-700' : ''}`} onClick={() => applyPreset('ytd')}>Year to Date</Button>
            <Button variant="ghost" className={`w-full justify-start ${scope.preset === 'lastYear' ? 'bg-blue-50 text-blue-700' : ''}`} onClick={() => applyPreset('lastYear')}>Last Year</Button>
            <Button variant="ghost" className={`w-full justify-start ${scope.preset === 'all' ? 'bg-blue-50 text-blue-700' : ''}`} onClick={() => applyPreset('all')}>All Time</Button>
          </div>
          {scope.preset !== 'all' && (
            <div className="mt-3 px-2 text-xs text-stone-500">
              {scope.startDate} to {scope.endDate}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <div className="h-6 w-px bg-gray-200 mx-2" />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 font-medium">
            <Building2 className="w-4 h-4 text-text-muted" />
            {businessIds.length === businesses.length && businesses.length > 0 ? 'All Brands' : (businessIds.length + ' Brand(s)')}
            <ChevronDown className="w-3 h-3 text-text-muted ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-2" align="start">
          <h4 className="font-semibold text-xs text-text-muted uppercase tracking-wider mb-2 px-2">Select Brands</h4>
          {businesses.map(biz => (
            <div key={biz.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleBusiness(biz.id)}>
              <input type="checkbox" checked={businessIds.includes(biz.id)} readOnly className="rounded border-gray-300" />
              <span className="text-sm">{biz.name}</span>
            </div>
          ))}
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 font-medium">
            <MapPin className="w-4 h-4 text-text-muted" />
            {locations.includes('all') ? 'All Locations' : (locations.length + ' Location(s)')}
            <ChevronDown className="w-3 h-3 text-text-muted ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-2" align="start">
          <h4 className="font-semibold text-xs text-text-muted uppercase tracking-wider mb-2 px-2">Select Locations</h4>
          <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleLocation('all')}>
            <input type="checkbox" checked={locations.includes('all')} readOnly className="rounded border-gray-300" />
            <span className="text-sm font-medium">All Locations</span>
          </div>
          <div className="my-1 border-t border-gray-100" />
          {locationsList.map(loc => (
            <div key={loc.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleLocation(loc.id)}>
              <input type="checkbox" checked={!locations.includes('all') && locations.includes(loc.id)} readOnly className="rounded border-gray-300" />
              <span className="text-sm">{loc.name}</span>
            </div>
          ))}
        </PopoverContent>
      </Popover>

      <div className="flex-1" />

      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh} className="ml-auto">
          Refresh
        </Button>
      )}
    </div>
  );
}
