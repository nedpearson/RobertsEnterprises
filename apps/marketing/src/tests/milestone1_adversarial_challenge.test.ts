import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isUuid,
  generateEntityId,
  resolveLocationId,
  resolveLocationSlug,
  DEMO_BUSINESS_ID,
  DEMO_LOCATION_MAP,
} from '@/contexts/VowosDataContext';
import { demoDb } from '@/lib/demo/demoDatabase';
import { sendAndLogMessage } from '@/lib/messaging';
import { setActiveDataPlane } from '@/lib/supabase';

describe('Adversarial Stress Test: Milestone 1 Database Persistence & Schema Alignment', () => {
  // ─── 1. UUID Generation & Fuzzing Tests ───
  describe('1. UUID Generation & Fuzzing / Non-UUID Quarantine', () => {
    it('generates 1,000 RFC-4122 v4 UUIDs without collisions or invalid characters', () => {
      const set = new Set<string>();
      const v4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      for (let i = 0; i < 1000; i++) {
        const id = generateEntityId();
        expect(isUuid(id)).toBe(true);
        expect(v4Pattern.test(id)).toBe(true);
        set.add(id);
      }
      expect(set.size).toBe(1000);
    });

    it('rejects legacy string IDs and prevents them from masquerading as UUIDs', () => {
      const legacyIds = [
        'C-2001',
        'A-5001',
        'PO-7106',
        'G-1001',
        'T-8001',
        'INV-5001',
        'C-3001',
        'C-101',
        'MSG-DEMO-001',
        'L-1001',
        'TR-9001',
      ];

      for (const legacyId of legacyIds) {
        expect(isUuid(legacyId)).toBe(false);
      }
    });

    it('rejects malformed, injected, and boundary UUID inputs', () => {
      const adversarialInputs = [
        null,
        undefined,
        '',
        '   ',
        // SQL injection attempts
        "c0000000-0000-0000-0000-000000000001' OR '1'='1",
        'c0000000-0000-0000-0000-000000000001; DROP TABLE customers; --',
        // Braces / JSON artifacts
        '{c0000000-0000-0000-0000-000000000001}',
        'urn:uuid:c0000000-0000-0000-0000-000000000001',
        // Length violations
        'c0000000-0000-0000-0000-00000000000', // 1 char short
        'c0000000-0000-0000-0000-0000000000001', // 1 char long
        'c00000000000000000000000000000001', // missing hyphens
        // Non-hex characters
        'c0000000-0000-0000-0000-00000000000g',
        'c0000000-0000-0000-0000-00000000000z',
        'g0000000-0000-0000-0000-000000000000',
        // Non-string types cast to any
        12345 as any,
        {} as any,
        [] as any,
        true as any,
      ];

      for (const input of adversarialInputs) {
        expect(isUuid(input)).toBe(false);
      }
    });

    it('accepts both lowercase and uppercase standard UUIDs', () => {
      const lower = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
      const upper = 'A1B2C3D4-E5F6-4A1B-8C2D-3E4F5A6B7C8D';
      const mixed = 'A1b2C3d4-E5f6-4A1b-8C2d-3E4f5A6b7C8d';

      expect(isUuid(lower)).toBe(true);
      expect(isUuid(upper)).toBe(true);
      expect(isUuid(mixed)).toBe(true);
    });
  });

  // ─── 2. Location Resolution & Fallback Robustness ───
  describe('2. Location Resolution & Fallback Robustness', () => {
    it('always returns a valid UUID from resolveLocationId regardless of input', () => {
      const edgeInputs = [
        'ido-br',
        'ido-cov',
        'pc-br',
        'pc-cov',
        'IDO-BR',
        'unknown-boutique-slug',
        '',
        '   ',
        null,
        undefined,
        'c0000000-0000-0000-0000-000000000002',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'invalid-non-uuid-string',
      ];

      for (const input of edgeInputs) {
        const resolved = resolveLocationId(input as any);
        expect(typeof resolved).toBe('string');
        expect(isUuid(resolved)).toBe(true);
      }
    });

    it('resolves standard location slugs to deterministic UUIDs', () => {
      expect(resolveLocationId('ido-br')).toBe(DEMO_LOCATION_MAP['ido-br']);
      expect(resolveLocationId('ido-cov')).toBe(DEMO_LOCATION_MAP['ido-cov']);
      expect(resolveLocationId('pc-br')).toBe(DEMO_LOCATION_MAP['pc-br']);
      expect(resolveLocationId('pc-cov')).toBe(DEMO_LOCATION_MAP['pc-cov']);
    });

    it('resolves location slugs inversely and falls back safely', () => {
      // Known UUIDs -> correct slugs
      expect(resolveLocationSlug(DEMO_LOCATION_MAP['ido-br'])).toBe('ido-br');
      expect(resolveLocationSlug(DEMO_LOCATION_MAP['ido-cov'])).toBe('ido-cov');
      expect(resolveLocationSlug(DEMO_LOCATION_MAP['pc-br'])).toBe('pc-br');
      expect(resolveLocationSlug(DEMO_LOCATION_MAP['pc-cov'])).toBe('pc-cov');

      // Idempotent slug inputs -> returns identical slug
      expect(resolveLocationSlug('ido-cov')).toBe('ido-cov');
      expect(resolveLocationSlug('pc-br')).toBe('pc-br');

      // Unknown or null inputs -> fallback to 'ido-br'
      expect(resolveLocationSlug(null)).toBe('ido-br');
      expect(resolveLocationSlug(undefined)).toBe('ido-br');
      expect(resolveLocationSlug('')).toBe('ido-br');
      expect(resolveLocationSlug('non-existent-uuid-12345')).toBe('ido-br');
      expect(resolveLocationSlug('99999999-9999-4999-8999-999999999999')).toBe('ido-br');
    });

    it('roundtrip consistency: slug -> uuid -> slug', () => {
      const slugs: (keyof typeof DEMO_LOCATION_MAP)[] = ['ido-br', 'ido-cov', 'pc-br', 'pc-cov'];
      for (const slug of slugs) {
        const uuid = resolveLocationId(slug);
        const roundtripSlug = resolveLocationSlug(uuid);
        expect(roundtripSlug).toBe(slug);
      }
    });
  });

  // ─── 3. Entity Mutation Database Payload Verification ───
  describe('3. Entity Mutation Database Payload Verification', () => {
    beforeEach(() => {
      (globalThis as any).window = {
        location: {
          hostname: 'localhost',
          pathname: '/demo',
        },
      };
      setActiveDataPlane('demo');
      demoDb.reset();
    });

    afterEach(() => {
      delete (globalThis as any).window;
    });

    it('Customer / Bride insert: produces valid UUIDs for PK, business_id, location_id, portal_token', async () => {
      const brideId = generateEntityId();
      const portalToken = generateEntityId();
      const locId = resolveLocationId('ido-cov');

      const payload = {
        id: brideId,
        business_id: DEMO_BUSINESS_ID,
        location_id: locId,
        location: 'ido-cov',
        name: 'Genevieve Dupond',
        email: 'genevieve@example.com',
        phone: '(504) 555-0199',
        wedding_date: '2027-10-15',
        stylist: 'Dana Robichaux',
        status: 'Active',
        spend_cents: 0,
        portal_token: portalToken,
      };

      // Ensure all UUID fields satisfy isUuid
      expect(isUuid(payload.id)).toBe(true);
      expect(isUuid(payload.business_id)).toBe(true);
      expect(isUuid(payload.location_id)).toBe(true);
      expect(isUuid(payload.portal_token)).toBe(true);

      const res = await demoDb.from('customers').insert(payload);
      expect(res.error).toBeNull();

      // Query back through customers and brides view
      const custRes = await demoDb.from('customers').select('*').eq('id', brideId);
      expect(custRes.error).toBeNull();
      expect(custRes.data.length).toBe(1);
      expect(custRes.data[0].name).toBe('Genevieve Dupond');
      expect(custRes.data[0].location_id).toBe(locId);

      const brideViewRes = await demoDb.from('brides').select('*').eq('id', brideId);
      expect(brideViewRes.error).toBeNull();
      expect(brideViewRes.data.length).toBe(1);
      expect(brideViewRes.data[0].portal_token).toBe(portalToken);
    });

    it('Appointment insert: safely quenches legacy non-UUID customer ID to null and generates UUID PK', async () => {
      const apptId = generateEntityId();
      const locId = resolveLocationId('pc-br');

      // Case A: Matching bride has a legacy non-UUID ID (e.g. 'C-3001')
      const legacyBride = { id: 'C-3001', name: 'Emma Carter' };
      const safeCustomerIdA = isUuid(legacyBride.id) ? legacyBride.id : null;
      expect(safeCustomerIdA).toBeNull(); // Quenched to null!

      // Case B: Matching bride has a valid UUID
      const uuidBrideId = generateEntityId();
      const uuidBride = { id: uuidBrideId, name: 'Claire Bennet' };
      const safeCustomerIdB = isUuid(uuidBride.id) ? uuidBride.id : null;
      expect(safeCustomerIdB).toBe(uuidBrideId);

      const payload = {
        id: apptId,
        business_id: DEMO_BUSINESS_ID,
        location_id: locId,
        location: 'pc-br',
        customer_id: safeCustomerIdA,
        customer: 'Emma Carter',
        type: 'First Bridal Consultation',
        date: '2027-05-10',
        time: '2:30 PM',
        start_at: '2027-05-10T14:30:00.000Z',
        end_at: '2027-05-10T16:00:00.000Z',
        stylist: 'Dana Robichaux',
        status: 'Confirmed',
        confirmation_status: 'Confirmed',
        intake_source: 'In-Person',
        looking_for: 'Mermaid silhouette',
        budget_cents: 350000,
        fee_paid: true,
      };

      expect(isUuid(payload.id)).toBe(true);
      expect(isUuid(payload.business_id)).toBe(true);
      expect(isUuid(payload.location_id)).toBe(true);
      expect(payload.customer_id).toBeNull(); // Must NOT be 'C-3001'

      const res = await demoDb.from('appointments').insert(payload);
      expect(res.error).toBeNull();

      const queryRes = await demoDb.from('appointments').select('*').eq('id', apptId);
      expect(queryRes.error).toBeNull();
      expect(queryRes.data.length).toBe(1);
      expect(queryRes.data[0].customer_id).toBeNull();
      expect(queryRes.data[0].customer).toBe('Emma Carter');
    });

    it('Invoice & Staged Payment Schedule insert: validates UUID relationships', async () => {
      const invId = generateEntityId();
      const payToken = generateEntityId();
      const locId = resolveLocationId('ido-br');

      const invoicePayload = {
        id: invId,
        business_id: DEMO_BUSINESS_ID,
        location_id: locId,
        location: 'ido-br',
        customer_id: null,
        customer: 'Sophia Taylor',
        description: 'Bespoke Veil & Accessories',
        amount_cents: 100000,
        paid_cents: 50000,
        due_date: '2027-06-01',
        status: 'Partial',
        pay_token: payToken,
      };

      expect(isUuid(invoicePayload.id)).toBe(true);
      expect(isUuid(invoicePayload.pay_token)).toBe(true);

      const invRes = await demoDb.from('invoices').insert(invoicePayload);
      expect(invRes.error).toBeNull();

      // Payment schedules linked via invoice_id
      const schedules = [
        {
          id: generateEntityId(),
          business_id: DEMO_BUSINESS_ID,
          invoice_id: invId,
          stage_name: 'Deposit (50%)',
          amount_cents: 50000,
          due_date: '2027-06-01',
          paid_cents: 50000,
          status: 'Paid',
        },
        {
          id: generateEntityId(),
          business_id: DEMO_BUSINESS_ID,
          invoice_id: invId,
          stage_name: 'Final Balance (50%)',
          amount_cents: 50000,
          due_date: '2027-07-01',
          paid_cents: 0,
          status: 'Pending',
        },
      ];

      for (const s of schedules) {
        expect(isUuid(s.id)).toBe(true);
        expect(isUuid(s.business_id)).toBe(true);
        expect(isUuid(s.invoice_id)).toBe(true);
        const sRes = await demoDb.from('payment_schedules').insert(s);
        expect(sRes.error).toBeNull();
      }

      const querySchedules = await demoDb.from('payment_schedules').select('*').eq('invoice_id', invId);
      expect(querySchedules.error).toBeNull();
      expect(querySchedules.data.length).toBe(2);
    });

    it('Purchase Order insert & update: validates UUID primary key and location mapping', async () => {
      const poId = generateEntityId();
      const locId = resolveLocationId('pc-cov');

      const poPayload = {
        id: poId,
        business_id: DEMO_BUSINESS_ID,
        location_id: locId,
        location: 'pc-cov',
        vendor: 'Justin Alexander',
        items: '4x Style 88204 Ivory Size 10',
        amount_cents: 480000,
        ordered: '2027-01-10',
        expected_delivery: '2027-04-15',
        status: 'Ordered',
        assigned_staff: 'Dana Robichaux',
        assigned_customer: 'Emma Carter',
        notes: 'Priority order for autumn wedding',
      };

      expect(isUuid(poPayload.id)).toBe(true);
      expect(isUuid(poPayload.business_id)).toBe(true);
      expect(isUuid(poPayload.location_id)).toBe(true);

      const res = await demoDb.from('purchase_orders').insert(poPayload);
      expect(res.error).toBeNull();

      // Update purchase order
      const updateRes = await demoDb
        .from('purchase_orders')
        .update({ status: 'Delivered', notes: 'Received and inspected' })
        .eq('id', poId);
      expect(updateRes.error).toBeNull();

      const checkRes = await demoDb.from('purchase_orders').select('*').eq('id', poId);
      expect(checkRes.error).toBeNull();
      expect(checkRes.data[0].status).toBe('Delivered');
      expect(checkRes.data[0].notes).toBe('Received and inspected');
    });

    it('Gown insert & inventory views: verifies SKU generation, price/stock, and view aliasing', async () => {
      const gownId = generateEntityId();
      const locId = resolveLocationId('ido-br');
      const sku = `IDB-${gownId.slice(0, 8).toUpperCase()}`;

      const gownPayload = {
        id: gownId,
        business_id: DEMO_BUSINESS_ID,
        location_id: locId,
        location: 'ido-br',
        name: 'Aurelia',
        designer: 'Galia Lahav',
        style: 'GL-901',
        size: '8',
        color: 'Ivory/Blush',
        price_cents: 650000,
        stock: 1,
        status: 'Active',
        image: 'https://images.unsplash.com/sample.jpg',
        sku,
        cost_cents: 325000,
        msrp_cents: 650000,
        category: 'Bridal Gown',
        condition: 'New',
        vendor: 'Galia Lahav',
        reorder_point: 1,
        notes: 'Hand-beaded lace',
      };

      expect(isUuid(gownPayload.id)).toBe(true);
      expect(isUuid(gownPayload.business_id)).toBe(true);
      expect(isUuid(gownPayload.location_id)).toBe(true);

      const res = await demoDb.from('gowns').insert(gownPayload);
      expect(res.error).toBeNull();

      // Verify query through compatibility views (inventory_items points to gowns table)
      const itemsRes = await demoDb.from('inventory_items').select('*').eq('id', gownId);
      expect(itemsRes.error).toBeNull();
      expect(itemsRes.data.length).toBe(1);
      expect(itemsRes.data[0].designer).toBe('Galia Lahav');
      expect(itemsRes.data[0].price_cents).toBe(650000);

      const variantsRes = await demoDb.from('inventory_variants').select('*').eq('id', gownId);
      expect(variantsRes.error).toBeNull();
      expect(variantsRes.data.length).toBe(1);
      expect(variantsRes.data[0].sku).toBe(sku);
      expect(variantsRes.data[0].size).toBe('8');
    });

    it('Transfer lifecycle: from_location_id, to_location_id, gown_id quarantine, and receive resolution', async () => {
      const transferId = generateEntityId();
      const fromLocId = resolveLocationId('ido-br');
      const toLocId = resolveLocationId('pc-cov');

      // Test with non-UUID legacy gown ID ('G-2001') -> gown_id safely quenched to null
      const legacyGownId = 'G-2001';
      const safeGownId = isUuid(legacyGownId) ? legacyGownId : null;
      expect(safeGownId).toBeNull();

      const transferPayload = {
        id: transferId,
        business_id: DEMO_BUSINESS_ID,
        location_id: fromLocId,
        from_location_id: fromLocId,
        to_location_id: toLocId,
        from_location: 'ido-br',
        to_location: 'pc-cov',
        gown_id: safeGownId,
        gown_name: 'Katherine (Vera Wang)',
        qty: 1,
        status: 'In Transit',
        requested: '2027-02-15',
        received: null,
        note: 'Transfer for VIP bride fitting',
      };

      expect(isUuid(transferPayload.id)).toBe(true);
      expect(isUuid(transferPayload.business_id)).toBe(true);
      expect(isUuid(transferPayload.from_location_id)).toBe(true);
      expect(isUuid(transferPayload.to_location_id)).toBe(true);
      expect(transferPayload.gown_id).toBeNull();

      const res = await demoDb.from('transfers').insert(transferPayload);
      expect(res.error).toBeNull();

      // Receive transfer
      const updateRes = await demoDb
        .from('transfers')
        .update({ status: 'Received', received: '2027-02-16' })
        .eq('id', transferId);
      expect(updateRes.error).toBeNull();

      const checkRes = await demoDb.from('transfers').select('*').eq('id', transferId);
      expect(checkRes.error).toBeNull();
      expect(checkRes.data[0].status).toBe('Received');
      expect(checkRes.data[0].received).toBe('2027-02-16');
    });

    it('Messaging persistence: verifies customer_id quarantine, business_id, and body/content parity', async () => {
      const res = await sendAndLogMessage({
        business_id: DEMO_BUSINESS_ID,
        customer_id: undefined,
        customer: 'Emma Carter',
        channel: 'email',
        to: 'emma@example.com',
        subject: 'Fitting Confirmation',
        body: 'We look forward to seeing you at 2:00 PM.',
        kind: 'confirmation',
      });

      expect(res.ok).toBe(true);
      expect(res.error).toBeNull();

      const messagesRes = await demoDb.from('messages').select('*').eq('customer', 'Emma Carter');
      expect(messagesRes.error).toBeNull();
      const lastMsg = messagesRes.data[messagesRes.data.length - 1];
      expect(lastMsg).toBeDefined();
      expect(lastMsg.business_id).toBe(DEMO_BUSINESS_ID);
      expect(lastMsg.body).toBe('We look forward to seeing you at 2:00 PM.');
      expect(lastMsg.content).toBe('We look forward to seeing you at 2:00 PM.');
      expect(lastMsg.direction).toBe('outbound');
      expect(lastMsg.status).toBe('sent');
    });

    it('Support ticket & durable job persistence: verifies multi-tenant business_id and JSONB payload', async () => {
      const ticketId = generateEntityId();
      const ticketPayload = {
        id: ticketId,
        business_id: DEMO_BUSINESS_ID,
        organization_id: DEMO_BUSINESS_ID,
        tenant_id: DEMO_BUSINESS_ID,
        category: 'BILLING',
        priority: 'HIGH',
        severity: 'Critical',
        app_version: '2.4.0',
        subject: 'Stripe webhook latency',
        description: 'Invoices marked paid with 30s delay',
        status: 'OPEN',
      };

      const ticketRes = await demoDb.from('support_tickets').insert(ticketPayload);
      expect(ticketRes.error).toBeNull();

      const queryTicket = await demoDb.from('support_tickets').select('*').eq('id', ticketId);
      expect(queryTicket.error).toBeNull();
      expect(queryTicket.data[0].business_id).toBe(DEMO_BUSINESS_ID);
      expect(queryTicket.data[0].priority).toBe('HIGH');

      const jobId = generateEntityId();
      const jobPayload = {
        id: jobId,
        business_id: DEMO_BUSINESS_ID,
        queue_name: 'daily_digest',
        payload: { location_id: DEMO_LOCATION_MAP['ido-br'], mode: 'summary' },
        status: 'pending',
        attempts: 0,
        max_attempts: 5,
      };

      const jobRes = await demoDb.from('durable_jobs').insert(jobPayload);
      expect(jobRes.error).toBeNull();

      const queryJob = await demoDb.from('durable_jobs').select('*').eq('id', jobId);
      expect(queryJob.error).toBeNull();
      expect(queryJob.data[0].payload).toEqual({ location_id: DEMO_LOCATION_MAP['ido-br'], mode: 'summary' });
    });
  });
});
