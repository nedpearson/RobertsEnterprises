import { describe, it } from 'node:test';
import assert from 'node:assert';
import { supabase as supabaseAdmin } from '../../../shared';

describe('VowOS End-to-End Scheduling Confirmation', () => {
  it('Post Note: permits booking_request_notes before appointment conversion and prevents null appointment_id crash', async () => {
    // 1. Get a business
    const { data: biz } = await supabaseAdmin.from('businesses').select('id').limit(1).single();
    assert.ok(biz, 'Business required');
    
    // 2. Create a booking request
    const { data: req } = await supabaseAdmin.from('appointment_requests').insert({
      business_id: biz!.id,
      status: 'NEW'
    }).select().single();
    assert.ok(req, 'Request created');

    // 3. Post a note using the generic internal notes or booking_request_notes
    const { data: note, error } = await supabaseAdmin.from('booking_request_notes').insert({
      booking_request_id: req!.id,
      organization_id: biz!.id,
      content: 'E2E Test Note'
    }).select().single();
    
    assert.ifError(error);
    assert.ok(note.id, 'Note persisted successfully');
    
    // Clean up
    await supabaseAdmin.from('appointment_requests').delete().eq('id', req!.id);
  });

  it('Confirm: creates exactly one appointment and updates request status', async () => {
    const { data: biz } = await supabaseAdmin.from('businesses').select('id').limit(1).single();
    
    const { data: customer } = await supabaseAdmin.from('customers').insert({
      business_id: biz!.id,
      email: 'confirm-e2e@example.com'
    }).select().single();
    
    const { data: req } = await supabaseAdmin.from('appointment_requests').insert({
      business_id: biz!.id,
      customer_id: customer!.id,
      status: 'NEW'
    }).select().single();

    // Call confirm_booking_request RPC
    const { data: newApptId, error } = await supabaseAdmin.rpc('confirm_booking_request', {
      p_booking_request_id: req!.id,
      p_business_id: biz!.id,
      p_location_id: null,
      p_stylist_id: null,
      p_appointment_start: new Date().toISOString(),
      p_appointment_duration: 90,
      p_send_email: false,
      p_send_sms: false,
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    assert.ifError(error);
    assert.ok(newApptId, 'Returned an appointment ID');

    // Verify it created exactly 1 appointment
    const { data: appts } = await supabaseAdmin.from('appointments').select('*').eq('request_id', req!.id);
    assert.strictEqual(appts?.length, 1, 'Exactly one appointment created');
    
    // Verify request status converted
    const { data: reqCheck } = await supabaseAdmin.from('appointment_requests').select('status').eq('id', req!.id).single();
    assert.strictEqual(reqCheck?.status, 'CONFIRMED', 'Request status updated to CONFIRMED');
    
    // Cleanup
    await supabaseAdmin.from('appointments').delete().eq('id', newApptId);
    await supabaseAdmin.from('appointment_requests').delete().eq('id', req!.id);
    await supabaseAdmin.from('customers').delete().eq('id', customer!.id);
  });
});
