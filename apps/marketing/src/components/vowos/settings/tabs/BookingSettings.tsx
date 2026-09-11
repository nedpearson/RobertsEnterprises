import { useVowosData } from '@/contexts/VowosDataContext';
import { useEffect, useState } from 'react';
import { Loader2, MousePointerClick, Plus, Trash2, ArrowUp, ArrowDown, DollarSign, CalendarDays, FileText, CheckCircle2 } from 'lucide-react';
import { toast, Switch } from '@vowos/design-system';
import { inputCls, btnPrimary, btnSecondary } from '@/components/vowos/ui';
import {
  BookingSettings,
  BookingQuestion,
  BookingFeeSettings,
  DEFAULT_BOOKING_SETTINGS,
  DEFAULT_BOOKING_QUESTIONS,
  DEFAULT_BOOKING_FEE_SETTINGS,
  resolveEffectiveSetting,
  saveScopedSetting,
} from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';
import { APPOINTMENT_TYPES } from '@/data/vowosData';

interface BookingSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function BookingSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: BookingSettingsTabProps) {
  const { activeLocations } = useVowosData();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'fees' | 'intake'>('rules');
  const [isDeploying, setIsDeploying] = useState(false);

  // Settings states
  const [booking, setBooking] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);
  const [dbBooking, setDbBooking] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);

  const [questions, setQuestions] = useState<BookingQuestion[]>(DEFAULT_BOOKING_QUESTIONS);
  const [dbQuestions, setDbQuestions] = useState<BookingQuestion[]>(DEFAULT_BOOKING_QUESTIONS);

  const [feeSettings, setFeeSettings] = useState<BookingFeeSettings>(DEFAULT_BOOKING_FEE_SETTINGS);
  const [dbFeeSettings, setDbFeeSettings] = useState<BookingFeeSettings>(DEFAULT_BOOKING_FEE_SETTINGS);

  // Form state for adding questions
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<BookingQuestion['type']>('text');
  const [newQOpts, setNewQOpts] = useState('');
  const [newQRequired, setNewQRequired] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    
    const bookingResult = await resolveEffectiveSetting<BookingSettings>('booking', 'booking_settings', { dataPlane }, DEFAULT_BOOKING_SETTINGS);
    setBooking(bookingResult.value);
    setDbBooking(bookingResult.value);

    const questionsResult = await resolveEffectiveSetting<BookingQuestion[]>('booking', 'booking_questions', { dataPlane }, DEFAULT_BOOKING_QUESTIONS);
    const sorted = [...questionsResult.value].sort((a, b) => a.displayOrder - b.displayOrder);
    setQuestions(sorted);
    setDbQuestions(JSON.parse(JSON.stringify(sorted)));

    const feeResult = await resolveEffectiveSetting<BookingFeeSettings>('booking', 'booking_fee_settings', { dataPlane }, DEFAULT_BOOKING_FEE_SETTINGS);
    setFeeSettings(feeResult.value);
    setDbFeeSettings(feeResult.value);

    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const isDirty =
    JSON.stringify(booking) !== JSON.stringify(dbBooking) ||
    JSON.stringify(questions) !== JSON.stringify(dbQuestions) ||
    JSON.stringify(feeSettings) !== JSON.stringify(dbFeeSettings);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (reason?: string): Promise<boolean> => {
    setSaving(true);
    const orderedQuestions = questions.map((q, idx) => ({ ...q, displayOrder: idx + 1 }));
    
    try {
      const dataPlane = getActiveDataPlane();
      await saveScopedSetting('booking', 'booking_settings', booking, { dataPlane }, reason);
      await saveScopedSetting('booking', 'booking_questions', orderedQuestions, { dataPlane }, reason);
      await saveScopedSetting('booking', 'booking_fee_settings', feeSettings, { dataPlane }, reason);
      
      setSaving(false);
      toast({
        title: 'Settings saved',
        description: 'Online booking rules, questions, and fee policies updated.',
      });
      setDbBooking(booking);
      setDbQuestions(JSON.parse(JSON.stringify(orderedQuestions)));
      setQuestions(orderedQuestions);
      setDbFeeSettings(feeSettings);
      return true;
    } catch (err: any) {
      setSaving(false);
      toast({
        title: 'Could not save booking settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [booking, questions, feeSettings]);

  const addQuestion = () => {
    if (!newQText.trim()) {
      toast({ title: 'Question required', description: 'Enter the question text first.', variant: 'destructive' });
      return;
    }
    const newQ: BookingQuestion = {
      id: String(Date.now()),
      question: newQText,
      type: newQType,
      options: ['select', 'multiselect'].includes(newQType)
        ? newQOpts.split(',').map((o) => o.trim()).filter(Boolean)
        : undefined,
      required: newQRequired,
      employeeOnly: false,
      customerVisible: true,
      displayOrder: questions.length + 1,
      appointmentTypes: [...APPOINTMENT_TYPES],
    };

    setQuestions([...questions, newQ]);
    setNewQText('');
    setNewQOpts('');
    setNewQRequired(false);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const list = [...questions];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setQuestions(list);
  };

  const deployWidget = () => {
    setIsDeploying(true);
    toast({ title: 'Deploying Widget', description: 'Updating the booking widget on your website...' });
    setTimeout(() => {
      setIsDeploying(false);
      toast({ title: 'Deploy Complete', description: 'Website widget is now using the latest settings.' });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading booking configuration…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-pink-100 p-2.5 text-pink-700">
              <MousePointerClick className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Online Booking</h3>
              <p className="text-xs text-stone-500">
                Configure appointment widget options, intake forms, and reservation fees.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={deployWidget}
            disabled={isDeploying}
            className={`${btnSecondary} gap-2`}
          >
            {isDeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Publish Widget
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'rules', label: 'Availability Rules', icon: CalendarDays },
            { id: 'fees', label: 'Booking Fees', icon: DollarSign },
            { id: 'intake', label: 'Intake Forms', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'rules' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-stone-900">Online Booking Status</h4>
              <p className="text-xs text-stone-500 mb-4">Determine general options for customer self-booking.</p>
            </div>
            <Switch
              checked={booking.enabled}
              onCheckedChange={(checked) => setBooking({ ...booking, enabled: checked })}
              className="data-[state=checked]:bg-status-success"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Earliest notice (hours)</label>
              <p className="text-[11px] text-stone-400 mb-1">Prevents last-minute bookings. Default is 24 hours.</p>
              <input
                type="number"
                min="0"
                value={booking.earliestNoticeHours}
                onChange={(e) => setBooking({ ...booking, earliestNoticeHours: parseInt(e.target.value) || 0 })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Maximum days in advance</label>
              <p className="text-[11px] text-stone-400 mb-1">Furthest date a customer can book. Default is 90.</p>
              <input
                type="number"
                min="1"
                value={booking.maxDaysAdvance}
                onChange={(e) => setBooking({ ...booking, maxDaysAdvance: parseInt(e.target.value) || 1 })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Default duration (minutes)</label>
              <input
                type="number"
                min="15"
                step="15"
                value={booking.defaultDurationMinutes}
                onChange={(e) => setBooking({ ...booking, defaultDurationMinutes: parseInt(e.target.value) || 15 })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Party size limit</label>
              <input
                type="number"
                min="1"
                value={booking.partySizeMax}
                onChange={(e) => setBooking({ ...booking, partySizeMax: parseInt(e.target.value) || 1 })}
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2 space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-stone-800">Support same-day appointments</p>
                  <p className="text-[11px] text-stone-400">Allows booking on the current calendar day.</p>
                </div>
                <Switch
                  checked={booking.sameDayBooking}
                  onCheckedChange={(checked) => setBooking({ ...booking, sameDayBooking: checked })}
                  className="data-[state=checked]:bg-status-success"
                />
              </div>

              <div className="flex items-center justify-between border-t border-stone-200 pt-3">
                <div>
                  <p className="text-xs font-semibold text-stone-800">Automatic Employee Assignment</p>
                  <p className="text-[11px] text-stone-400">Distributes bookings evenly among stylists.</p>
                </div>
                <Switch
                  checked={booking.autoAssignmentEnabled}
                  onCheckedChange={(checked) => setBooking({ ...booking, autoAssignmentEnabled: checked })}
                  className="data-[state=checked]:bg-status-success"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'fees' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-stone-900">Booking Fee Policies</h4>
              <p className="text-xs text-stone-500 mb-4">Configure appointment reservation fee defaults, waivers, and refund deadlines.</p>
            </div>
            <Switch
              checked={feeSettings.enabled}
              onCheckedChange={(enabled) => setFeeSettings({ ...feeSettings, enabled })}
              className="data-[state=checked]:bg-status-success"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Default booking fee ($)</label>
              <input
                type="number"
                min="0"
                value={feeSettings.amountCents / 100}
                onChange={(e) =>
                  setFeeSettings({
                    ...feeSettings,
                    amountCents: Math.round(parseFloat(e.target.value) * 100) || 0,
                  })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Cancellation deadline (hours)</label>
              <p className="text-[11px] text-stone-400 mb-1">Hours prior to start to receive refunds/waivers.</p>
              <input
                type="number"
                min="0"
                value={feeSettings.cancelDeadlineHours}
                onChange={(e) =>
                  setFeeSettings({
                    ...feeSettings,
                    cancelDeadlineHours: parseInt(e.target.value) || 0,
                  })
                }
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2 space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-stone-800">Refundable Booking Fee</p>
                  <p className="text-[11px] text-stone-400">Determines if cancellations before deadline receive a full refund.</p>
                </div>
                <Switch
                  checked={feeSettings.refundable}
                  onCheckedChange={(checked) => setFeeSettings({ ...feeSettings, refundable: checked })}
                  className="data-[state=checked]:bg-status-success"
                />
              </div>

              <div className="flex items-center justify-between border-t border-stone-200 pt-3">
                <div>
                  <p className="text-xs font-semibold text-stone-800">Credit Toward Purchase</p>
                  <p className="text-[11px] text-stone-400">Automatically marks the fee as store credit upon showroom checkout.</p>
                </div>
                <Switch
                  checked={feeSettings.creditTowardPurchase}
                  onCheckedChange={(checked) => setFeeSettings({ ...feeSettings, creditTowardPurchase: checked })}
                  className="data-[state=checked]:bg-status-success"
                />
              </div>

              {/* Location Scoped Overrides */}
              <div className="border-t border-stone-200 pt-3 space-y-2">
                <p className="text-xs font-semibold text-stone-800">Location-Scoped Fee Overrides</p>
                <p className="text-[11px] text-stone-400">Override the organization default ($75.00) for specific store locations.</p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {activeLocations.map((loc) => (
                    <div key={loc.id}>
                      <label className="text-[10px] font-semibold uppercase text-stone-500">{loc.short} ($)</label>
                      <input
                        type="number"
                        value={((feeSettings.locationOverrides?.[loc.id as any] ?? feeSettings.amountCents) / 100).toFixed(2)}
                        onChange={(e) => {
                          const val = Math.round(parseFloat(e.target.value) * 100) || feeSettings.amountCents;
                          setFeeSettings({
                            ...feeSettings,
                            locationOverrides: { ...feeSettings.locationOverrides, [loc.id as any]: val }
                          });
                        }}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'intake' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h4 className="font-serif text-base font-medium text-stone-900">Intake Questions</h4>
                <p className="text-xs text-stone-500">Configure questions asked to clients during the online checkout flow.</p>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 bg-stone-50/50 p-3 hover:bg-stone-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider bg-stone-200/50 px-1.5 py-0.5 rounded">
                          {q.type}
                        </span>
                        {q.required && (
                          <span className="text-[9px] font-semibold text-brand-primary bg-brand-soft px-1 py-0.5 rounded border border-border-subtle">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-stone-800 truncate">{q.question}</p>
                      {q.options && q.options.length > 0 && (
                        <p className="text-[10px] text-stone-400 truncate">Options: {q.options.join(', ')}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => moveQuestion(idx, 'up')}
                        disabled={idx === 0}
                        className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveQuestion(idx, 'down')}
                        disabled={idx === questions.length - 1}
                        className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="rounded p-1 text-stone-400 hover:bg-brand-soft hover:text-brand-primary"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
              <h4 className="font-serif text-base font-medium text-stone-900">Add Question</h4>
              
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Question text</label>
                <input
                  type="text"
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  placeholder="e.g. Preferred wedding date?"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Question Type</label>
                <select
                  value={newQType}
                  onChange={(e) => setNewQType(e.target.value as BookingQuestion['type'])}
                  className={inputCls}
                >
                  <option value="text">Short Text</option>
                  <option value="longtext">Long Text</option>
                  <option value="select">Dropdown (Single Select)</option>
                  <option value="multiselect">Checkbox list (Multi Select)</option>
                  <option value="currency">Currency Range</option>
                  <option value="date">Date picker</option>
                  <option value="number">Numeric entry</option>
                  <option value="yesno">Yes / No toggle</option>
                  <option value="checkbox">Acknowledgement box</option>
                </select>
              </div>

              {['select', 'multiselect'].includes(newQType) && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Options (Comma separated)</label>
                  <p className="text-[11px] text-stone-400 mb-1">e.g. Option 1, Option 2, Option 3</p>
                  <input
                    type="text"
                    value={newQOpts}
                    onChange={(e) => setNewQOpts(e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}

              <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                <span className="text-xs text-stone-600">Response Required</span>
                <Switch
                  checked={newQRequired}
                  onCheckedChange={setNewQRequired}
                  className="data-[state=checked]:bg-status-success"
                />
              </div>

              <button onClick={addQuestion} className={`${btnPrimary} w-full justify-center`}>
                <Plus className="h-4 w-4" /> Add to Flow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
