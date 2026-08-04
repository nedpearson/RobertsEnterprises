import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card, CardBody } from '../../design-system/Card';
import { PageHeader } from '../../design-system/PageHeader';
import { Button } from '../../design-system/Button';
import { useToast } from '../../design-system/ToastContext';
import { Spinner } from '../../design-system/Spinner';

export default function TrainingPage() {
  const { addToast } = useToast();
  const [onboardingSteps, setOnboardingSteps] = useState<any[]>([]);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);

  const CHECKLIST_STEPS = [
    'System Settings Setup',
    'Staff Provisioning',
    'Inventory Catalog Sync',
    'Stripe Payment Gateway',
    'Twilio SMS Configuration'
  ];

  const fetchOnboarding = async () => {
    try {
      setLoadingOnboarding(true);
      const res = await api.get<{ steps: any[] }>('/api/training/onboarding-progress');
      setOnboardingSteps(res.steps || []);
    } catch (err) {
      console.error('Failed to load onboarding steps:', err);
    } finally {
      setLoadingOnboarding(false);
    }
  };

  useEffect(() => {
    fetchOnboarding();
  }, []);

  const handleToggleStep = async (stepName: string, currentStatus: boolean) => {
    try {
      await api.post('/api/training/onboarding-progress/toggle', {
        step_name: stepName,
        is_completed: !currentStatus
      });
      addToast(`Updated progress for "${stepName}"`, 'success');
      fetchOnboarding();
    } catch (err: any) {
      addToast('Failed to update progress: ' + err.message, 'error');
    }
  };

  const courses = [
    { id: 1, title: 'Bridal Stylist Fundamentals', duration: '45 mins', status: 'Completed' },
    { id: 2, title: 'Couture Fabric Handling & Care', duration: '30 mins', status: 'In Progress' },
    { id: 3, title: 'Measurement Accuracy Guide', duration: '60 mins', status: 'Not Started' },
    { id: 4, title: 'POS Checkout & Invoicing Operations', duration: '40 mins', status: 'Not Started' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Training & Onboarding"
        subtitle="Learn boutique operations, dress fitting techniques, and store guidelines"
      />

      {/* Onboarding Checklist Section */}
      <Card className="border border-gray-200">
        <CardBody className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Boutique Configuration Checklist</h3>
          <p className="text-sm text-gray-500 mb-6">Track execution progress of setting up VowOS for this boutique location.</p>

          {loadingOnboarding ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Spinner size="sm" /> Loading onboarding progress...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {CHECKLIST_STEPS.map(stepName => {
                const stepObj = onboardingSteps.find(s => s.step_name === stepName);
                const isCompleted = stepObj ? Boolean(stepObj.is_completed) : false;

                return (
                  <button
                    key={stepName}
                    onClick={() => handleToggleStep(stepName, isCompleted)}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                      isCompleted 
                        ? 'bg-green-50 border-green-200 text-green-900' 
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full border ${
                      isCompleted 
                        ? 'bg-green-600 border-green-600 text-white' 
                        : 'border-gray-300 bg-gray-50 text-transparent'
                    }`}>
                      ✓
                    </div>
                    <div>
                      <span className="font-semibold text-sm block">{stepName}</span>
                      <span className="text-xs opacity-70">
                        {isCompleted && stepObj?.completed_at 
                          ? `Done ${new Date(stepObj.completed_at).toLocaleDateString()}` 
                          : 'Click to mark complete'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="border border-gray-200">
            <CardBody className="p-5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-gray-900">{course.title}</h3>
                <span className="text-xs text-gray-500 mt-1 block">Duration: {course.duration}</span>
              </div>
              
              <div className="text-right">
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold uppercase block text-center min-w-[90px] mb-2 ${
                    course.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : course.status === 'In Progress'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {course.status}
                </span>
                
                {course.status !== 'Completed' && (
                  <Button size="sm" variant="outline" onClick={() => addToast('Launching training player...', 'info')}>
                    {course.status === 'In Progress' ? 'Resume' : 'Start'}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
