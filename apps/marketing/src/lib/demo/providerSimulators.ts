/**
 * VowOS Demo Provider Simulators
 * Deterministic sandbox adapters for Payments, SMS, Email, Payroll, and Designer PO ordering.
 * Guarantees zero live production provider calls during Demo Mode.
 */

export interface ProviderEvent {
  id: string;
  provider: 'Stripe' | 'Twilio' | 'SendGrid' | 'Gusto' | 'JustinAlexander';
  action: string;
  status: 'simulated_success' | 'simulated_failure';
  payload: Record<string, any>;
  timestamp: string;
}

class DemoProviderSimulators {
  private events: ProviderEvent[] = [];

  public logEvent(provider: ProviderEvent['provider'], action: string, payload: Record<string, any>, status: ProviderEvent['status'] = 'simulated_success'): ProviderEvent {
    const ev: ProviderEvent = {
      id: `sim-ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      provider,
      action,
      status,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.events.unshift(ev);
    return ev;
  }

  public getEvents() {
    return this.events;
  }

  // 1. Stripe Payments Simulator
  public async simulatePayment(amountCents: number, cardLast4: string = '4242'): Promise<{ success: boolean; chargeId: string }> {
    await new Promise((r) => setTimeout(r, 300));
    const chargeId = `ch_demo_${Math.random().toString(36).substring(2, 9)}`;
    this.logEvent('Stripe', 'charge.create', { amountCents, cardLast4, chargeId });
    return { success: true, chargeId };
  }

  // 2. Twilio SMS Simulator
  public async simulateSMS(to: string, message: string): Promise<{ success: boolean; messageSid: string }> {
    await new Promise((r) => setTimeout(r, 200));
    const messageSid = `SM_demo_${Math.random().toString(36).substring(2, 9)}`;
    this.logEvent('Twilio', 'messages.create', { to, message, messageSid });
    return { success: true, messageSid };
  }

  // 3. SendGrid Email Simulator
  public async simulateEmail(to: string, subject: string, body: string): Promise<{ success: boolean; emailId: string }> {
    await new Promise((r) => setTimeout(r, 200));
    const emailId = `msg_demo_${Math.random().toString(36).substring(2, 9)}`;
    this.logEvent('SendGrid', 'mail.send', { to, subject, body, emailId });
    return { success: true, emailId };
  }

  // 4. Payroll Gusto Simulator
  public async simulatePayrollSubmission(periodId: string, grossCents: number, employeeCount: number): Promise<{ success: boolean; batchId: string }> {
    await new Promise((r) => setTimeout(r, 400));
    const batchId = `pay_batch_demo_${Math.random().toString(36).substring(2, 9)}`;
    this.logEvent('Gusto', 'payroll.submit', { periodId, grossCents, employeeCount, batchId });
    return { success: true, batchId };
  }

  // 5. Designer PO Simulator
  public async simulateDesignerOrder(poId: string, designer: string, items: string): Promise<{ success: boolean; confirmationNumber: string }> {
    await new Promise((r) => setTimeout(r, 300));
    const confirmationNumber = `PO-CONF-${Math.floor(100000 + Math.random() * 900000)}`;
    this.logEvent('JustinAlexander', 'order.place', { poId, designer, items, confirmationNumber });
    return { success: true, confirmationNumber };
  }
}

export const demoSimulators = new DemoProviderSimulators();
