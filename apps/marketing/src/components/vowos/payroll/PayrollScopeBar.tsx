import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Building2, MapPin, Users, Tags, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getBusinesses, getLocations } from '@/lib/services/businessStore';

export interface PayrollScope {
  startDate: string;
  endDate: string;
  businessIds: string[];
  locations: string[];
  payGroup: string;
  department: string;
  employeeSearch?: string;
}

export function PayrollScopeBar({
  scope,
  onScopeChange,
  onRefresh,
  departments
}: {
  departments?: any[];
  scope: PayrollScope;
  onScopeChange: (s: PayrollScope) => void;
  onRefresh?: () => void;
}) {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);

  useEffect(() => {
    getBusinesses().then(setBusinesses);
    getLocations().then(setLocationsList);
  }, []);

  const businessIds = scope.businessIds || [];
  const locations = scope.locations || [];

  const toggleBusiness = (id: string) => {
    let newBiz = [...businessIds];
    if (newBiz.includes(id)) {
      newBiz = newBiz.filter(x => x !== id);
    } else {
      newBiz.push(id);
    }
    onScopeChange({ ...scope, businessIds: newBiz });
  };

  const toggleLocationByName = (name: string) => {
    if (name === 'all') {
      onScopeChange({ ...scope, locations: ['all'] });
      return;
    }
    const idsForName = locationsList.filter(l => l.name === name).map(l => l.id);
    let newLocs = locations.includes('all') ? [] : [...locations];
    const isIncluded = newLocs.includes(idsForName[0]);
    if (isIncluded) {
      newLocs = newLocs.filter(x => !idsForName.includes(x));
      if (newLocs.length === 0) newLocs = ['all'];
    } else {
      newLocs.push(...idsForName.filter(id => !newLocs.includes(id)));
    }
    onScopeChange({ ...scope, locations: newLocs });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-stone-200 rounded-xl shadow-sm text-sm">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
        <CalendarIcon className="w-4 h-4 text-text-muted" />
        <div className="flex items-center gap-2">
          <input type="date" value={scope.startDate} onChange={e => onScopeChange({...scope, startDate: e.target.value})} className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0" />
          <span className="text-text-muted">–</span>
          <input type="date" value={scope.endDate} onChange={e => onScopeChange({...scope, endDate: e.target.value})} className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0" />
        </div>
      </div>

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
          <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleLocationByName('all')}>
            <input type="checkbox" checked={locations.includes('all')} readOnly className="rounded border-gray-300" />
            <span className="text-sm font-medium">All Locations</span>
          </div>
          <div className="my-1 border-t border-gray-100" />
          {Array.from(new Map(locationsList.map(l => [l.name, l])).values()).map(loc => (
            <div key={loc.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleLocationByName(loc.name)}>
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
