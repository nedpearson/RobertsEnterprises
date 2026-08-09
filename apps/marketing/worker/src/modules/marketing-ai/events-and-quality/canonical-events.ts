export type CanonicalEventType =
  // Marketing Exposure & Traffic
  | 'impression' | 'reach' | 'click' | 'link_click' | 'landing_page_view' | 'video_view' | 'engagement' | 'lead_submitted'
  // Website & Ecommerce
  | 'page_view' | 'collection_view' | 'product_view' | 'add_to_cart' | 'checkout_started' | 'order_created' | 'order_paid' | 'order_fulfilled' | 'order_cancelled' | 'refund_completed'
  // VowOS Sales & Service Funnel
  | 'lead_created' | 'lead_assigned' | 'lead_contacted' | 'appointment_requested' | 'appointment_scheduled' | 'appointment_confirmed' | 'appointment_no_show' | 'appointment_completed' | 'contract_signed' | 'payment_recorded' | 'sale_completed' | 'referral_recorded'
  // Inventory
  | 'inventory_low' | 'inventory_out' | 'product_discounted';

export interface CanonicalEvent {
  eventId: string;
  eventType: CanonicalEventType;
  organizationId: string;
  brand: 'Proper & Company' | 'I Do Bridal Couture';
  location?: 'Baton Rouge' | 'Covington';
  provider?: 'meta' | 'google' | 'tiktok' | 'pinterest' | 'shopify' | 'vowos_internal';
  campaignId?: string;
  adId?: string;
  creativeId?: string;
  productId?: string;
  leadId?: string;
  customerId?: string;
  appointmentId?: string;
  orderId?: string;
  valueCents?: number;
  costCents?: number;
  timestamp: string;
  receivedTimestamp: string;
  attributionIds: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    gclid?: string;
    fbclid?: string;
    ttclid?: string;
  };
  dataQualityStatus: 'valid' | 'warning' | 'corrupted';
}

export function validateCanonicalEvent(event: Partial<CanonicalEvent>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!event.eventType) errors.push('Missing eventType');
  if (!event.brand) errors.push('Missing brand');
  if (!event.timestamp) errors.push('Missing timestamp');

  if (event.valueCents !== undefined && event.valueCents < 0) {
    errors.push('Value cents cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
