import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
import { Badge } from '@vowos/design-system';
import { Input } from '@vowos/design-system';
import { Label } from '@vowos/design-system';
import { PayrollRunResult } from '@/lib/services/payrollEngine';
import { ExceptionData } from './ExceptionCenter';
import { CheckCircle2, ChevronRight, FileText, AlertTriangle } from 'lucide-react';
import ConsolidatedPayrollReport from './reports/ConsolidatedPayrollReport';
import LocationPayrollReport from './reports/LocationPayrollReport';

interface PayrollWizardProps {
  draftRun: PayrollRunResult | null;
  exceptions: ExceptionData[];
  onClose: () => void;
  onPost: () => void;
  onResolveExceptions: () => void;
}

export function PayrollWizard({ draftRun, exceptions, onClose, onPost, onResolveExceptions }: PayrollWizardProps) {
  const [step, setStep] = useState(1);
  const [isPosting, setIsPosting] = useState(false);

  const steps = [
    { num: 1, title: 'Scope' },
    { num: 2, title: 'Timecards' },
    { num: 3, title: 'Earnings' },
    { num: 4, title: 'Deductions' },
    { num: 5, title: 'Review' },
    { num: 6, title: 'Post' }
  ];

  if (!draftRun) return null;

  const next = () => setStep(s => Math.min(6, s + 1));
  const prev = () => setStep(s => Math.max(1, s - 1));

  const handlePost = () => {
    setIsPosting(true);
    // Simulating transactional network call
    setTimeout(() => {
      onPost();
      setIsPosting(false);
      next();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl shadow-2xl bg-white max-h-[90vh] flex flex-col">
        <CardHeader className="bg-gray-50 border-b flex flex-row items-center justify-between sticky top-0 z-10">
          <div>
            <CardTitle>Post Official Payroll</CardTitle>
            <div className="text-sm text-text-muted mt-1">Period: {draftRun.periodName}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>×</Button>
        </CardHeader>

        {/* Wizard Progress Bar */}
        <div className="flex border-b bg-white p-4">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${step === s.num ? 'bg-blue-600 text-white' : step > s.num ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-text-muted'}`}>
                {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
              </div>
              <span className={`ml-2 text-sm font-medium ${step === s.num ? 'text-text-primary' : 'text-text-muted'}`}>{s.title}</span>
              {idx < steps.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-4"></div>}
            </div>
          ))}
        </div>

        <CardContent className="flex-grow overflow-y-auto p-6">
          {/* STEP 1: SCOPE */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Verify Payroll Scope</h3>
              <p className="text-sm text-text-secondary">Ensure you are posting the correct period. Official payroll runs cannot overlap.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded bg-gray-50">
                  <Label className="text-text-muted">Period Name</Label>
                  <div className="font-medium mt-1">{draftRun.periodName}</div>
                </div>
                <div className="p-4 border rounded bg-gray-50">
                  <Label className="text-text-muted">Employees in Scope</Label>
                  <div className="font-medium mt-1">{draftRun.statements.length} Employees</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TIMECARDS */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center justify-between">
                <span>Timecards & Exceptions</span>
                {exceptions.length > 0 ? (
                  <Badge variant="destructive">{exceptions.length} Blocking Exceptions</Badge>
                ) : (
                  <Badge variant="default" className="bg-green-600">All Clear</Badge>
                )}
              </h3>
              
              {exceptions.length > 0 ? (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-800">Review Required</h4>
                      <p className="text-sm text-red-700 mt-1 mb-3">You cannot proceed with unapproved timecards or missing punches.</p>
                      <Button variant="outline" className="bg-white" onClick={onResolveExceptions}>Resolve Exceptions</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-status-success/10 border border-green-200 p-8 rounded-lg text-center">
                  <CheckCircle2 className="w-12 h-12 text-status-success mx-auto mb-3" />
                  <h4 className="font-semibold text-green-800">All timecards are approved.</h4>
                  <p className="text-sm text-green-700">No missing punches or blocking exceptions detected.</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: EARNINGS */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Earnings Preview</h3>
              <p className="text-sm text-text-secondary">Review generated compensation before taxes.</p>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card><CardContent className="p-4"><div className="text-sm text-text-muted">Gross Payroll</div><div className="text-2xl font-bold">${(draftRun.totalGross/100).toLocaleString()}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-sm text-text-muted">Total Hours</div><div className="text-2xl font-bold">{draftRun.statements.reduce((s, st) => s + st.regularHours + st.overtimeHours, 0).toFixed(1)}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-sm text-text-muted">Bonuses/Commissions</div><div className="text-2xl font-bold">${(draftRun.statements.reduce((s, st) => s + st.bonuses + st.commissions, 0)/100).toLocaleString()}</div></CardContent></Card>
              </div>

              <LocationPayrollReport />
            </div>
          )}

          {/* STEP 4: DEDUCTIONS */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Deductions & Provider Taxes</h3>
              <div className="bg-status-info/10 border-l-4 border-blue-500 p-4 mb-6">
                <h4 className="font-medium text-blue-900">Notice on Tax Estimates</h4>
                <p className="text-sm text-blue-800 mt-1">The taxes shown below are Estimates — Not Payroll Filing Amounts. Official withholding will be calculated by your payroll provider upon submission.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm text-text-muted">Total Deductions (Pre/Post)</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">${(draftRun.totalDeductions/100).toLocaleString()}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm text-text-muted">Estimated Employee Taxes</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">${(draftRun.totalTaxes/100).toLocaleString()}</div></CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW */}
          {step === 5 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Final Review & Approval</h3>
              <ConsolidatedPayrollReport />
            </div>
          )}

          {/* STEP 6: POST */}
          {step === 6 && (
            <div className="space-y-6 text-center py-12">
              <CheckCircle2 className="w-16 h-16 text-status-success mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-text-primary">Payroll Run Posted!</h2>
              <p className="text-text-secondary max-w-md mx-auto">
                The {draftRun.periodName} payroll has been successfully committed to the ledger.
                Employee statements have been generated and the source timecards are now locked.
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <Button variant="outline"><FileText className="w-4 h-4 mr-2" /> Download PDF Summary</Button>
                <Button onClick={onClose}>Return to Command Center</Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* Wizard Footer Navigation */}
        {step < 6 && (
          <CardFooter className="bg-gray-50 border-t p-4 flex justify-between sticky bottom-0">
            <Button variant="outline" onClick={prev} disabled={step === 1 || isPosting}>Back</Button>
            
            {step === 2 && exceptions.length > 0 ? (
              <Button disabled>Resolve Exceptions to Continue</Button>
            ) : step === 5 ? (
              <Button onClick={handlePost} disabled={isPosting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isPosting ? 'Posting Transaction...' : 'Approve & Post Payroll'}
              </Button>
            ) : (
              <Button onClick={next} disabled={isPosting}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
