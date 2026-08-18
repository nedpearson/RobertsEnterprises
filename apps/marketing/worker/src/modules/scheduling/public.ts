import { Router } from 'express';
import { supabase } from '../../index';

export const publicSchedulingRouter = Router();

// Public endpoint to submit a booking
publicSchedulingRouter.post('/book', async (req, res) => {
  try {
    const { 
      name, email, phone, smsOptIn, weddingDate, store, type, 
      lookingFor, budgetCents, date, time, paymentIntentId, totalCents, brandLabel, surchargeCents, surchargePct 
    } = req.body;

    if (!name || !email || !store || !date || !time) {
      return res.status(400).json({ error: 'Missing required booking details' });
    }

    // Determine the business ID (Proper & Company vs I Do Bridal Couture) based on the location.
    const businessId = store.startsWith('ido') ? 'biz_ido_bridal' : 'biz_proper_co';
    const suffix = Date.now().toString().slice(-6);
    const apptId = `A-${suffix}`;

    // 1) Create the appointment request (Pending)
    const { error: apptErr } = await supabase.from('appointments').insert({
      id: apptId,
      customer: name.trim(),
      type,
      date,
      time,
      stylist: 'Unassigned',
      status: 'Pending',
      location: store,
      looking_for: lookingFor,
      budget_cents: budgetCents,
      fee_paid: true,
      business_id: businessId
    });

    if (apptErr) {
      console.error('Failed to insert appointment:', apptErr);
      return res.status(500).json({ error: 'Failed to create appointment.' });
    }

    // 2) Log a lead
    await supabase.from('leads').insert({
      id: `L-${suffix}`,
      name: name.trim(),
      email: email.trim(),
      source: 'Booking Page',
      budget_cents: budgetCents,
      wedding_date: weddingDate || date,
      stage: 'Appointment Set',
      business_id: businessId
    });

    // 3) Record the email notification to BridgeBox
    const feeLabel = '$75.00'; 
    const bodyText = `${(totalCents / 100).toFixed(2)} charged to ${brandLabel} (${feeLabel} booking fee${surchargeCents > 0 ? ` + ${(surchargeCents/100).toFixed(2)} ${surchargePct}% card fee` : ''}) for ${type} on ${date} at ${time} (${store}). Looking for: ${lookingFor}. Budget: ${budgetCents}. Stripe ref ${paymentIntentId}. Fee is credited toward her purchase.`;

    // Actually invoke the edge function to SEND the email
    const boutiqueEmail = businessId === 'biz_ido_bridal' ? 'ido@idobridalcouture.com' : 'hello@properandcompany.com';
    const recipients = ['robertsenterprises@bridgebox.ai', boutiqueEmail, email.trim()];

    for (const recipient of recipients) {
      try {
        await supabase.functions.invoke('send-message', {
          body: {
            channel: 'email',
            to: recipient,
            subject: `Booking Confirmation — ${apptId} (${email.trim()})`,
            body: bodyText
          }
        });
      } catch (e) {
        console.error(`Failed to send email to ${recipient}:`, e);
      }
    }

    await supabase.from('messages').insert({
      customer: name.trim(),
      channel: 'email',
      // Ensure the notification goes to BridgeBox per requirements
      to_address: 'robertsenterprises@bridgebox.ai', 
      subject: `Booking fee received — ${apptId} (${email.trim()})`,
      body: bodyText,
      kind: 'payment',
      status: 'sent',
      business_id: businessId
    });

    // 4) CRM Webhook (Best effort)
    try {
      fetch('https://famous.ai/api/crm/6a5d5dc9d84ad34d886e72c1/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          phone: phone?.trim() || undefined,
          sms_opt_in: smsOptIn === true,
          source: 'bride-booking-page',
          tags: ['bride', 'appointment-request', 'fee-paid', store],
        }),
      }).catch(() => {});
    } catch (e) {}

    res.json({ success: true, appointmentId: apptId, store, date, time, leadId: `L-${suffix}`, businessId });
  } catch (err: any) {
    console.error('Booking error:', err);
    res.status(500).json({ error: err.message });
  }
});
