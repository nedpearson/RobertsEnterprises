export interface SubRecord {
  tenantId: string;
  planId: string;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'COMPED' | 'INTERNAL';
  interval: 'MONTHLY' | 'ANNUAL';
  monthlyPriceCents: number;
}

export function calculatePlatformMRR(subscriptions: SubRecord[]): number {
  return subscriptions.reduce((totalMrrCents, sub) => {
    // Phase 11 Rule 37 & 40: Trial and canceled accounts do not contribute to MRR
    // Phase 11 Rule 39: Internal / Comped (like Roberts Enterprises) contribute $0
    if (['TRIAL', 'CANCELED', 'COMPED', 'INTERNAL'].includes(sub.status)) {
      return totalMrrCents;
    }

    if (['ACTIVE', 'PAST_DUE'].includes(sub.status)) {
      // Annual plans are normalized to MRR
      if (sub.interval === 'ANNUAL') {
         // Assuming monthlyPriceCents is the monthly equivalent, but if it was the annual price, we would divide by 12.
         // VowOS policy states plan_monthly_price stores the monthly equivalent for annual plans too.
         return totalMrrCents + sub.monthlyPriceCents;
      }
      return totalMrrCents + sub.monthlyPriceCents;
    }

    return totalMrrCents;
  }, 0);
}

export function calculateOrderTotal(
  subtotalCents: number,
  discountsCents: number,
  taxCents: number,
  shippingCents: number,
  otherChargesCents: number
): number {
  // Order Total = Subtotal - Discounts + Tax + Shipping + Other
  const total = subtotalCents - discountsCents + taxCents + shippingCents + otherChargesCents;
  return Math.max(0, total); // Total cannot be negative
}

export function calculateOutstandingBalance(
  orderTotalCents: number,
  successfulPaymentsCents: number,
  applicableCreditsCents: number,
  refundAdjustmentsCents: number
): number {
  // Outstanding Balance = Order Total - Successful Payments - Credits + Refunds (where refunds represent returned money that now needs to be collected if items aren't returned, or if they are, order total is adjusted separately).
  // Wait, standard retail: Outstanding = Total - Payments - Credits + Refunds
  // Actually, VowOS Rule:
  // "Order Total - Successful Payments - Applicable Credits - Applicable Refund Adjustments"
  // Wait, if a payment is refunded, it is subtracted from Successful Payments, increasing Outstanding Balance.
  // We'll define: successfulPaymentsCents as the net captured (Payments - Refunds)
  const balance = orderTotalCents - successfulPaymentsCents - applicableCreditsCents;
  return balance;
}

export function calculateInventoryLedger(
  beginningStock: number,
  receipts: number,
  returnsToStock: number,
  transfersIn: number,
  sales: number,
  transfersOut: number,
  adjustments: number
): number {
  // Beginning + Receipts + Returns + Transfers In - Sales - Transfers Out ± Adjustments = Expected Inventory
  return beginningStock + receipts + returnsToStock + transfersIn - sales - transfersOut + adjustments;
}
