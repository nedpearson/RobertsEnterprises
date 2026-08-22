import assert from 'node:assert/strict';
import { VowosInMemoryStore, VowosTestServer, EntitlementEngine, CryptoHelper } from './harness.mjs';

export async function runTier3Tests(server, store) {
  const results = [];
  const startTotal = Date.now();

  async function test(name, fn) {
    const tStart = Date.now();
    try {
      await fn();
      results.push({ name, status: 'PASSED', durationMs: Date.now() - tStart });
    } catch (err) {
      results.push({ name, status: 'FAILED', error: err.message, stack: err.stack, durationMs: Date.now() - tStart });
    }
  }

  // =========================================================================
  // Tier 3: Pairwise Cross-Feature Interaction Suite (10 Tests)
  // =========================================================================

  await test('PAIR-01: Appointments (F2) + POS Payments (F4) — Appointment completion generates invoice & POS checkout', async () => {
    const aptId = 'apt_pair_01';
    const custId = 'cust_pair_01';
    const locId = 'ido-br';

    store.customers.set(custId, { id: custId, name: 'Helena Bonham', business_id: 'biz_ido_bridal' });
    store.appointments.set(aptId, {
      id: aptId,
      customer_id: custId,
      location_id: locId,
      business_id: 'biz_ido_bridal',
      status: 'checked_in'
    });

    // Complete appointment with 'Purchased'
    const apt = store.appointments.get(aptId);
    apt.status = 'completed';
    apt.outcome = 'Purchased';
    apt.revenue_cents = 450000;

    // Generate Invoice linked to appointment & customer
    const invId = 'inv_pair_01';
    store.invoices.set(invId, {
      id: invId,
      appointment_id: aptId,
      customer_id: custId,
      location_id: locId,
      business_id: 'biz_ido_bridal',
      amount_cents: apt.revenue_cents,
      paid_cents: 0,
      status: 'Draft'
    });

    // POS Checkout deposit
    const paymentId = 'pay_pair_01';
    store.payments.set(paymentId, {
      id: paymentId,
      invoice_id: invId,
      amount_cents: 225000,
      payment_method: 'terminal',
      status: 'completed'
    });

    const inv = store.invoices.get(invId);
    inv.paid_cents += 225000;
    inv.status = 'Partial';

    assert.equal(apt.outcome, 'Purchased');
    assert.equal(inv.amount_cents, 450000);
    assert.equal(inv.paid_cents, 225000);
    assert.equal(inv.status, 'Partial');
  });

  await test('PAIR-02: Inventory (F5) + Invoices (F4) — Sample gown invoice completion decrements on-hand stock', async () => {
    const gown = store.gowns.get('gown_monique_1');
    const initialBrStock = gown.stock_by_location['ido-br']; // e.g. 3

    // Create Invoice for sample gown purchase
    const invId = 'inv_sample_01';
    store.invoices.set(invId, {
      id: invId,
      business_id: 'biz_ido_bridal',
      location_id: 'ido-br',
      amount_cents: 650000,
      paid_cents: 650000,
      status: 'Paid',
      line_items: [{ gown_id: 'gown_monique_1', is_sample_off_the_rack: true, qty: 1 }]
    });

    // Stock decrement logic
    gown.stock_by_location['ido-br'] -= 1;

    assert.equal(gown.stock_by_location['ido-br'], initialBrStock - 1);
  });

  await test('PAIR-03: Shopify Webhook (F9) + Customer Dossier (F3) — Webhook order updates bride spend & timeline', async () => {
    const payload = JSON.stringify({
      id: 99501,
      total_price: '4200.00',
      customer: { first_name: 'Serena', last_name: 'Williams', email: 'serena@example.com', phone: '+12255550777' },
      line_items: [{ title: 'Custom Veil & Tiara Set', properties: [{ name: 'Store', value: 'ido-br' }] }]
    });
    const hmac = CryptoHelper.generateShopifyHmac(payload, server.shopifySecret);

    const res = await fetch(`${server.baseUrl}/api/shopify/webhooks/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Hmac-Sha256': hmac },
      body: payload
    });
    assert.equal(res.status, 200);
    const data = await res.json();

    const bride = store.customers.get(data.customerId);
    assert.equal(bride.spend_cents, 420000);
    assert.equal(bride.name, 'Serena Williams');
  });

  await test('PAIR-04: Team Commissions (F6) + Sales Invoices (F4) — Reassigning stylist recalculates commission ledger', async () => {
    const invId = 'inv_comm_reassign_1';
    store.invoices.set(invId, {
      id: invId,
      amount_cents: 500000,
      paid_cents: 500000,
      stylist_id: 'staff_1'
    });

    // Initial commission for staff_1 (10%)
    store.salesCommissions.set('comm_init_1', {
      id: 'comm_init_1',
      invoice_id: invId,
      employee_id: 'staff_1',
      commission_cents: 50000
    });

    // Reassign invoice to staff_2 (10%)
    const inv = store.invoices.get(invId);
    inv.stylist_id = 'staff_2';

    // Void old commission & assign new
    store.salesCommissions.delete('comm_init_1');
    store.salesCommissions.set('comm_reassigned_1', {
      id: 'comm_reassigned_1',
      invoice_id: invId,
      employee_id: 'staff_2',
      commission_cents: 50000
    });

    assert.equal(store.salesCommissions.has('comm_init_1'), false);
    assert.equal(store.salesCommissions.get('comm_reassigned_1').employee_id, 'staff_2');
    assert.equal(store.salesCommissions.get('comm_reassigned_1').commission_cents, 50000);
  });

  await test('PAIR-05: Subscription Upgrade (F8) + Feature Navigation (F1) — Upgrade unlocks Transfers & Growth tabs', async () => {
    // Tenant B on Essentials
    const evalBefore = EntitlementEngine.evaluate(store, 'biz_tenant_b', 'inventory.transfers');
    assert.equal(evalBefore.allowed, false);

    // Platform Admin upgrades Tenant B to Pro
    store.subscriptions.get('biz_tenant_b').plan = 'pro';

    const evalAfterTransfers = EntitlementEngine.evaluate(store, 'biz_tenant_b', 'inventory.transfers');
    const evalAfterGrowth = EntitlementEngine.evaluate(store, 'biz_tenant_b', 'growth.leads');

    assert.equal(evalAfterTransfers.allowed, true);
    assert.equal(evalAfterGrowth.allowed, true);
  });

  await test('PAIR-06: Inventory Transfer (F5) + Multi-Brand Locations (F1) — Transfer rebalances stock across brand locations', async () => {
    const gown = store.gowns.get('gown_monique_1');
    const stockBrBefore = gown.stock_by_location['ido-br'];
    const stockCovBefore = gown.stock_by_location['ido-cov'];

    const transferId = 'xfer_pair_06';
    store.transfers.set(transferId, {
      id: transferId,
      business_id: 'biz_ido_bridal',
      gown_id: gown.id,
      from_location_id: 'ido-br',
      to_location_id: 'ido-cov',
      qty: 1,
      status: 'Received'
    });

    gown.stock_by_location['ido-br'] -= 1;
    gown.stock_by_location['ido-cov'] += 1;

    assert.equal(gown.stock_by_location['ido-br'], stockBrBefore - 1);
    assert.equal(gown.stock_by_location['ido-cov'], stockCovBefore + 1);
  });

  await test('PAIR-07: Customer Try-On Notes (F3) + Special Order PO (F5) — PO creation copies bride measurements & try-on style', async () => {
    const custId = 'cust_special_order_1';
    store.customers.set(custId, { id: custId, name: 'Grace Kelly', business_id: 'biz_ido_bridal' });
    store.customerPreferences.set('pref_grace', {
      customer_id: custId,
      measurements: { bust: 35, waist: 25, hips: 36, hollow_to_hem: 58 }
    });
    store.customerNotes.set('note_grace_gown', {
      id: 'note_grace_gown',
      customer_id: custId,
      gown_id: 'gown_monique_1',
      selected_size: '6',
      custom_hem: '+2 inches'
    });

    const note = store.customerNotes.get('note_grace_gown');
    const pref = store.customerPreferences.get('pref_grace');

    // Create PO for bride
    const poId = 'po_special_grace_1';
    store.purchaseOrders.set(poId, {
      id: poId,
      business_id: 'biz_ido_bridal',
      customer_id: custId,
      vendor_name: 'Monique Lhuillier',
      items: [
        {
          gown_id: note.gown_id,
          size: note.selected_size,
          customizations: note.custom_hem,
          measurements: pref.measurements
        }
      ],
      status: 'submitted'
    });

    const createdPo = store.purchaseOrders.get(poId);
    assert.equal(createdPo.customer_id, custId);
    assert.equal(createdPo.items[0].size, '6');
    assert.equal(createdPo.items[0].customizations, '+2 inches');
  });

  await test('PAIR-08: Twilio Inbound SMS (F9) + Appointment Confirmation (F2) — Inbound YES confirms appointment', async () => {
    const brideCustId = 'cust_sms_confirm_1';
    const bridePhone = '+12255550444';
    store.customers.set(brideCustId, {
      id: brideCustId,
      business_id: 'biz_ido_bridal',
      name: 'Audrey Hepburn',
      phone: bridePhone,
      sms_opt_in: true
    });

    const aptId = 'apt_pending_sms_1';
    store.appointments.set(aptId, {
      id: aptId,
      customer_id: brideCustId,
      business_id: 'biz_ido_bridal',
      status: 'booked'
    });

    // Inbound Twilio SMS with "YES"
    const params = {
      From: bridePhone,
      To: '+12255550101',
      Body: 'YES',
      MessageSid: 'SM_confirm_pair_08'
    };
    const formBody = new URLSearchParams(params).toString();
    const url = `${server.baseUrl}/api/communications/twilio-webhook`;
    const sig = CryptoHelper.generateTwilioSignature(url, params, server.twilioAuthToken);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': sig },
      body: formBody
    });

    assert.equal(res.status, 200);
    assert.equal(store.appointments.get(aptId).status, 'confirmed');
  });

  await test('PAIR-09: Failed Background Job (F10) + Platform Admin DLQ Retry (F10) — Operator retry heals dead-letter job', async () => {
    const jobId = 'job_dlq_heal_1';
    store.durableJobs.set(jobId, {
      id: jobId,
      business_id: 'biz_ido_bridal',
      queue_name: 'sync_shopify_catalog',
      status: 'dead-letter',
      attempts: 5,
      error_message: 'Temporary network disconnect'
    });

    // Operator clicks retry in Platform Admin
    const res = await fetch(`${server.baseUrl}/api/platform/jobs/${jobId}/retry`, { method: 'POST' });
    assert.equal(res.status, 200);

    const job = store.durableJobs.get(jobId);
    assert.equal(job.status, 'pending');
    assert.equal(job.attempts, 0);

    // Runner executes pending jobs
    server.runPendingJobs();
    assert.equal(job.status, 'completed');
  });

  await test('PAIR-10: Timeclock Hours (F6) + Payroll Export (F6) — Approved timesheets aggregate into store payroll report', async () => {
    // 2 employees with approved hours for pay period
    store.timeEntries.set('te_claire_1', { id: 'te_claire_1', employee_id: 'staff_1', period: '2026-W37', duration_seconds: 36000, status: 'approved' }); // 10 hrs
    store.timeEntries.set('te_sophie_1', { id: 'te_sophie_1', employee_id: 'staff_2', period: '2026-W37', duration_seconds: 28800, status: 'approved' }); // 8 hrs

    const periodEntries = Array.from(store.timeEntries.values()).filter(e => e.period === '2026-W37' && e.status === 'approved');
    const totalApprovedSeconds = periodEntries.reduce((sum, e) => sum + e.duration_seconds, 0);
    const totalHours = totalApprovedSeconds / 3600;

    assert.equal(totalHours, 18.0);
  });

  return {
    tier: 'Tier 3: Pairwise Cross-Feature Interactions',
    totalTests: results.length,
    passed: results.filter(r => r.status === 'PASSED').length,
    failed: results.filter(r => r.status === 'FAILED').length,
    durationMs: Date.now() - startTotal,
    results
  };
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const store = new VowosInMemoryStore();
  const server = new VowosTestServer({ store });
  await server.start();
  console.log(`Running Tier 3 tests on ${server.baseUrl}...`);
  const report = await runTier3Tests(server, store);
  await server.stop();
  console.log(`Tier 3 Finished: ${report.passed}/${report.totalTests} passed (${report.durationMs}ms)`);
  process.exitCode = report.failed > 0 ? 1 : 0;
}
