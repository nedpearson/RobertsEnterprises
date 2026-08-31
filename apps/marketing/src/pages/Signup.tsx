import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Store, User, ArrowRight, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { TENANT_WORKSPACE_PATH } from '@/config/hostConfig';
const signupSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIntent = searchParams.get('plan');
  const billingIntent = searchParams.get('billing');

  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<'BUSINESS' | 'INDIVIDUAL' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
  });

  const handleCreateAccount = async (data: any) => {
    setIsSubmitting(true);
    try {
      let loginError;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            provision_default_tenant: true,
            account_type: accountType, // Store intent for Onboarding flow
            plan_intent: planIntent,
            billing_intent: billingIntent
          },
        },
      });

      if (authError) {
        // If the user already exists, we will try to log them in directly instead of failing the flow
        if (authError.message.includes('already registered')) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          });
          loginError = signInErr;
          if (!signInErr) {
            toast.success('Welcome back!');
          }
        } else {
          throw authError;
        }
      } else {
        toast.success('Account created successfully!');
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        loginError = signInErr;
      }

      if (!loginError) {
        navigate(TENANT_WORKSPACE_PATH);
      } else {
        navigate('/login?message=check-email');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to VowOS</h1>
          <p className="text-stone-500">The operating system for modern business.</p>
        </div>

        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${accountType === 'BUSINESS' ? 'border-primary ring-2 ring-primary/20' : ''}`}
              onClick={() => setAccountType('BUSINESS')}
            >
              <CardHeader>
                <Building2 className="h-8 w-8 mb-4 text-primary" />
                <CardTitle>Business</CardTitle>
                <CardDescription>For companies, stores, teams and organizations.</CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${accountType === 'INDIVIDUAL' ? 'border-primary ring-2 ring-primary/20' : ''}`}
              onClick={() => setAccountType('INDIVIDUAL')}
            >
              <CardHeader>
                <User className="h-8 w-8 mb-4 text-primary" />
                <CardTitle>Individual</CardTitle>
                <CardDescription>For independent professionals and owner/operators.</CardDescription>
              </CardHeader>
            </Card>

            <div className="md:col-span-2 flex justify-end mt-4">
              <Button 
                size="lg" 
                disabled={!accountType} 
                onClick={() => setStep(2)}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Create your Account</CardTitle>
              <CardDescription>Let's get started with {accountType === 'BUSINESS' ? 'your organization' : 'your personal workspace'}.</CardDescription>
            </CardHeader>
            <form onSubmit={form.handleSubmit(handleCreateAccount)}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" {...form.register('firstName')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" {...form.register('lastName')} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register('email')} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...form.register('password')} />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost" type="button" onClick={() => setStep(1)}>Back</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Account
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
