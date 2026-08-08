import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BoutiqueLocation, LOCATIONS } from '@/data/vowosData';

export type SettingScope = 'organization' | 'brand' | 'location';

interface ScopeSelectorProps {
  scope: SettingScope;
  locationId?: string;
  onScopeChange: (scope: SettingScope, locationId?: string) => void;
  brand?: string;
  onBrandChange?: (brand: string) => void;
}

export function ScopeSelector({
  scope,
  locationId,
  onScopeChange,
  brand,
  onBrandChange,
}: ScopeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Scope:</span>
        <Select
          value={scope}
          onValueChange={(val) => {
            const nextScope = val as SettingScope;
            onScopeChange(
              nextScope,
              nextScope === 'location' ? locationId || LOCATIONS[0].id : undefined
            );
          }}
        >
          <SelectTrigger className="h-9 w-[180px] bg-white text-stone-800">
            <SelectValue placeholder="Select scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="organization">Organization Default</SelectItem>
            <SelectItem value="brand">Brand Override</SelectItem>
            <SelectItem value="location">Location Override</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {scope === 'brand' && onBrandChange && (
        <div className="flex items-center gap-2 animate-fade-in">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Brand:</span>
          <Select value={brand} onValueChange={onBrandChange}>
            <SelectTrigger className="h-9 w-[200px] bg-white text-stone-800">
              <SelectValue placeholder="Select Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="I Do Bridal Couture">I Do Bridal Couture</SelectItem>
              <SelectItem value="Proper & Company">Proper & Company</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {scope === 'location' && (
        <div className="flex items-center gap-2 animate-fade-in">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Boutique:</span>
          <Select
            value={locationId}
            onValueChange={(locId) => onScopeChange('location', locId)}
          >
            <SelectTrigger className="h-9 w-[220px] bg-white text-stone-800">
              <SelectValue placeholder="Select Boutique" />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.short}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
