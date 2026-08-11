import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const businessSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z.string().min(2, 'Business name is required'),
  industry: z.string().min(1, 'Industry is required'),
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
});

const individualSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  profession: z.string().min(1, 'Profession is required'),
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
});

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<'BUSINESS' | 'INDIVIDUAL' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const businessForm = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
  });

  const individualForm = useForm<z.infer<typeof individualSchema>>({
    resolver: zodResolver(individualSchema),
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  const handleCreateAccount = async (data: any, type: 'BUSINESS' | 'INDIVIDUAL') => {
    setIsSubmitting(true);
    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          },
        },
      });

      if (authError) throw authError;

      // 2. Call Secure Provisioning RPC
      const slug = type === 'BUSINESS' ? generateSlug(data.businessName) : generateSlug(`${data.firstName}-${data.lastName}-workspace`);
      
      const { data: rpcData, error: rpcError } = await supabase.rpc('provision_new_organization', {
        p_organization_type: type,
        p_legal_name: type === 'BUSINESS' ? data.businessName : `${data.firstName} ${data.lastName}`,
        p_display_name: type === 'BUSINESS' ? data.businessName : `${data.firstName}'s Workspace`,
        p_slug: slug,
        p_industry: type === 'BUSINESS' ? data.industry : data.profession,
        p_country: data.country,
        p_state: data.state,
        p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (rpcError) throw rpcError;

      toast.success('Account created successfully! Please check your email to verify.');
      
      // Attempt login immediately (will fail if email verification is required, which is correct)
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (!loginError) {
        navigate('/app');
      } else {
        // Redirect to a check email page or login
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

        {step === 2 && accountType === 'BUSINESS' && (
          <Card>
            <CardHeader>
              <CardTitle>Create your Business Account</CardTitle>
              <CardDescription>Let's get your organization set up.</CardDescription>
            </CardHeader>
            <form onSubmit={businessForm.handleSubmit((d) => handleCreateAccount(d, 'BUSINESS'))}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" {...businessForm.register('firstName')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" {...businessForm.register('lastName')} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <Input id="email" type="email" {...businessForm.register('email')} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...businessForm.register('password')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" {...businessForm.register('businessName')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select onValueChange={(val) => businessForm.setValue('industry', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bridal">Bridal Retail</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select onValueChange={(val) => businessForm.setValue('country', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State / Province</Label>
                    <Input id="state" {...businessForm.register('state')} />
                  </div>
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

        {/* Individual Form intentionally omitted for brevity in this step, but would follow the exact same pattern */}
        {step === 2 && accountType === 'INDIVIDUAL' && (
           <Card>
           <CardHeader>
             <CardTitle>Create your Individual Workspace</CardTitle>
             <CardDescription>Let's get your personal workspace set up.</CardDescription>
           </CardHeader>
           <form onSubmit={individualForm.handleSubmit((d) => handleCreateAccount(d, 'INDIVIDUAL'))}>
             <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="firstName">First Name</Label>
                   <Input id="firstName" {...individualForm.register('firstName')} />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="lastName">Last Name</Label>
                   <Input id="lastName" {...individualForm.register('lastName')} />
                 </div>
               </div>
               
               <div className="space-y-2">
                 <Label htmlFor="email">Email</Label>
                 <Input id="email" type="email" {...individualForm.register('email')} />
               </div>
               
               <div className="space-y-2">
                 <Label htmlFor="password">Password</Label>
                 <Input id="password" type="password" {...individualForm.register('password')} />
               </div>

               <div className="space-y-2">
                 <Label htmlFor="profession">Profession</Label>
                 <Input id="profession" placeholder="e.g. Consultant, Designer" {...individualForm.register('profession')} />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="country">Country</Label>
                   <Select onValueChange={(val) => individualForm.setValue('country', val)}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select country" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="US">United States</SelectItem>
                       <SelectItem value="CA">Canada</SelectItem>
                       <SelectItem value="UK">United Kingdom</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="state">State / Province</Label>
                   <Input id="state" {...individualForm.register('state')} />
                 </div>
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
