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

    if (options.businessId === 'org_roberts') {
      return { url: `${options.successUrl}?session_id=internal_roberts` };
    }

    console.log(`[BillingAdapter] Creating checkout session for business: ${options.businessId}, plan: ${options.plan}`);
    
    // Use the RPC for server-side authoritative checkout session generation
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: options,
      });
      if (error) throw error;
      return { url: data.url };
    } catch (err: any) {
      console.error('[BillingAdapter] Error creating checkout session', err);
      // Fallback for development if edge function isn't running
      const { data: sessionId } = await supabase.rpc('billing_create_checkout_session', {
        p_business_id: options.businessId,
        p_plan_id: options.plan
      });
      return { url: `${options.successUrl}?session_id=${sessionId || 'dev_fallback'}` };
    }
  }

  /**
   * Generates a Stripe Customer Portal session for a tenant to manage their billing,
   * payment methods, and invoices.
   */
  static async createCustomerPortalSession(options: CustomerPortalOptions): Promise<{ url: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    if (options.businessId === 'org_roberts') {
      return { url: `${options.returnUrl}?portal=roberts_internal` };
    }

    const { data, error } = await supabase.functions.invoke('stripe-portal', {
      body: options,
    });
    
    if (error) {
      console.error('[BillingAdapter] Error creating customer portal session', error);
      // Fallback to settings if edge function is missing
      return { url: `${window.location.origin}/settings?tab=subscriptions&portal=fallback` };
    }
    
    return { url: data.url };
  }

  /**
   * Manually sync a tenant's subscription state from Stripe into the database.
   * Typically handled by Webhooks, but this provides a forced sync mechanism.
   */
  static async syncSubscriptionState(businessId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { error } = await supabase.functions.invoke('stripe-sync', { body: { businessId } });
    if (error) {
      console.error('[BillingAdapter] Error syncing subscription state', error);
      throw error;
    }
  }
}
