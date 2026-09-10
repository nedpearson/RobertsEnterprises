import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@vowos/design-system';
import { Badge } from '@vowos/design-system';
import { Popover, PopoverContent, PopoverTrigger } from '@vowos/design-system';
import { Calendar } from '@vowos/design-system';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from 'date-fns';
import { Department } from '@/lib/services/workforceStore';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Building2, 
  Users, 
  Filter, 
  RefreshCw 
} from 'lucide-react';

export interface PayrollScope {
  startDate: string;
  endDate: string;
  businessIds: string[]; // Supports multiple brands
  locations: string[]; // ['all'] or array of IDs
  payGroup: string; // 'all' or specific
  department: string; // 'all' or specific
  employeeSearch: string;
}

interface PayrollScopeBarProps {
  onScopeChange: (scope: PayrollScope) => void;
  departments: Department[];
}

export function PayrollScopeBar({ onScopeChange, departments }: PayrollScopeBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
    from: searchParams.get('start') ? new Date(searchParams.get('start')!) : startOfMonth(new Date()),
    to: searchParams.get('end') ? new Date(searchParams.get('end')!) : endOfMonth(new Date())
  });

  const [businessIds, setBusinessIds] = useState<string[]>(searchParams.get('businesses')?.split(',') || ['1bf69ca1-0000-0000-0000-000000000000', '0d872f24-0000-0000-0000-000000000000']);
  const [locations, setLocations] = useState<string[]>(searchParams.get('locations')?.split(',') || ['all']);
  const [payGroup, setPayGroup] = useState(searchParams.get('group') || 'all');
  const [department, setDepartment] = useState(searchParams.get('dept') || 'all');
  const [employeeSearch, setEmployeeSearch] = useState(searchParams.get('q') || '');

  // Synchronize state to URL and notify parent
  useEffect(() => {
    const scope: PayrollScope = {
      startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
      endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
      businessIds,
      locations,
      payGroup,
      department,
      employeeSearch
    };

    const newParams = new URLSearchParams(searchParams);
    if (scope.startDate) newParams.set('start', scope.startDate);
    if (scope.endDate) newParams.set('end', scope.endDate);
    newParams.set('businesses', scope.businessIds.join(','));
    newParams.set('locations', scope.locations.join(','));
    newParams.set('group', scope.payGroup);
    newParams.set('dept', scope.department);
    if (scope.employeeSearch) newParams.set('q', scope.employeeSearch);
    else newParams.delete('q');

    setSearchParams(newParams, { replace: true });
    onScopeChange(scope);
  }, [dateRange, businessIds, locations, payGroup, department, employeeSearch]);

  const handlePresetDate = (preset: string) => {
    const today = new Date();
    let from = today;
    let to = today;

    switch (preset) {
      case 'this_week':
        from = startOfWeek(today);
        to = endOfWeek(today);
        break;
      case 'last_week':
        from = startOfWeek(subDays(today, 7));
        to = endOfWeek(subDays(today, 7));
        break;
      case 'mtd':
        from = startOfMonth(today);
        to = today;
        break;
      case 'prev_month':
        from = startOfMonth(subMonths(today, 1));
        to = endOfMonth(subMonths(today, 1));
        break;
      case 'qtd':
        from = startOfQuarter(today);
        to = today;
        break;
      case 'ytd':
        from = startOfYear(today);
        to = today;
        break;
      case 'current_period':
        from = new Date(today.getFullYear(), today.getMonth(), 16);
        to = new Date(today.getFullYear(), today.getMonth(), 31);
        break;
      case 'prev_period':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = new Date(today.getFullYear(), today.getMonth(), 15);
        break;
    }
    setDateRange({ from, to });
  };

  const clearFilters = () => {
    setLocations(['all']);
    setPayGroup('all');
    setDepartment('all');
    setEmployeeSearch('');
  };

  const formatDisplayDate = () => {
    if (!dateRange.from) return 'Select date range';
    if (dateRange.from && !dateRange.to) return format(dateRange.from, 'MMM d, yyyy');
    return \\ – \\;
  };
  
  const toggleBusiness = (id: string) => {
    if (businessIds.includes(id)) {
      setBusinessIds(businessIds.filter(b => b !== id));
    } else {
      setBusinessIds([...businessIds, id]);
    }
  };

  const toggleLocation = (id: string) => {
    if (id === 'all') {
      setLocations(['all']);
      return;
    }
    
    let newLocs = locations.filter(l => l !== 'all');
    if (newLocs.includes(id)) {
      newLocs = newLocs.filter(l => l !== id);
    } else {
      newLocs = [...newLocs, id];
    }
    
    if (newLocs.length === 0) setLocations(['all']);
    else setLocations(newLocs);
  };

  const businessOptions = [
    { id: '1bf69ca1-0000-0000-0000-000000000000', name: 'I Do Bridal Couture' },
    { id: '0d872f24-0000-0000-0000-000000000000', name: 'Proper & Company' }
  ];
  
  const locationOptions = [
    { id: 'covington', name: 'Covington' },
    { id: 'baton-rouge', name: 'Baton Rouge' },
    { id: 'north', name: 'North Boutique' },
    { id: 'south', name: 'South Boutique' },
    { id: 'downtown', name: 'Downtown' }
  ];

  return (
    <div className="bg-white border-b sticky top-0 z-10 p-3 flex flex-wrap items-center gap-3 shadow-sm text-sm">
      
      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 font-medium">
            <CalendarIcon className="w-4 h-4 text-status-info" />
            {formatDisplayDate()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 flex gap-4" align="start">
          <div className="flex flex-col gap-2 w-[160px] border-r pr-4">
            <h4 className="font-semibold text-xs text-text-muted uppercase tracking-wider mb-2">Presets</h4>
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => handlePresetDate('current_period')}>Current Pay Period</Button>
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => handlePresetDate('prev_period')}>Previous Pay Period</Button>
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => handlePresetDate('this_week')}>This Week</Button>
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => handlePresetDate('last_week')}>Last Week</Button>
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => handlePresetDate('mtd')}>Month to Date</Button>
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => handlePresetDate('prev_month')}>Previous Month</Button>
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => handlePresetDate('qtd')}>Quarter to Date</Button>
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => handlePresetDate('ytd')}>Year to Date</Button>
          </div>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={(range) => range && setDateRange({ from: range.from!, to: range.to })}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <div className="h-6 w-px bg-gray-200 mx-1"></div>

      {/* Business Selector (Multi-select) */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 font-medium">
            <Building2 className="w-4 h-4 text-text-muted" />
            {businessIds.length === businessOptions.length ? 'All Brands' : \\ Brand\\}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-2" align="start">
          <h4 className="font-semibold text-xs text-text-muted uppercase tracking-wider mb-2 px-2">Select Brands</h4>
          {businessOptions.map(biz => (
            <div key={biz.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleBusiness(biz.id)}>
              <input type="checkbox" checked={businessIds.includes(biz.id)} readOnly className="rounded border-gray-300" />
              <span className="text-sm">{biz.name}</span>
            </div>
          ))}
        </PopoverContent>
      </Popover>

      <div className="h-6 w-px bg-gray-200 mx-1"></div>

      {/* Location Selector (Multi-select) */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 font-medium">
            <MapPin className="w-4 h-4 text-text-muted" />
            {locations.includes('all') ? 'All Locations' : \\ Location\\}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-2" align="start">
          <h4 className="font-semibold text-xs text-text-muted uppercase tracking-wider mb-2 px-2">Select Locations</h4>
          <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleLocation('all')}>
            <input type="checkbox" checked={locations.includes('all')} readOnly className="rounded border-gray-300" />
            <span className="text-sm font-medium">All Locations</span>
          </div>
          <div className="my-1 border-t border-gray-100" />
          {locationOptions.map(loc => (
            <div key={loc.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer" onClick={() => toggleLocation(loc.id)}>
              <input type="checkbox" checked={!locations.includes('all') && locations.includes(loc.id)} readOnly className="rounded border-gray-300" />
              <span className="text-sm">{loc.name}</span>
            </div>
          ))}
        </PopoverContent>
      </Popover>

      <div className="h-6 w-px bg-gray-200 mx-1"></div>

      {/* Pay Group Selector */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-text-muted" />
        <select 
          className="bg-transparent border-none outline-none cursor-pointer text-text-primary"
          value={payGroup}
          onChange={(e) => setPayGroup(e.target.value)}
        >
          <option value="all">All Pay Groups</option>
          <option value="hourly">Hourly</option>
          <option value="salary">Salary</option>
          <option value="hourly_plus_commission">Hourly + Commission</option>
          <option value="salary_plus_commission">Salary + Commission</option>
        </select>
      </div>

      <div className="h-6 w-px bg-gray-200 mx-1"></div>

      {/* Department Selector */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-text-muted" />
        <select 
          className="bg-transparent border-none outline-none cursor-pointer text-text-primary"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-grow"></div>

      {/* Sticky Selected Chips */}
      <div className="hidden lg:flex items-center gap-2">
        {!locations.includes('all') && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setLocations(['all'])}>
            Loc: {locations.join(', ')} ×
          </Badge>
        )}
        {payGroup !== 'all' && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setPayGroup('all')}>
            Grp: {payGroup} ×
          </Badge>
        )}
        {department !== 'all' && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setDepartment('all')}>
            Dept: {department} ×
          </Badge>
        )}
        
        {(payGroup !== 'all' || !locations.includes('all') || department !== 'all' || employeeSearch !== '') && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-text-muted hover:text-red-600 h-6 px-2 text-xs">
            Clear Filters
          </Button>
        )}
      </div>

      <Button variant="outline" size="sm" onClick={() => {
        onScopeChange({...{
          startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
          endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
          businessIds,
          locations,
          payGroup,
          department,
          employeeSearch
        }});
      }}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>

    </div>
  );
}
