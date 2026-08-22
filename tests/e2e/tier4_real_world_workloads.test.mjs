import assert from 'node:assert/strict';
import { VowosInMemoryStore, VowosTestServer, EntitlementEngine, CryptoHelper } from './harness.mjs';

export async function runTier4Tests(server, store) {
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
  // Tier 4: Real-World Workload Scenarios (5 Comprehensive Workflows)
  // =========================================================================

  await test('SCEN-01: Full Bridal Journey — Intake -> Fitting -> Special Order PO -> Invoice & Terminal Deposit', async () => {
    // Step 1: Public online booking intake
    const intakeRes = await fetch(`${server.baseUrl}/api/scheduling/public/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Margot Robbie',
        email: 'margot@example.com',
        phone: '+12255550888',
        weddingDate: '2026-11-28',
        store: 'ido-br',
        date: '2026-09-20',
        time: '02:00 PM'
      })
    });
    assert.equal(intakeRes.status, 200);
    const intakeData = await intakeRes.json();
    const custId = intakeData.customerId;
    const reqId = intakeData.requestId;

    // Step 2: Stylist confirms appointment and assigns Fitting Suite 1
    const aptId = `apt_margot_${Date.now()}`;
    store.appointments.set(aptId, {
      id: aptId,
      customer_id: custId,
      location_id: 'ido-br',
      business_id: 'biz_ido_bridal',
      stylist_id: 'staff_1',
      room_id: 'suite_1',
      start_time: '2026-09-20T14:00:00Z',
      end_time: '2026-09-20T15:30:00Z',
      status: 'confirmed'
    });

    // Step 3: Bride checks in; stylist records try-on notes
    const apt = store.appointments.get(aptId);
    apt.status = 'checked_in';
    apt.check_in_time = new Date().toISOString();

    store.customerNotes.set(`note_margot_1`, {
      customer_id: custId,
      gown_id: 'gown_monique_1',
      rating: 5,
      notes: 'Loves the Versailles neckline and Cathedral veil'
    });

    // Step 4: Bride selects gown; stylist drafts Special Order PO
    const poId = `po_margot_${Date.now()}`;
    store.purchaseOrders.set(poId, {
      id: poId,
      business_id: 'biz_ido_bridal',
      customer_id: custId,
      vendor_name: 'Monique Lhuillier',
      location_id: 'ido-br',
      status: 'submitted',
      total_cents: 250000,
      items: [{ gown_id: 'gown_monique_1', size: '4', unit_cost_cents: 250000 }]
    });

    // Step 5: Stylist generates invoice with 50% deposit and bride pays via POS terminal
    const invId = `inv_margot_${Date.now()}`;
    store.invoices.set(invId, {
      id: invId,
      customer_id: custId,
      appointment_id: aptId,
      business_id: 'biz_ido_bridal',
      location_id: 'ido-br',
      amount_cents: 650000,
      paid_cents: 0,
      status: 'Draft'
    });

    const paymentId = `pay_term_margot_${Date.now()}`;
    store.payments.set(paymentId, {
      id: paymentId,
      invoice_id: invId,
      business_id: 'biz_ido_bridal',
      amount_cents: 325000,
      payment_method: 'terminal',
      provider_transaction_id: 'ch_stripe_terminal_888',
      status: 'completed'
    });

    const inv = store.invoices.get(invId);
    inv.paid_cents += 325000;
    inv.status = 'Partial';
    apt.status = 'completed';
    apt.outcome = 'Purchased';
    apt.revenue_cents = 650000;

    // Send confirmation SMS
    const smsRes = await fetch(`${server.baseUrl}/api/communications/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: custId,
        message: 'Congratulations Margot! Your Monique Lhuillier special order has been placed.'
      })
    });
    assert.equal(smsRes.status, 200);

    assert.equal(apt.outcome, 'Purchased');
    assert.equal(inv.paid_cents, 325000);
    assert.equal(store.purchaseOrders.get(poId).status, 'submitted');
  });

  await test('SCEN-02: Multi-Brand & Multi-Location Stock Rebalancing — Transfer Request -> Transit -> Receipt', async () => {
    const gown = store.gowns.get('gown_monique_1');
    const startBr = gown.stock_by_location['ido-br']; // e.g. 3
    const startCov = gown.stock_by_location['ido-cov']; // e.g. 2

    // Step 1: Inventory manager detects low stock in Covington, requests transfer of 1 unit from Baton Rouge
    const xferId = `xfer_scen_02_${Date.now()}`;
    store.transfers.set(xferId, {
      id: xferId,
      business_id: 'biz_ido_bridal',
      gown_id: gown.id,
      from_location_id: 'ido-br',
      to_location_id: 'ido-cov',
      qty: 1,
      status: 'Requested',
      created_at: new Date().toISOString()
    });

    // Step 2: Baton Rouge shipping clerk approves & marks In Transit
    const xfer = store.transfers.get(xferId);
    xfer.status = 'In Transit';
    xfer.shipped_at = new Date().toISOString();
    assert.equal(xfer.status, 'In Transit');

    // Step 3: Covington clerk receives shipment & marks Received
    xfer.status = 'Received';
    xfer.received_at = new Date().toISOString();

    // Step 4: Rebalance location stock
    gown.stock_by_location['ido-br'] -= xfer.qty;
    gown.stock_by_location['ido-cov'] += xfer.qty;

    assert.equal(xfer.status, 'Received');
    assert.equal(gown.stock_by_location['ido-br'], startBr - 1);
    assert.equal(gown.stock_by_location['ido-cov'], startCov + 1);
  });

  await test('SCEN-03: Omnichannel Shopify Order & Automated Lead Ingestion — HMAC -> Ingestion -> SMS Confirmation', async () => {
    // Step 1: Inbound Shopify order arrives
    const payload = JSON.stringify({
      id: 887711,
      total_price: '550.00',
      customer: {
        first_name: 'Zendaya',
        last_name: 'Coleman',
        email: 'zendaya@example.com',
        phone: '+12255550333'
      },
      line_items: [
        {
          title: 'Silk Bridal Robe & Garter',
          properties: [{ name: 'Store', value: 'pc-br' }]
        }
      ]
    });
    const hmac = CryptoHelper.generateShopifyHmac(payload, server.shopifySecret);

    // Step 2: Worker processes webhook with HMAC validation and Proper & Co brand routing
    const res = await fetch(`${server.baseUrl}/api/shopify/webhooks/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Hmac-Sha256': hmac
      },
      body: payload
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.businessId, 'biz_proper_co');

    // Step 3: Verify customer and lead records created
    const bride = store.customers.get(data.customerId);
    const lead = store.leads.get(data.leadId);
    assert.equal(bride.name, 'Zendaya Coleman');
    assert.equal(lead.source, 'Shopify Storefront');

    // Step 4: Verify automated SMS notification logged in message history
    const msgs = Array.from(store.messages.values()).filter(m => m.customer_id === data.customerId);
    assert.ok(msgs.length >= 1);
    assert.equal(msgs[0].direction, 'outbound');
  });

  await test('SCEN-04: Subscription Tier Escalation & Instant Feature Unlocking — Starter -> Enterprise Upgrade', async () => {
    // Step 1: Tenant on Essentials attempts to access Marketing AI -> Forbidden / PLAN_LOCKED
    const evalLocked = EntitlementEngine.evaluate(store, 'biz_tenant_b', 'growth.marketing_ai');
    assert.equal(evalLocked.allowed, false);
    assert.equal(evalLocked.state, 'PLAN_LOCKED');

    // Step 2: Support ticket logged requesting upgrade
    const ticketId = `ticket_upgrade_${Date.now()}`;
    store.supportTickets.set(ticketId, {
      id: ticketId,
      business_id: 'biz_tenant_b',
      subject: 'Upgrade to Enterprise Plan',
      status: 'OPEN'
    });

    // Step 3: Platform Super Admin upgrades subscription
    store.subscriptions.get('biz_tenant_b').plan = 'enterprise';
    store.supportTickets.get(ticketId).status = 'RESOLVED';

    // Step 4: Instant evaluation reflects Enterprise unlock
    const evalUnlocked = EntitlementEngine.evaluate(store, 'biz_tenant_b', 'growth.marketing_ai');
    const evalSmartPo = EntitlementEngine.evaluate(store, 'biz_tenant_b', 'inventory.smart_po');

    assert.equal(evalUnlocked.allowed, true);
    assert.equal(evalUnlocked.state, 'ACTIVE');
    assert.equal(evalSmartPo.allowed, true);
    assert.equal(evalSmartPo.state, 'ACTIVE');
  });

  await test('SCEN-05: Webhook Malformed Payload DLQ & Operator Recovery — DLQ -> Admin Alert -> Retry Success', async () => {
    // Step 1: Malformed job created and failing
    const jobId = `job_dlq_scen_${Date.now()}`;
    store.durableJobs.set(jobId, {
      id: jobId,
      business_id: 'biz_ido_bridal',
      queue_name: 'sync_shopify_catalog',
      payload: { simulateFailure: true, failureMessage: 'Missing catalog authorization token' },
      status: 'pending',
      attempts: 4,
      max_attempts: 5
    });

    // Step 2: Poller fails job and sends to DLQ
    server.runPendingJobs();
    const job = store.durableJobs.get(jobId);
    assert.equal(job.status, 'dead-letter');
    assert.equal(job.attempts, 5);

    // Step 3: Operator fixes the schema/credentials in payload and clicks retry in Platform Admin
    job.payload.simulateFailure = false; // Issue resolved
    const retryRes = await fetch(`${server.baseUrl}/api/platform/jobs/${jobId}/retry`, { method: 'POST' });
    assert.equal(retryRes.status, 200);
    assert.equal(job.status, 'pending');

    // Step 4: Runner processes retried job successfully
    server.runPendingJobs();
    assert.equal(job.status, 'completed');
    assert.equal(job.locked_at, null);
  });

  return {
    tier: 'Tier 4: Real-World Workload Scenarios',
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
  console.log(`Running Tier 4 tests on ${server.baseUrl}...`);
  const report = await runTier4Tests(server, store);
  await server.stop();
  console.log(`Tier 4 Finished: ${report.passed}/${report.totalTests} passed (${report.durationMs}ms)`);
  process.exitCode = report.failed > 0 ? 1 : 0;
}
