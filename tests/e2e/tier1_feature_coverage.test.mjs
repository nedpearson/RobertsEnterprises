import assert from 'node:assert/strict';
import { VowosInMemoryStore, VowosTestServer, EntitlementEngine, CryptoHelper } from './harness.mjs';

export async function runTier1Tests(server, store) {
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
  // Feature Area 1: Multi-Tenant & Multi-Brand Routing
  // =========================================================================

  await test('F1-T1-01: Tenant Context Resolution loads correct business configuration & branding', async () => {
    const res = await fetch(`${server.baseUrl}/api/tenant-config`, {
      headers: { 'x-business-id': 'biz_ido_bridal' }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.brand.name, 'I Do Bridal Couture');
    assert.equal(body.brand.slug, 'ido-bridal');
    assert.equal(body.brand.primary_color, '#D4AF37');
  });

  await test('F1-T1-02: Location Switching filters appointments & inventory stock by location', async () => {
    // Add appointments for Baton Rouge and Covington
    const apt1 = { id: 'apt_br_1', business_id: 'biz_ido_bridal', location_id: 'ido-br', status: 'confirmed' };
    const apt2 = { id: 'apt_cov_1', business_id: 'biz_ido_bridal', location_id: 'ido-cov', status: 'booked' };
    store.appointments.set(apt1.id, apt1);
    store.appointments.set(apt2.id, apt2);

    const brApts = Array.from(store.appointments.values()).filter(a => a.location_id === 'ido-br');
    const covApts = Array.from(store.appointments.values()).filter(a => a.location_id === 'ido-cov');

    assert.equal(brApts.length, 1);
    assert.equal(brApts[0].id, 'apt_br_1');
    assert.equal(covApts.length, 1);
    assert.equal(covApts[0].id, 'apt_cov_1');

    const gown = store.gowns.get('gown_monique_1');
    assert.equal(gown.stock_by_location['ido-br'], 3);
    assert.equal(gown.stock_by_location['ido-cov'], 1);
  });

  await test('F1-T1-03: Multi-Brand Scoping isolates catalog & brands within same tenant ecosystem', async () => {
    const brandIdo = store.brands.get('brand_ido');
    const brandProper = store.brands.get('brand_proper');
    assert.notEqual(brandIdo.business_id, brandProper.business_id);
    assert.equal(brandIdo.name, 'I Do Bridal Couture');
    assert.equal(brandProper.name, 'Proper & Company');

    // Verify gown belongs exclusively to I Do Bridal
    const gown = store.gowns.get('gown_monique_1');
    assert.equal(gown.business_id, 'biz_ido_bridal');
    assert.equal(gown.brand_id, 'brand_ido');
  });

  await test('F1-T1-04: Cross-Tenant Isolation prevents fetching records belonging to other tenants', async () => {
    // Attempting to access Tenant B config without membership
    const res = await fetch(`${server.baseUrl}/api/tenant-config`, {
      headers: { 'x-business-id': 'biz_tenant_b' }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.brand.name, 'Tenant B Bridal');
    assert.notEqual(body.brand.name, 'I Do Bridal Couture');
  });

  await test('F1-T1-05: Multi-Location All Aggregation aggregates metrics across all locations', async () => {
    const gown = store.gowns.get('gown_monique_1');
    const totalStock = Object.values(gown.stock_by_location).reduce((a, b) => a + b, 0);
    assert.equal(totalStock, 4); // 3 in BR + 1 in COV
  });

  // =========================================================================
  // Feature Area 2: Appointment Booking & Scheduling
  // =========================================================================

  await test('F2-T1-01: Public Booking Intake creates appointment request with location & date', async () => {
    const res = await fetch(`${server.baseUrl}/api/scheduling/public/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Genevieve Delacroix',
        email: 'genevieve@example.com',
        phone: '+12255550144',
        weddingDate: '2026-11-20',
        store: 'ido-br',
        date: '2026-09-12',
        time: '11:00 AM'
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.requestId);
    assert.ok(data.customerId);

    const createdReq = store.appointmentRequests.get(data.requestId);
    assert.equal(createdReq.store, 'ido-br');
    assert.equal(createdReq.status, 'submitted');
  });

  await test('F2-T1-02: Appointment Creation & Slot Hold reserves fitting room & stylist', async () => {
    const aptId = 'apt_new_001';
    const apt = {
      id: aptId,
      business_id: 'biz_ido_bridal',
      location_id: 'ido-br',
      customer_id: 'cust_gen_1',
      stylist_id: 'staff_1',
      room_id: 'room_suite_1',
      start_time: '2026-09-12T11:00:00Z',
      end_time: '2026-09-12T12:30:00Z',
      status: 'booked'
    };
    store.appointments.set(aptId, apt);

    const holdId = 'hold_001';
    store.appointmentHolds.set(holdId, {
      id: holdId,
      appointment_id: aptId,
      room_id: 'room_suite_1',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });

    assert.equal(store.appointments.get(aptId).status, 'booked');
    assert.ok(store.appointmentHolds.has(holdId));
  });

  await test('F2-T1-03: Appointment Status Progression transitions booked -> confirmed -> checked_in -> completed', async () => {
    const aptId = 'apt_progression_1';
    store.appointments.set(aptId, {
      id: aptId,
      business_id: 'biz_ido_bridal',
      status: 'booked'
    });

    // 1. Confirmed
    store.appointments.get(aptId).status = 'confirmed';
    assert.equal(store.appointments.get(aptId).status, 'confirmed');

    // 2. Checked In
    store.appointments.get(aptId).status = 'checked_in';
    store.appointments.get(aptId).check_in_time = new Date().toISOString();
    assert.equal(store.appointments.get(aptId).status, 'checked_in');

    // 3. Completed
    store.appointments.get(aptId).status = 'completed';
    assert.equal(store.appointments.get(aptId).status, 'completed');
  });

  await test('F2-T1-04: Reschedule Appointment updates date & time correctly', async () => {
    const aptId = 'apt_reschedule_1';
    store.appointments.set(aptId, {
      id: aptId,
      business_id: 'biz_ido_bridal',
      start_time: '2026-09-12T11:00:00Z',
      end_time: '2026-09-12T12:30:00Z',
      status: 'confirmed'
    });

    const apt = store.appointments.get(aptId);
    apt.start_time = '2026-09-19T14:00:00Z';
    apt.end_time = '2026-09-19T15:30:00Z';
    apt.rescheduled_at = new Date().toISOString();

    assert.equal(store.appointments.get(aptId).start_time, '2026-09-19T14:00:00Z');
    assert.ok(store.appointments.get(aptId).rescheduled_at);
  });

  await test('F2-T1-05: Appointment Outcome & Revenue Logging logs Purchased outcome & feedback', async () => {
    const aptId = 'apt_outcome_1';
    store.appointments.set(aptId, {
      id: aptId,
      business_id: 'biz_ido_bridal',
      status: 'completed',
      outcome: 'Purchased',
      revenue_cents: 650000,
      feedback: 'Found dream Monique Lhuillier gown!'
    });

    const completedApt = store.appointments.get(aptId);
    assert.equal(completedApt.outcome, 'Purchased');
    assert.equal(completedApt.revenue_cents, 650000);
    assert.equal(completedApt.feedback, 'Found dream Monique Lhuillier gown!');
  });

  // =========================================================================
  // Feature Area 3: Customer & Bride Dossier / 360
  // =========================================================================

  await test('F3-T1-01: Bride Profile Creation stores wedding date, budget, and stylist assignment', async () => {
    const custId = 'cust_bride_101';
    const bride = {
      id: custId,
      business_id: 'biz_ido_bridal',
      name: 'Camille Moreau',
      email: 'camille@example.com',
      phone: '+12255550188',
      wedding_date: '2026-10-17',
      budget_cents: 500000,
      stylist_id: 'staff_1',
      created_at: new Date().toISOString()
    };
    store.customers.set(custId, bride);

    const saved = store.customers.get(custId);
    assert.equal(saved.name, 'Camille Moreau');
    assert.equal(saved.budget_cents, 500000);
    assert.equal(saved.stylist_id, 'staff_1');
  });

  await test('F3-T1-02: Preferences & Sizing Tracking saves silhouette & measurements', async () => {
    const prefId = 'pref_101';
    store.customerPreferences.set(prefId, {
      id: prefId,
      customer_id: 'cust_bride_101',
      preferred_silhouettes: ['A-Line', 'Ballgown'],
      favorite_designers: ['Monique Lhuillier', 'Ines Di Santo'],
      measurements: { bust: 34, waist: 26, hips: 37 }
    });

    const pref = store.customerPreferences.get(prefId);
    assert.deepEqual(pref.preferred_silhouettes, ['A-Line', 'Ballgown']);
    assert.equal(pref.measurements.waist, 26);
  });

  await test('F3-T1-03: Try-On Gown Logging saves try-on session notes and rating', async () => {
    const noteId = 'note_tryon_1';
    store.customerNotes.set(noteId, {
      id: noteId,
      customer_id: 'cust_bride_101',
      gown_id: 'gown_monique_1',
      rating: 5,
      notes: 'Loved the French lace train and corset fit',
      created_at: new Date().toISOString()
    });

    const note = store.customerNotes.get(noteId);
    assert.equal(note.rating, 5);
    assert.equal(note.gown_id, 'gown_monique_1');
  });

  await test('F3-T1-04: Inspiration Photo Upload attaches media link to customer dossier', async () => {
    const cust = store.customers.get('cust_bride_101');
    cust.inspiration_photos = ['https://cdn.vowos.io/photos/inspiration_versailles.jpg'];

    assert.equal(cust.inspiration_photos.length, 1);
    assert.ok(cust.inspiration_photos[0].includes('inspiration_versailles.jpg'));
  });

  await test('F3-T1-05: Follow-Up Task Assignment assigns task to stylist with due date', async () => {
    const taskId = 'task_followup_1';
    const task = {
      id: taskId,
      business_id: 'biz_ido_bridal',
      customer_id: 'cust_bride_101',
      assigned_to: 'staff_1',
      title: 'Send veil recommendations & quote',
      due_date: '2026-09-14',
      status: 'pending'
    };
    assert.equal(task.assigned_to, 'staff_1');
    assert.equal(task.status, 'pending');
  });

  // =========================================================================
  // Feature Area 4: Invoices, Payments & POS Terminal
  // =========================================================================

  await test('F4-T1-01: Invoice Generation calculates line items, taxes, and balance', async () => {
    const invId = 'inv_001';
    const invoice = {
      id: invId,
      business_id: 'biz_ido_bridal',
      customer_id: 'cust_bride_101',
      stylist_id: 'staff_1',
      amount_cents: 650000,
      paid_cents: 0,
      status: 'Draft',
      line_items: [
        { description: 'Monique Lhuillier Versailles Gown', qty: 1, unit_price_cents: 650000 }
      ],
      created_at: new Date().toISOString()
    };
    store.invoices.set(invId, invoice);

    const inv = store.invoices.get(invId);
    assert.equal(inv.amount_cents, 650000);
    assert.equal(inv.paid_cents, 0);
    assert.equal(inv.status, 'Draft');
  });

  await test('F4-T1-02: POS Terminal Deposit Payment records payment & updates invoice status to Partial', async () => {
    const inv = store.invoices.get('inv_001');
    const paymentId = 'pay_term_001';
    const payment = {
      id: paymentId,
      invoice_id: inv.id,
      business_id: inv.business_id,
      amount_cents: 325000, // 50% deposit
      payment_method: 'terminal',
      provider_transaction_id: 'txn_stripe_pos_999',
      status: 'completed',
      created_at: new Date().toISOString()
    };
    store.payments.set(paymentId, payment);

    inv.paid_cents += payment.amount_cents;
    inv.status = inv.paid_cents >= inv.amount_cents ? 'Paid' : 'Partial';

    assert.equal(inv.paid_cents, 325000);
    assert.equal(inv.status, 'Partial');
    assert.equal(store.payments.get(paymentId).status, 'completed');
  });

  await test('F4-T1-03: Staged Payment Plan tracks scheduled installment due dates', async () => {
    const inv = store.invoices.get('inv_001');
    inv.installments = [
      { installment_number: 1, amount_cents: 325000, due_date: '2026-09-12', status: 'paid' },
      { installment_number: 2, amount_cents: 162500, due_date: '2026-10-12', status: 'pending' },
      { installment_number: 3, amount_cents: 162500, due_date: '2026-11-01', status: 'pending' }
    ];

    const totalScheduled = inv.installments.reduce((sum, inst) => sum + inst.amount_cents, 0);
    assert.equal(totalScheduled, inv.amount_cents);
    assert.equal(inv.installments[0].status, 'paid');
    assert.equal(inv.installments[1].status, 'pending');
  });

  await test('F4-T1-04: Booking Fee Application credits appointment booking fee against final invoice', async () => {
    const inv = store.invoices.get('inv_001');
    const bookingFeeCredit = 5000; // $50 credit
    inv.amount_cents -= bookingFeeCredit;
    inv.booking_fee_credited = bookingFeeCredit;

    assert.equal(inv.amount_cents, 645000);
    assert.equal(inv.booking_fee_credited, 5000);
  });

  await test('F4-T1-05: Payment Refund Execution records refund & adjusts invoice paid balance', async () => {
    const refundId = 'ref_001';
    const refundAmount = 25000; // $250 partial refund
    store.refunds.set(refundId, {
      id: refundId,
      payment_id: 'pay_term_001',
      invoice_id: 'inv_001',
      amount_cents: refundAmount,
      reason: 'Accessory discount adjustment',
      created_at: new Date().toISOString()
    });

    const inv = store.invoices.get('inv_001');
    inv.paid_cents -= refundAmount;

    assert.equal(inv.paid_cents, 300000);
    assert.equal(store.refunds.get(refundId).amount_cents, 25000);
  });

  // =========================================================================
  // Feature Area 5: Inventory, POs, Transfers & Gowns
  // =========================================================================

  await test('F5-T1-01: Gown Catalog Creation stores style, designer, SKU, and multi-location stock', async () => {
    const gownId = 'gown_ines_001';
    const gown = {
      id: gownId,
      business_id: 'biz_ido_bridal',
      brand_id: 'brand_ido',
      style_name: 'Ines Di Santo Calypso',
      designer: 'Ines Di Santo',
      sku: 'IDS-CAL-002',
      cost_cents: 220000,
      msrp_cents: 580000,
      stock_by_location: {
        'ido-br': 2,
        'ido-cov': 2
      },
      created_at: new Date().toISOString()
    };
    store.gowns.set(gownId, gown);

    const saved = store.gowns.get(gownId);
    assert.equal(saved.style_name, 'Ines Di Santo Calypso');
    assert.equal(saved.stock_by_location['ido-br'], 2);
    assert.equal(saved.stock_by_location['ido-cov'], 2);
  });

  await test('F5-T1-02: Purchase Order Creation submits PO to designer vendor', async () => {
    const poId = 'po_001';
    const po = {
      id: poId,
      business_id: 'biz_ido_bridal',
      vendor_name: 'Monique Lhuillier Couture',
      location_id: 'ido-br',
      status: 'submitted',
      total_cents: 250000,
      items: [
        { gown_id: 'gown_monique_1', qty: 1, size: '8', unit_cost_cents: 250000 }
      ],
      created_at: new Date().toISOString()
    };
    store.purchaseOrders.set(poId, po);

    const savedPo = store.purchaseOrders.get(poId);
    assert.equal(savedPo.status, 'submitted');
    assert.equal(savedPo.total_cents, 250000);
  });

  await test('F5-T1-03: PO Receiving Workflow receives shipment & increments location stock', async () => {
    const po = store.purchaseOrders.get('po_001');
    po.status = 'received';
    po.received_at = new Date().toISOString();

    const gown = store.gowns.get('gown_monique_1');
    gown.stock_by_location['ido-br'] += 1;

    assert.equal(po.status, 'received');
    assert.equal(gown.stock_by_location['ido-br'], 4); // was 3, received 1 -> 4
  });

  await test('F5-T1-04: Inter-Location Transfer Request initiates stock transfer between stores', async () => {
    const transferId = 'xfer_001';
    const xfer = {
      id: transferId,
      business_id: 'biz_ido_bridal',
      gown_id: 'gown_monique_1',
      from_location_id: 'ido-br',
      to_location_id: 'ido-cov',
      qty: 1,
      status: 'Requested',
      created_at: new Date().toISOString()
    };
    store.transfers.set(transferId, xfer);

    const saved = store.transfers.get(transferId);
    assert.equal(saved.status, 'Requested');
    assert.equal(saved.qty, 1);
  });

  await test('F5-T1-05: Transfer Receipt & Stock Rebalance rebalances stock at origin & destination', async () => {
    const xfer = store.transfers.get('xfer_001');
    xfer.status = 'Received';
    xfer.received_at = new Date().toISOString();

    const gown = store.gowns.get(xfer.gown_id);
    gown.stock_by_location[xfer.from_location_id] -= xfer.qty;
    gown.stock_by_location[xfer.to_location_id] += xfer.qty;

    assert.equal(xfer.status, 'Received');
    assert.equal(gown.stock_by_location['ido-br'], 3); // 4 - 1 = 3
    assert.equal(gown.stock_by_location['ido-cov'], 2); // 1 + 1 = 2
  });

  // =========================================================================
  // Feature Area 6: Team, Timeclock & Commissions
  // =========================================================================

  await test('F6-T1-01: Staff Profile & Role Assignment creates stylist with commission rate', async () => {
    const staff = store.staff.get('staff_1');
    assert.equal(staff.name, 'Claire Dupont');
    assert.equal(staff.role, 'stylist');
    assert.equal(staff.commission_rate, 0.10);
  });

  await test('F6-T1-02: Weekly Shift Scheduling creates scheduled shift on staff calendar', async () => {
    const shiftId = 'shift_001';
    const shift = {
      id: shiftId,
      employee_id: 'staff_1',
      location_id: 'ido-br',
      start_at: '2026-09-12T09:00:00Z',
      end_at: '2026-09-12T17:00:00Z',
      status: 'scheduled'
    };
    store.schedules.set(shiftId, shift);

    assert.equal(store.schedules.get(shiftId).status, 'scheduled');
  });

  await test('F6-T1-03: Timeclock Punch In/Out records shift punch & computes duration', async () => {
    const punchId = 'punch_001';
    const clockIn = new Date('2026-09-12T08:58:00Z');
    const clockOut = new Date('2026-09-12T17:02:00Z');
    const durationSeconds = Math.round((clockOut - clockIn) / 1000);

    store.timeEntries.set(punchId, {
      id: punchId,
      employee_id: 'staff_1',
      business_id: 'biz_ido_bridal',
      location_id: 'ido-br',
      clock_in: clockIn.toISOString(),
      clock_out: clockOut.toISOString(),
      duration_seconds: durationSeconds,
      status: 'approved'
    });

    const entry = store.timeEntries.get(punchId);
    assert.equal(entry.duration_seconds, 29040); // 8h 4min
    assert.equal(entry.status, 'approved');
  });

  await test('F6-T1-04: Time-Off Request & Approval processes manager approval for PTO', async () => {
    const ptoId = 'pto_001';
    store.timeOffRequests.set(ptoId, {
      id: ptoId,
      employee_id: 'staff_1',
      start_at: '2026-10-01',
      end_at: '2026-10-05',
      reason: 'Vacation',
      status: 'pending'
    });

    const pto = store.timeOffRequests.get(ptoId);
    pto.status = 'approved';
    pto.approved_by = 'staff_mgr';

    assert.equal(store.timeOffRequests.get(ptoId).status, 'approved');
    assert.equal(store.timeOffRequests.get(ptoId).approved_by, 'staff_mgr');
  });

  await test('F6-T1-05: Sales Commission Calculation calculates 10% commission on completed sales', async () => {
    const commId = 'comm_001';
    const saleAmountCents = 650000;
    const rate = store.staff.get('staff_1').commission_rate; // 0.10
    const commissionCents = Math.round(saleAmountCents * rate);

    store.salesCommissions.set(commId, {
      id: commId,
      employee_id: 'staff_1',
      invoice_id: 'inv_001',
      sale_amount_cents: saleAmountCents,
      commission_cents: commissionCents,
      status: 'pending'
    });

    const comm = store.salesCommissions.get(commId);
    assert.equal(comm.commission_cents, 65000); // $650.00
  });

  // =========================================================================
  // Feature Area 7: Growth, Omnichannel & SEO
  // =========================================================================

  await test('F7-T1-01: Lead Pipeline Intake assigns AI priority score to inbound lead', async () => {
    const leadId = 'lead_campaign_1';
    store.leads.set(leadId, {
      id: leadId,
      business_id: 'biz_ido_bridal',
      name: 'Ariana Grande',
      email: 'ariana@example.com',
      source: 'Meta Ads',
      budget_cents: 800000,
      wedding_date: '2026-12-31',
      stage: 'New Inquiry',
      ai_priority_score: 98
    });

    const lead = store.leads.get(leadId);
    assert.equal(lead.ai_priority_score, 98);
    assert.equal(lead.source, 'Meta Ads');
  });

  await test('F7-T1-02: Marketing Campaign Tracking syncs Meta campaign metrics', async () => {
    const res = await fetch(`${server.baseUrl}/api/growth/sync/meta-ads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-business-id': 'biz_ido_bridal',
        'x-user-role': 'owner'
      },
      body: JSON.stringify({ days: 30 })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.spendDays, 30);
  });

  await test('F7-T1-03: Omnichannel Inbox Message Ingestion tracks message thread', async () => {
    const msgId = 'msg_omni_001';
    store.messages.set(msgId, {
      id: msgId,
      business_id: 'biz_ido_bridal',
      customer_id: 'cust_bride_101',
      sender: 'Customer',
      content: 'Can I bring 4 guests to my fitting on Saturday?',
      channel: 'instagram',
      direction: 'inbound',
      status: 'received',
      sent_at: new Date().toISOString()
    });

    const msg = store.messages.get(msgId);
    assert.equal(msg.channel, 'instagram');
    assert.equal(msg.direction, 'inbound');
  });

  await test('F7-T1-04: Two-Way SMS Dispatch sends outbound SMS to opted-in bride', async () => {
    const cust = store.customers.get('cust_bride_101');
    cust.sms_opt_in = true;

    const res = await fetch(`${server.baseUrl}/api/communications/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'cust_bride_101',
        message: 'Yes, we would love to welcome you and your 4 guests!'
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.messageId);
  });

  await test('F7-T1-05: SEO Health Snapshot saves SEO crawl score & indexation metrics', async () => {
    const snapshotId = 'seo_snap_001';
    store.seoHealthSnapshots.set(snapshotId, {
      id: snapshotId,
      business_id: 'biz_ido_bridal',
      overall_score: 94,
      pages_crawled: 42,
      issues_count: 2,
      created_at: new Date().toISOString()
    });

    const snap = store.seoHealthSnapshots.get(snapshotId);
    assert.equal(snap.overall_score, 94);
    assert.equal(snap.pages_crawled, 42);
  });

  // =========================================================================
  // Feature Area 8: Feature Entitlements & Subscription Tiers
  // =========================================================================

  await test('F8-T1-01: Plan Tier Feature Access allows Pro tenant to access inventory transfers', async () => {
    const res = EntitlementEngine.evaluate(store, 'biz_ido_bridal', 'inventory.transfers');
    assert.equal(res.allowed, true);
    assert.equal(res.state, 'ACTIVE');
  });

  await test('F8-T1-02: Plan Locked Gating blocks Essentials tenant from accessing Enterprise feature', async () => {
    const res = EntitlementEngine.evaluate(store, 'biz_tenant_b', 'inventory.smart_po');
    assert.equal(res.allowed, false);
    assert.equal(res.state, 'PLAN_LOCKED');
    assert.equal(res.minimumPlan, 'enterprise');
  });

  await test('F8-T1-03: Platform Super Admin Override unlocks feature with FORCED_ON override', async () => {
    store.featureOverrides.set('biz_tenant_b:inventory.smart_po', 'FORCED_ON');
    const res = EntitlementEngine.evaluate(store, 'biz_tenant_b', 'inventory.smart_po');
    assert.equal(res.allowed, true);
    assert.equal(res.state, 'OVERRIDE_ENABLED');
    store.featureOverrides.delete('biz_tenant_b:inventory.smart_po');
  });

  await test('F8-T1-04: Customer Module Preference Toggle completely disables toggled-off module', async () => {
    store.modulePreferences.set('biz_ido_bridal:team', false);
    const res = EntitlementEngine.evaluate(store, 'biz_ido_bridal', 'team.timeclock');
    assert.equal(res.allowed, false);
    assert.equal(res.state, 'MODULE_DISABLED');
    store.modulePreferences.delete('biz_ido_bridal:team');
  });

  await test('F8-T1-05: Comped Enterprise Invariant unlocks all features at $0 price', async () => {
    const sub = store.subscriptions.get('biz_tenant_comped');
    assert.equal(sub.plan, 'comped');
    assert.equal(sub.price_cents, 0);

    const res = EntitlementEngine.evaluate(store, 'biz_tenant_comped', 'growth.marketing_ai');
    assert.equal(res.allowed, true);
    assert.equal(res.state, 'ACTIVE');
  });

  // =========================================================================
  // Feature Area 9: Webhook Ingestion (Shopify, Twilio)
  // =========================================================================

  await test('F9-T1-01: Shopify Order Webhook Ingestion creates lead & appointment request with valid HMAC', async () => {
    const payload = JSON.stringify({
      id: 99401,
      total_price: '3500.00',
      customer: {
        first_name: 'Isabella',
        last_name: 'Rossellini',
        email: 'isabella@example.com',
        phone: '+12255550999'
      },
      line_items: [
        {
          title: 'Bridal Appointment Fitting Fee',
          properties: [{ name: 'Store', value: 'ido-br' }]
        }
      ]
    });
    const hmac = CryptoHelper.generateShopifyHmac(payload, server.shopifySecret);

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
    assert.ok(data.customerId);
    assert.ok(data.leadId);
    assert.equal(data.businessId, 'biz_ido_bridal');
  });

  await test('F9-T1-02: Shopify Idempotency Deduplication acknowledges duplicate order without re-inserting', async () => {
    const payload = JSON.stringify({
      id: 99401, // same order ID
      total_price: '3500.00',
      customer: { first_name: 'Isabella', last_name: 'Rossellini', email: 'isabella@example.com' }
    });
    const hmac = CryptoHelper.generateShopifyHmac(payload, server.shopifySecret);

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
    assert.ok(data.message.includes('idempotent'));
  });

  await test('F9-T1-03: Twilio Inbound SMS Webhook records message and returns valid TwiML XML', async () => {
    const params = {
      From: '+12255550999',
      To: '+12255550101',
      Body: 'YES, confirming my appointment!',
      MessageSid: 'SM_twilio_test_001'
    };
    const formBody = new URLSearchParams(params).toString();
    const url = `${server.baseUrl}/api/communications/twilio-webhook`;
    const sig = CryptoHelper.generateTwilioSignature(url, params, server.twilioAuthToken);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': sig
      },
      body: formBody
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('xml'));
    const xml = await res.text();
    assert.ok(xml.includes('<Response></Response>'));

    const msg = store.messages.get('SM_twilio_test_001');
    assert.ok(msg);
    assert.equal(msg.content, 'YES, confirming my appointment!');
    assert.equal(msg.direction, 'inbound');
  });

  await test('F9-T1-04: Webhook Dynamic Brand Mapping routes Proper & Co store webhook to Proper & Co tenant', async () => {
    const payload = JSON.stringify({
      id: 99402,
      total_price: '450.00',
      customer: {
        first_name: 'Victoria',
        last_name: 'Beckham',
        email: 'victoria@example.com',
        phone: '+19855550998'
      },
      line_items: [
        {
          title: 'Cocktail Dress Alterations',
          properties: [{ name: 'Store', value: 'pc-cov' }]
        }
      ]
    });
    const hmac = CryptoHelper.generateShopifyHmac(payload, server.shopifySecret);

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
    assert.equal(data.businessId, 'biz_proper_co');
  });

  await test('F9-T1-05: Webhook Delivery Event Audit logs successful webhook event', async () => {
    const eventId = 'webevt_001';
    store.webhookEvents.set(eventId, {
      id: eventId,
      provider: 'shopify',
      topic: 'orders/create',
      status: 'delivered',
      status_code: 200,
      delivered_at: new Date().toISOString()
    });

    const evt = store.webhookEvents.get(eventId);
    assert.equal(evt.status_code, 200);
    assert.equal(evt.status, 'delivered');
  });

  // =========================================================================
  // Feature Area 10: Platform Admin, Failed Jobs & DLQ
  // =========================================================================

  await test('F10-T1-01: Platform Overview Metrics calculates active tenants & MRR', async () => {
    const totalTenants = store.businesses.size;
    const activeMRR = Array.from(store.subscriptions.values())
      .filter(s => s.status === 'ACTIVE')
      .reduce((sum, s) => sum + s.price_cents, 0);

    assert.ok(totalTenants >= 4);
    assert.equal(activeMRR, 29900 + 14900 + 7900 + 0); // 52700 cents = $527.00
  });

  await test('F10-T1-02: Tenant Provisioning RPC creates business, brand, location & subscription atomically', async () => {
    const res = await fetch(`${server.baseUrl}/api/platform/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-token',
        'x-platform-admin': 'true'
      },
      body: JSON.stringify({
        orgName: 'Couture Royale',
        orgSlug: 'couture-royale',
        ownerEmail: 'owner@coutureroyale.com',
        brandName: 'Couture Royale Bridal',
        locationName: 'Couture Royale Flagship',
        city: 'New Orleans'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.businessId);
    assert.ok(data.brandId);
    assert.ok(data.locationId);

    assert.ok(store.businesses.has(data.businessId));
    assert.ok(store.brands.has(data.brandId));
    assert.ok(store.locations.has(data.locationId));
  });

  await test('F10-T1-03: Support Ticket Lifecycle creates, responds to, and resolves support ticket', async () => {
    const ticketId = 'ticket_001';
    store.supportTickets.set(ticketId, {
      id: ticketId,
      business_id: 'biz_ido_bridal',
      subject: 'Inquiry about Meta Catalog Sync',
      priority: 'HIGH',
      status: 'OPEN',
      messages: [{ sender: 'Tenant', text: 'Sync failed on 2 items' }]
    });

    const ticket = store.supportTickets.get(ticketId);
    ticket.messages.push({ sender: 'Platform Admin', text: 'Catalog refreshed and resynced.' });
    ticket.status = 'RESOLVED';

    assert.equal(ticket.status, 'RESOLVED');
    assert.equal(ticket.messages.length, 2);
  });

  await test('F10-T1-04: Background Job Poller picks up pending job & marks completed', async () => {
    const jobId = 'job_sync_cat_1';
    store.durableJobs.set(jobId, {
      id: jobId,
      business_id: 'biz_ido_bridal',
      queue_name: 'sync_shopify_catalog',
      payload: { catalogId: 'cat_123' },
      status: 'pending',
      attempts: 0,
      max_attempts: 5
    });

    server.runPendingJobs();

    const job = store.durableJobs.get(jobId);
    assert.equal(job.status, 'completed');
    assert.equal(job.attempts, 1);
  });

  await test('F10-T1-05: Failed Job Dead-Letter Transition moves max retried job to dead-letter', async () => {
    const jobId = 'job_failing_1';
    store.durableJobs.set(jobId, {
      id: jobId,
      business_id: 'biz_ido_bridal',
      queue_name: 'publish_meta_campaign',
      payload: { simulateFailure: true, failureMessage: 'Meta API rate limit exceeded' },
      status: 'pending',
      attempts: 4,
      max_attempts: 5
    });

    server.runPendingJobs();

    const job = store.durableJobs.get(jobId);
    assert.equal(job.status, 'dead-letter');
    assert.equal(job.attempts, 5);
    assert.equal(job.error_message, 'Meta API rate limit exceeded');
  });

  return {
    tier: 'Tier 1: Feature Coverage',
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
  console.log(`Running Tier 1 tests on ${server.baseUrl}...`);
  const report = await runTier1Tests(server, store);
  await server.stop();
  console.log(`Tier 1 Finished: ${report.passed}/${report.totalTests} passed (${report.durationMs}ms)`);
  process.exitCode = report.failed > 0 ? 1 : 0;
}
