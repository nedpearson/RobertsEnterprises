import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { BuildingStorefrontIcon, CurrencyDollarIcon, PresentationChartLineIcon, ChartBarIcon, MapIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

const pricingPlans = [
  {
    id: 'essential',
    name: 'Essential',
    price: '$99',
    description: 'Perfect for single-location boutiques starting out.',
    features: ['Point of Sale & Inventory', 'Basic CRM & Appointments', 'Standard Reporting'],
    icon: <BuildingStorefrontIcon className="w-8 h-8 text-rose-500" />
  },
  {
    id: 'growth',
    name: 'Growth & Expansion',
    price: '$299',
    description: 'For ambitious businesses looking to expand into new markets.',
    features: ['Everything in Essential', 'Market Candidates Explorer', 'Expansion Project Tracking', 'Competitor Analysis'],
    icon: <ChartBarIcon className="w-8 h-8 text-purple-500" />
  },
  {
    id: 'enterprise',
    name: 'Franchise Enterprise',
    price: '$899',
    description: 'The ultimate command center for franchisors.',
    features: ['Everything in Growth', 'Franchisee CRM', 'Territory Management', 'Franchise Programs'],
    icon: <BuildingOfficeIcon className="w-8 h-8 text-indigo-500" />
  }
];

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    boutiqueName: '',
    subscriptionTier: 'essential'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Automatically log the user in
      await login(formData.email, formData.password);
      
      // Navigate to the appropriate dashboard
      if (formData.subscriptionTier === 'enterprise') {
        navigate('/franchise');
      } else if (formData.subscriptionTier === 'growth') {
        navigate('/growth');
      } else {
        navigate('/');
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 flex flex-col justify-center sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your VowOS account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Step {step} of 2
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {error && (
            <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Business / Boutique Name</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                  value={formData.boutiqueName}
                  onChange={e => setFormData({...formData, boutiqueName: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                >
                  Continue to Pricing
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Select your Subscription Plan</h3>
                <p className="mt-1 text-sm text-gray-500">You can always upgrade or downgrade later.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {pricingPlans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setFormData({...formData, subscriptionTier: plan.id})}
                    className={`relative p-6 bg-white border-2 rounded-xl shadow-sm flex flex-col cursor-pointer transition-all ${
                      formData.subscriptionTier === plan.id
                        ? 'border-rose-500 ring-1 ring-rose-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      {plan.icon}
                    </div>
                    <div className="mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-2xl font-bold text-gray-900">{plan.price}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                    </div>
                    <p className="text-sm text-gray-500 mb-6 flex-grow">{plan.description}</p>
                    <ul className="text-sm text-gray-600 space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center">
                          <svg className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {formData.subscriptionTier === plan.id && (
                      <div className="absolute top-4 right-4">
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                >
                  Back
                </button>
                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Complete Signup'}
                </button>
              </div>
            </div>
          )}
          
          <div className="mt-6 text-center text-sm">
             <a href="/login" className="text-rose-600 hover:text-rose-500 font-medium">
                Already have an account? Log in
             </a>
          </div>
        </div>
      </div>
    </div>
  );
}
