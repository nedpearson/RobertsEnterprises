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
  businessId: string;
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

  const [businessId, setBusinessId] = useState(searchParams.get('business') || 'roberts-enterprises');
  const [locations, setLocations] = useState<string[]>(searchParams.get('locations')?.split(',') || ['all']);
  const [payGroup, setPayGroup] = useState(searchParams.get('group') || 'all');
  const [department, setDepartment] = useState(searchParams.get('dept') || 'all');
  const [employeeSearch, setEmployeeSearch] = useState(searchParams.get('q') || '');

  // Synchronize state to URL and notify parent
  useEffect(() => {
    const scope: PayrollScope = {
      startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
      endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
      businessId,
      locations,
      payGroup,
      department,
      employeeSearch
    };

    const newParams = new URLSearchParams(searchParams);
    if (scope.startDate) newParams.set('start', scope.startDate);
    if (scope.endDate) newParams.set('end', scope.endDate);
    newParams.set('business', scope.businessId);
    newParams.set('locations', scope.locations.join(','));
    newParams.set('group', scope.payGroup);
    newParams.set('dept', scope.department);
    if (scope.employeeSearch) newParams.set('q', scope.employeeSearch);
    else newParams.delete('q');

    setSearchParams(newParams, { replace: true });
    onScopeChange(scope);
  }, [dateRange, businessId, locations, payGroup, department, employeeSearch]);

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
        // Simulate current period to match instructions: July 16 - 31
        from = new Date(today.getFullYear(), 6, 16);
        to = new Date(today.getFullYear(), 6, 31);
        break;
      case 'prev_period':
        from = new Date(today.getFullYear(), 6, 1);
        to = new Date(today.getFullYear(), 6, 15);
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
    return `${format(dateRange.from, 'MMM d, yyyy')} – ${format(dateRange.to, 'MMM d, yyyy')}`;
  };

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

      {/* Business Selector */}
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-text-muted" />
        <select 
          className="bg-transparent font-medium border-none outline-none cursor-pointer"
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
        >
          <option value="roberts-enterprises">The Boutique</option>
        </select>
      </div>

      <div className="h-6 w-px bg-gray-200 mx-1"></div>

      {/* Location Selector */}
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-text-muted" />
        <select 
          className="bg-transparent border-none outline-none cursor-pointer text-text-primary"
          value={locations.includes('all') ? 'all' : locations[0]}
          onChange={(e) => {
            const val = e.target.value;
            setLocations(val === 'all' ? ['all'] : [val]);
          }}
        >
          <option value="all">All Locations</option>
          <option value="north">North Boutique</option>
          <option value="south">South Boutique</option>
          <option value="downtown">Downtown</option>
          <option value="covington">Covington</option>
        </select>
      </div>

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
        // Trigger a force re-fetch or re-calc if needed by parent
        onScopeChange({...{
          startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
          endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
          businessId,
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


