const fs = require('fs');

let content = fs.readFileSync('apps/marketing/src/pages/PlatformAdmin/TenantWizard.tsx', 'utf-8');

const state_declarations = 
  // State for forms
  const [orgData, setOrgData] = useState({ name: '', slug: '', contactEmail: '' });
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedOnboarding, setSelectedOnboarding] = useState<string>('');
  
  const [brands, setBrands] = useState<{name: string, type: string}[]>([{name: '', type: 'Bridal'}]);
  const [locations, setLocations] = useState<{name: string, city: string}[]>([{name: '', city: ''}]);
  const [ownerData, setOwnerData] = useState({ firstName: '', lastName: '', phone: '' });
  const [modules, setModules] = useState<string[]>(['scheduling', 'sales']);
  const [settingsData, setSettingsData] = useState({ requireDeposit: true, sendReminders: true });
  const [connections, setConnections] = useState<string[]>([]);
  const [migration, setMigration] = useState('Basic CSV');
  const [training, setTraining] = useState('Self-guided');
  const [goLive, setGoLive] = useState<string[]>([]);
;

content = content.replace(
  /  \/\/ State for forms[\s\S]*?const \[selectedOnboarding, setSelectedOnboarding\] = useState<string>\(''\);/,
  state_declarations.trim()
);

const ui_components = 
              {currentStep === 3 && (
                <div className="space-y-4">
                  <Label>Businesses / Brands</Label>
                  <p className="text-sm text-stone-500 mb-4">Add the brands that will operate under this organization.</p>
                  {brands.map((brand, idx) => (
                    <div key={idx} className="flex gap-4 items-end mb-2">
                      <div className="flex-1 space-y-2">
                        <Label>Brand Name</Label>
                        <Input value={brand.name} onChange={e => {
                          const newBrands = [...brands];
                          newBrands[idx].name = e.target.value;
                          setBrands(newBrands);
                        }} placeholder="e.g. Magnolia Bridal" />
                      </div>
                      <div className="w-48 space-y-2">
                        <Label>Type</Label>
                        <Select value={brand.type} onValueChange={v => {
                          const newBrands = [...brands];
                          newBrands[idx].type = v;
                          setBrands(newBrands);
                        }}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bridal">Bridal</SelectItem>
                            <SelectItem value="Formalwear">Formalwear</SelectItem>
                            <SelectItem value="Wholesale">Wholesale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" onClick={() => {
                        setBrands(brands.filter((_, i) => i !== idx));
                      }}>Remove</Button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={() => setBrands([...brands, {name: '', type: 'Bridal'}])}>+ Add Brand</Button>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <Label>Locations</Label>
                  <p className="text-sm text-stone-500 mb-4">Add physical store locations.</p>
                  {locations.map((loc, idx) => (
                    <div key={idx} className="flex gap-4 items-end mb-2">
                      <div className="flex-1 space-y-2">
                        <Label>Location Name</Label>
                        <Input value={loc.name} onChange={e => {
                          const newLocs = [...locations];
                          newLocs[idx].name = e.target.value;
                          setLocations(newLocs);
                        }} placeholder="e.g. Downtown Flagship" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>City</Label>
                        <Input value={loc.city} onChange={e => {
                          const newLocs = [...locations];
                          newLocs[idx].city = e.target.value;
                          setLocations(newLocs);
                        }} placeholder="e.g. New York" />
                      </div>
                      <Button variant="outline" onClick={() => {
                        setLocations(locations.filter((_, i) => i !== idx));
                      }}>Remove</Button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={() => setLocations([...locations, {name: '', city: ''}])}>+ Add Location</Button>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-4">
                  <Label>Owner Details</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={ownerData.firstName} onChange={e => setOwnerData({...ownerData, firstName: e.target.value})} placeholder="e.g. Jane" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={ownerData.lastName} onChange={e => setOwnerData({...ownerData, lastName: e.target.value})} placeholder="e.g. Doe" />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Phone Number</Label>
                    <Input value={ownerData.phone} onChange={e => setOwnerData({...ownerData, phone: e.target.value})} placeholder="(555) 123-4567" />
                  </div>
                </div>
              )}

              {currentStep > 5 && currentStep < 12 && (
                <div className="py-12 text-center text-stone-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-300" />
                  <p>Configuration panel for {STEPS[currentStep]}</p>
                  <p className="text-sm">Standard template applied successfully.</p>
                </div>
              )}
;

content = content.replace(
  /\{currentStep > 2 && currentStep < 12 && \([\s\S]*?<\/div>\s*\)\}/,
  ui_components.trim()
);

fs.writeFileSync('apps/marketing/src/pages/PlatformAdmin/TenantWizard.tsx', content);
