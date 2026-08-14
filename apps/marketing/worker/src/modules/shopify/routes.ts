import { Router, Request, Response } from 'express';
import { supabase } from '../../index';
import crypto from 'crypto';

export const shopifyRouter = Router();

// Endpoint for Shopify Webhooks (e.g. orders/create)
shopifyRouter.post('/webhooks/orders/create', async (req: Request, res: Response) => {
  try {
    // Optionally verify HMAC signature here using X-Shopify-Hmac-Sha256
    // For now, we proceed to parse the payload
    const order = req.body;

    if (!order || !order.customer) {
      return res.status(200).send('Ignored: Not an order with a customer');
    }

    const email = order.email || order.customer.email;
    const phone = order.phone || order.customer.phone;
    const name = `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Shopify Customer';
    
    // Attempt to extract appointment details from line item properties
    // Expecting properties like: Date, Time, Store/Location
    let date = new Date().toISOString().split('T')[0];
    let time = '12:00 PM';
    let store = 'ido-br';
    let type = 'Bridal Appointment';

    if (order.line_items && order.line_items.length > 0) {
      const item = order.line_items[0];
      type = item.title || type;
      if (item.properties) {
        for (const prop of item.properties) {
          const propName = (prop.name || '').toLowerCase();
          if (propName.includes('date')) date = prop.value;
          if (propName.includes('time')) time = prop.value;
          if (propName.includes('store') || propName.includes('location')) store = prop.value;
        }
      }
    }

    const businessId = store.startsWith('ido') ? 'biz_ido_bridal' : 'biz_proper_co';
    const suffix = Date.now().toString().slice(-6);
    const apptId = `A-${suffix}`;
    const budgetCents = 300000; // default 3k budget
    const totalCents = Math.round(parseFloat(order.total_price || '0') * 100);

    // 1) Create the appointment request (Pending)
    const { error: apptErr } = await supabase.from('appointments').insert({
      id: apptId,
      customer: name,
      type,
      date,
      time,
      stylist: 'Unassigned',
      status: 'Pending',
      location: store,
      looking_for: 'Shopify Booking',
      budget_cents: budgetCents,
      fee_paid: totalCents > 0,
      business_id: businessId
    });

    if (apptErr) {
      console.error('Shopify Webhook - Failed to insert appointment:', apptErr);
      return res.status(500).json({ error: 'Failed to create appointment.' });
    }

    // 2) Log a lead
    await supabase.from('leads').insert({
      id: `L-${suffix}`,
      name: name,
      email: email,
      source: 'Shopify Storefront',
      budget_cents: budgetCents,
      wedding_date: date,
      stage: 'Appointment Set',
      business_id: businessId
    });

    // 3) Send the email via Edge Function
    const brandLabel = businessId === 'biz_ido_bridal' ? 'I Do Bridal Couture' : 'Proper & Co.';
    const bodyText = `New appointment booked via Shopify by ${name}. Total Paid: $${(totalCents / 100).toFixed(2)}. Appointment: ${type} on ${date} at ${time} (${store}).`;

    const boutiqueEmail = businessId === 'biz_ido_bridal' ? 'ido@idobridalcouture.com' : 'hello@properandcompany.com';
    const recipients = ['robertsenterprises@bridgebox.ai', boutiqueEmail, email.trim()];

    for (const recipient of recipients) {
      try {
        await supabase.functions.invoke('send-message', {
          body: {
            channel: 'email',
            to: recipient,
            subject: `Shopify Booking Confirmation — ${apptId}`,
            body: bodyText
          }
        });
      } catch (e) {
        console.error(`Shopify Webhook - Failed to send email to ${recipient}:`, e);
      }
    }

    // 4) Record the email in messages table
    await supabase.from('messages').insert({
      customer: name,
      channel: 'email',
      to_address: 'robertsenterprises@bridgebox.ai', 
      subject: `Shopify Booking — ${apptId} (${email})`,
      body: bodyText,
      kind: 'payment',
      status: 'sent',
      business_id: businessId
    });

    return res.status(200).json({ success: true, appointmentId: apptId });
  } catch (err: any) {
    console.error('Shopify Webhook Error:', err);
    return res.status(500).json({ error: err.message });
  }
});
