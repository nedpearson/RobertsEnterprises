import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  useBusiness, 
  useCustomers, 
  useServices, 
  useStaffProfiles, 
  useActiveBusinessContext,
  useCreateRequest 
} from '@/lib/services/schedulingService';
import { useVowosData } from '@/contexts/VowosDataContext';
import { toast } from 'sonner';
import { AlertCircle, ChevronLeft, ChevronRight, Check, Plus, Trash, FileText, UserPlus, Search } from 'lucide-react';

export interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: { start_at?: string; employee_id?: string } | null;
}

type Step = 'CUSTOMER' | 'REQUEST' | 'FILES' | 'REVIEW' | 'SAVE';

export function NewRequestModal({ isOpen, onClose, initialData }: NewRequestModalProps) {
  const activeContext = useActiveBusinessContext();
  const businessId = activeContext.businessId;
  const activeLocation = activeContext.locationId;
  
  const { data: customers = [] } = useCustomers(businessId);
  const { data: services = [] } = useServices(businessId);
  const { data: staff = [] } = useStaffProfiles(businessId);
  
  const createRequestMutation = useCreateRequest();

  const [step, setStep] = useState<Step>('CUSTOMER');

  // Step 1: Customer States
  const [customerMode, setCustomerMode] = useState<'SEARCH' | 'CREATE'>('SEARCH');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Create customer fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [prefComm, setPrefComm] = useState<'sms' | 'email' | 'phone'>('sms');
  const [smsConsent, setSmsConsent] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('');
  const [language, setLanguage] = useState('en');
  const [custNotes, setCustNotes] = useState('');

  // Duplicate warning
  const [duplicateCustomer, setDuplicateCustomer] = useState<any | null>(null);

  // Step 2: Request Details States
  const [serviceId, setServiceId] = useState('');
  const [prefEmployeeId, setPrefEmployeeId] = useState('');
  const [prefDate1, setPrefDate1] = useState('');
  const [prefWindow1, setPrefWindow1] = useState('morning');
  const [prefDate2, setPrefDate2] = useState('');
  const [prefWindow2, setPrefWindow2] = useState('');
  const [flexibleDate, setFlexibleDate] = useState(false);
  const [flexibleLocation, setFlexibleLocation] = useState(false);
  const [numberGuests, setNumberGuests] = useState(1);
  const [eventDate, setEventDate] = useState('');
  const [budget, setBudget] = useState('');
  const [designerInterest, setDesignerInterest] = useState('');
  const [source, setSource] = useState('Phone');
  const [campaign, setCampaign] = useState('');
  const [reqNotes, setReqNotes] = useState('');

  // Step 3: Files States
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [newFileUrl, setNewFileUrl] = useState('');

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setStep('CUSTOMER');
      setCustomerMode('SEARCH');
      setSelectedCustomerId('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setPrefComm('sms');
      setSmsConsent(false);
      setEmailConsent(false);
      setAccessibilityNeeds('');
      setLanguage('en');
      setCustNotes('');
      setDuplicateCustomer(null);

      setServiceId('');
      setPrefEmployeeId(initialData?.employee_id || '');
      setPrefDate1(initialData?.start_at ? new Date(initialData.start_at).toISOString().split('T')[0] : '');
      setPrefWindow1('morning');
      setPrefDate2('');
      setPrefWindow2('');
      setFlexibleDate(false);
      setFlexibleLocation(false);
      setNumberGuests(1);
      setEventDate('');
      setBudget('');
      setDesignerInterest('');
      setSource('Phone');
      setCampaign('');
      setReqNotes('');
      setFileUrls([]);
      setNewFileUrl('');
    }
  }, [isOpen, initialData]);

  // Real-time duplicate check
  useEffect(() => {
    if (customerMode === 'CREATE' && (email || phone)) {
      const match = customers.find((c: any) => {
        const emailMatch = email && c.email?.toLowerCase() === email.toLowerCase();
        const phoneMatch = phone && c.phone?.replace(/\D/g, '') === phone.replace(/\D/g, '');
        return emailMatch || phoneMatch;
      });
      setDuplicateCustomer(match || null);
    } else {
      setDuplicateCustomer(null);
    }
  }, [email, phone, customerMode, customers]);

  const handleLinkDuplicate = () => {
    if (duplicateCustomer) {
      setSelectedCustomerId(duplicateCustomer.id);
      setCustomerMode('SEARCH');
      toast.info(`Linked request to existing customer: ${duplicateCustomer.name}`);
    }
  };

  const handleAddFileUrl = () => {
    if (newFileUrl.trim()) {
      setFileUrls([...fileUrls, newFileUrl.trim()]);
      setNewFileUrl('');
    }
  };

  const handleRemoveFileUrl = (idx: number) => {
    setFileUrls(fileUrls.filter((_, i) => i !== idx));
  };

  const validateStep = (): boolean => {
    if (step === 'CUSTOMER') {
      if (customerMode === 'SEARCH' && !selectedCustomerId) {
        toast.error('Please select an existing customer or create a new one.');
        return false;
      }
      if (customerMode === 'CREATE') {
        if (!firstName || !lastName) {
          toast.error('First name and Last name are required.');
          return false;
        }
        if (!email && !phone) {
          toast.error('At least one contact method (email or phone) is required.');
          return false;
        }
      }
    } else if (step === 'REQUEST') {
      if (!serviceId) {
        toast.error('Please select a service.');
        return false;
      }
      if (!prefDate1) {
        toast.error('Preferred date is required.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step === 'CUSTOMER') setStep('REQUEST');
    else if (step === 'REQUEST') setStep('FILES');
    else if (step === 'FILES') setStep('REVIEW');
  };

  const handleBack = () => {
    if (step === 'REQUEST') setStep('CUSTOMER');
    else if (step === 'FILES') setStep('REQUEST');
    else if (step === 'REVIEW') setStep('FILES');
  };

  const handleSave = async () => {
    if (!businessId || !activeLocation) {
      toast.error('Missing business or location context.');
      return;
    }

    try {
      const selectedService = services.find((s: any) => s.id === serviceId);
      
      const payload = {
        businessId,
        locationId: activeLocation,
        customer: customerMode === 'SEARCH' ? { id: selectedCustomerId } : {
          name: `${firstName} ${lastName}`,
          email: email || undefined,
          phone: phone || undefined,
          sms_consent: smsConsent,
          email_consent: emailConsent,
          accessibility_needs: accessibilityNeeds || undefined,
          language
        },
        request: {
          service_id: serviceId,
          preferred_employee_id: prefEmployeeId || undefined,
          preferred_date_1: prefDate1,
          preferred_window_1: prefWindow1,
          preferred_date_2: prefDate2 || undefined,
          preferred_window_2: prefWindow2 || undefined,
          flexible_date: flexibleDate,
          flexible_location: flexibleLocation,
          notes: reqNotes || undefined,
          intake_source: source,
          number_of_guests: Number(numberGuests),
          event_date: eventDate || undefined,
          budget_cents: budget ? Math.round(parseFloat(budget) * 100) : undefined,
          designer_interest: designerInterest || undefined,
          campaign_attribution: campaign || undefined
        }
      };

      await createRequestMutation.mutateAsync(payload);
      toast.success('Guided Request Intake completed successfully!');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to complete guided request intake');
    }
  };

  // Resolve Customer Info for Review Screen
  const reviewCustomerName = customerMode === 'SEARCH'
    ? customers.find((c: any) => c.id === selectedCustomerId)?.name || 'Unknown'
    : `${firstName} ${lastName}`;

  const reviewCustomerEmail = customerMode === 'SEARCH'
    ? customers.find((c: any) => c.id === selectedCustomerId)?.email || 'None'
    : email || 'None';

  const reviewCustomerPhone = customerMode === 'SEARCH'
    ? customers.find((c: any) => c.id === selectedCustomerId)?.phone || 'None'
    : phone || 'None';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center pr-6">
            <span>Guided Request Intake</span>
            <span className="text-xs font-normal text-muted-foreground bg-stone-100 px-2.5 py-1 rounded-full">
              Step {step === 'CUSTOMER' ? '1' : step === 'REQUEST' ? '2' : step === 'FILES' ? '3' : '4'} of 4
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1: CUSTOMER */}
        {step === 'CUSTOMER' && (
          <div className="space-y-6 py-4">
            <div className="flex gap-4 p-1 bg-stone-100 rounded-lg">
              <Button 
                type="button"
                variant={customerMode === 'SEARCH' ? 'default' : 'ghost'} 
                className="flex-1 rounded-md"
                onClick={() => setCustomerMode('SEARCH')}
              >
                <Search className="mr-2 h-4 w-4" />
                Search Existing
              </Button>
              <Button 
                type="button"
                variant={customerMode === 'CREATE' ? 'default' : 'ghost'} 
                className="flex-1 rounded-md"
                onClick={() => setCustomerMode('CREATE')}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create New
              </Button>
            </div>

            {customerMode === 'SEARCH' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Existing Customer</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.email ? `(${c.email})` : ''} {c.phone ? `- ${c.phone}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
                  </div>
                </div>

                {duplicateCustomer && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="text-sm font-semibold text-amber-900">Duplicate Customer Detected</h5>
                      <p className="text-xs text-amber-700 mt-1">
                        We found an existing profile matching this info: <strong>{duplicateCustomer.name}</strong> ({duplicateCustomer.phone || duplicateCustomer.email}).
                      </p>
                      <Button 
                        type="button" 
                        variant="link" 
                        className="p-0 h-auto text-xs font-semibold text-amber-900 hover:text-amber-800 underline mt-2"
                        onClick={handleLinkDuplicate}
                      >
                        Link to this existing customer profile instead
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preferred Communication</Label>
                    <Select value={prefComm} onValueChange={(v: any) => setPrefComm(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS Text Message</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="smsConsent" checked={smsConsent} onCheckedChange={(v) => setSmsConsent(!!v)} />
                    <Label htmlFor="smsConsent" className="text-xs font-normal">Customer consents to receiving SMS updates</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="emailConsent" checked={emailConsent} onCheckedChange={(v) => setEmailConsent(!!v)} />
                    <Label htmlFor="emailConsent" className="text-xs font-normal">Customer consents to receiving Email promotional materials & updates</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Accessibility Needs</Label>
                  <Input value={accessibilityNeeds} onChange={(e) => setAccessibilityNeeds(e.target.value)} placeholder="e.g. Wheelchair access, Sign language support" />
                </div>

                <div className="space-y-2">
                  <Label>Customer Internal Notes</Label>
                  <Textarea value={custNotes} onChange={(e) => setCustNotes(e.target.value)} placeholder="VIP, referred by..." rows={2} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: REQUEST DETAILS */}
        {step === 'REQUEST' && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service *</Label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preferred Staff / Consultant</Label>
                <Select value={prefEmployeeId} onValueChange={setPrefEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any Consultant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Consultant</SelectItem>
                    {staff.map((st: any) => (
                      <SelectItem key={st.id} value={st.id}>{st.name} ({st.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Date Preference *</Label>
                <Input type="date" value={prefDate1} onChange={(e) => setPrefDate1(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Primary Time Window</Label>
                <Select value={prefWindow1} onValueChange={setPrefWindow1}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (9am - 12pm)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12pm - 4pm)</SelectItem>
                    <SelectItem value="evening">Evening (4pm - 8pm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Alternate Date Preference</Label>
                <Input type="date" value={prefDate2} onChange={(e) => setPrefDate2(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Alternate Time Window</Label>
                <Select value={prefWindow2} onValueChange={setPrefWindow2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose alternate..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (9am - 12pm)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12pm - 4pm)</SelectItem>
                    <SelectItem value="evening">Evening (4pm - 8pm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-6 pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox id="flexDate" checked={flexibleDate} onCheckedChange={(v) => setFlexibleDate(!!v)} />
                <Label htmlFor="flexDate">Flexible Dates</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="flexLoc" checked={flexibleLocation} onCheckedChange={(v) => setFlexibleLocation(!!v)} />
                <Label htmlFor="flexLoc">Flexible Locations</Label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Number of Guests</Label>
                <Input type="number" min={1} value={numberGuests} onChange={(e) => setNumberGuests(parseInt(e.target.value) || 1)} />
              </div>
              <div className="space-y-2">
                <Label>Event/Wedding Date</Label>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Estimated Budget ($)</Label>
                <Input type="number" placeholder="Budget limit" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Product/Designer Interest</Label>
                <Input placeholder="e.g. Monique Lhuillier, A-line gowns" value={designerInterest} onChange={(e) => setDesignerInterest(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Intake Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phone">Phone Call</SelectItem>
                    <SelectItem value="In-person">In-person</SelectItem>
                    <SelectItem value="Web">Web Intake Form</SelectItem>
                    <SelectItem value="Social">Social Media</SelectItem>
                    <SelectItem value="Referral">Word of Mouth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Campaign Attribution</Label>
              <Input placeholder="e.g. Summer Bridal Fair 2026" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Request Notes</Label>
              <Textarea value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} placeholder="Include special preferences or alternate locations..." rows={3} />
            </div>
          </div>
        )}

        {/* STEP 3: FILES & INSPIRATION */}
        {step === 'FILES' && (
          <div className="space-y-6 py-4">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-4">
              <Label className="text-sm font-semibold">Supporting Documents & Inspiration URLs</Label>
              <p className="text-xs text-muted-foreground">Add links to bridal boards, Pinterest ideas, or custom sizing worksheets.</p>
              
              <div className="flex gap-2">
                <Input 
                  placeholder="https://pinterest.com/... or document URL" 
                  value={newFileUrl} 
                  onChange={(e) => setNewFileUrl(e.target.value)}
                />
                <Button type="button" onClick={handleAddFileUrl} className="shrink-0 bg-stone-900 text-white">
                  <Plus className="h-4 w-4 mr-1" /> Add Link
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Linked Files ({fileUrls.length})</Label>
              {fileUrls.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground text-sm">
                  No links added yet. Paste a Pinterest board or inspiration URL above.
                </div>
              ) : (
                <div className="space-y-2">
                  {fileUrls.map((url, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-stone-50 p-2.5 rounded-lg border">
                      <div className="flex items-center gap-2 truncate pr-4">
                        <FileText className="h-4 w-4 text-stone-500 shrink-0" />
                        <span className="text-sm truncate text-stone-700">{url}</span>
                      </div>
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-rose-600 hover:text-rose-700 shrink-0"
                        onClick={() => handleRemoveFileUrl(idx)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & SAVE */}
        {step === 'REVIEW' && (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="bg-stone-50 rounded-xl p-4 border space-y-3">
                <h4 className="font-serif font-semibold text-lg text-stone-900 border-b pb-2 flex justify-between items-center">
                  <span>Customer Summary</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {customerMode === 'SEARCH' ? 'Linked Profile' : 'New Profile'}
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-stone-700">
                  <div><strong>Name:</strong> {reviewCustomerName}</div>
                  <div><strong>Preferred Contact:</strong> {prefComm.toUpperCase()}</div>
                  <div><strong>Phone:</strong> {reviewCustomerPhone}</div>
                  <div><strong>Email:</strong> {reviewCustomerEmail}</div>
                  {customerMode === 'CREATE' && (
                    <div className="col-span-2 pt-2 border-t mt-1 text-xs text-stone-500">
                      SMS Updates: {smsConsent ? 'Consented' : 'No Consent'} | Promos: {emailConsent ? 'Consented' : 'No Consent'}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-stone-50 rounded-xl p-4 border space-y-3">
                <h4 className="font-serif font-semibold text-lg text-stone-900 border-b pb-2">Request details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-stone-700">
                  <div><strong>Service:</strong> {services.find(s => s.id === serviceId)?.name || 'Unknown'}</div>
                  <div><strong>Intake Source:</strong> {source}</div>
                  <div><strong>Preferred Date:</strong> {prefDate1} ({prefWindow1})</div>
                  <div><strong>Alt Date:</strong> {prefDate2 || 'None'} {prefDate2 ? `(${prefWindow2})` : ''}</div>
                  <div><strong>Preferred Staff:</strong> {staff.find(st => st.id === prefEmployeeId)?.name || 'Any Consultant'}</div>
                  <div><strong>Guests:</strong> {numberGuests}</div>
                  {eventDate && <div><strong>Event Date:</strong> {eventDate}</div>}
                  {budget && <div><strong>Budget:</strong> ${budget}</div>}
                </div>
              </div>

              {fileUrls.length > 0 && (
                <div className="bg-stone-50 rounded-xl p-4 border space-y-2">
                  <h4 className="font-serif font-semibold text-sm text-stone-900">Inspiration Links</h4>
                  <div className="text-xs text-stone-600 truncate space-y-1">
                    {fileUrls.map((url, i) => <div key={i} className="truncate">• {url}</div>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t pt-4">
          {step !== 'CUSTOMER' && (
            <Button type="button" variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            disabled={createRequestMutation.isPending}
          >
            Cancel
          </Button>

          {step !== 'REVIEW' ? (
            <Button type="button" onClick={handleNext} className="bg-stone-900 text-white hover:bg-stone-800">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              type="button" 
              onClick={handleSave} 
              disabled={createRequestMutation.isPending} 
              className="bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-sm transition-colors"
            >
              {createRequestMutation.isPending ? 'Submitting...' : 'Complete Intake & Save'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
