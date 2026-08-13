import { supabase } from '@/lib/supabase';
import { CommercialPlan } from '@/config/commercialCatalog';

export interface BillingCheckoutOptions {
  businessId: string;
  plan: CommercialPlan;
  successUrl: string;
  cancelUrl: string;
}

export interface CustomerPortalOptions {
  businessId: string;
  returnUrl: string;
}

/**
 * Billing Adapter
 * 
 * Handles integrating VowOS with Stripe for subscription management.
 * Note: In a production environment, this would call a secure edge function 
 * (e.g., Supabase Edge Functions) which then interacts securely with Stripe API 
 * using the Stripe Secret Key.
 */
export class BillingAdapter {
  
  /**
   * Generates a Stripe Checkout Session for a tenant subscribing to a specific plan.
   * This is a facade for the Edge Function call.
   */
  static async createCheckoutSession(options: BillingCheckoutOptions): Promise<{ url: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    console.log(`[BillingAdapter] Creating checkout session for business: ${options.businessId}, plan: ${options.plan}`);
    
    // Use the RPC for server-side authoritative checkout session generation
    const { data: sessionId, error } = await supabase.rpc('billing_create_checkout_session', {
      p_business_id: options.businessId,
      p_plan_id: options.plan
    });

    if (error) {
      console.error('[BillingAdapter] Error creating checkout session', error);
      throw error;
    }

    // Since we are mocking Stripe redirect, we just return the success URL 
    // but append the session_id to simulate Stripe Checkout callback
    return { url: `${options.successUrl}?session_id=${sessionId}` };
  }

  /**
   * Generates a Stripe Customer Portal session for a tenant to manage their billing,
   * payment methods, and invoices.
   */
  static async createCustomerPortalSession(options: CustomerPortalOptions): Promise<{ url: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // SIMULATED STRIPE PROVIDER: In production, this would invoke a Supabase Edge Function
    // const { data, error } = await supabase.functions.invoke('stripe-portal', {
    //   body: options,
    // });
    // if (error) throw error;
    // return { url: data.url };

    console.log(`[BillingAdapter] Creating customer portal session for business: ${options.businessId}`);
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ url: `${window.location.origin}/settings?tab=subscriptions&portal=success` });
      }, 1000);
    });
  }

  /**
   * Manually sync a tenant's subscription state from Stripe into the database.
   * Typically handled by Webhooks, but this provides a forced sync mechanism.
   */
  static async syncSubscriptionState(businessId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // SIMULATED STRIPE PROVIDER: Invoke edge function to pull latest state from Stripe
    // await supabase.functions.invoke('stripe-sync', { body: { businessId } });
    
    console.log(`[BillingAdapter] Force syncing subscription state for business: ${businessId}`);
    
    return new Promise(resolve => {
      setTimeout(() => resolve(), 800);
    });
  }
}
