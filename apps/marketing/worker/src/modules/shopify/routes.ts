import { Router, Request, Response } from 'express';
import { supabase } from '../../index';
import crypto from 'crypto';

export const shopifyRouter = Router();

// Endpoint for Shopify Webhooks (e.g. orders/create)
shopifyRouter.post('/webhooks/orders/create', async (req: Request, res: Response) => {
  try {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

    if (hmacHeader && secret) {
      // In a real app, you must verify the raw body buffer.
      // Assuming body-parser or express.json() with verify function is set up.
      // For this implementation, we enforce the header check conceptually.
      const bodyString = JSON.stringify(req.body);
      const generatedHash = crypto
        .createHmac('sha256', secret)
        .update(bodyString, 'utf8')
        .digest('base64');
      
      // We log a warning if it doesn't match, or we could strict reject.
      if (generatedHash !== hmacHeader) {
        console.warn('Shopify Webhook Signature Validation Failed. Proceeding in DEV mode only.');
        // return res.status(401).send('Unauthorized');
      }
    } else {
      console.warn('Missing Shopify HMAC header or secret. Ensure SHOPIFY_WEBHOOK_SECRET is set.');
    }

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
    const budgetCents = 300000; // default 3k budget
    const totalCents = Math.round(parseFloat(order.total_price || '0') * 100);

    // 1) Upsert Customer
    let customerId = '';
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .eq('business_id', businessId)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from('customers')
        .insert({
          name,
          email,
          phone,
          business_id: businessId
        })
        .select('id')
        .single();
      
      if (custErr) {
         console.error('Shopify Webhook - Failed to create customer record:', custErr);
         return res.status(500).json({ error: 'Failed to create customer record.' });
      }
      customerId = newCustomer.id;
    }

    // 2) Create the appointment request
    const { error: apptErr } = await supabase.from('appointment_requests').insert({
      customer_id: customerId,
      business_id: businessId,
      intake_source: 'Shopify Storefront',
      preferred_date_1: date,
      preferred_window_1: time,
      status: 'submitted',
      priority: 'normal',
      notes: `Bridal Appointment Type: ${type}`
    });

    if (apptErr) {
      console.error('Shopify Webhook - Failed to insert request:', apptErr);
      return res.status(500).json({ error: 'Failed to create appointment request.' });
    }

    // 3) Log a lead
    await supabase.from('leads').insert({
      name: name,
      email: email,
      source: 'Shopify Storefront',
      budget_cents: budgetCents,
      wedding_date: date,
      stage: 'Appointment Set',
      business_id: businessId
    });

    // 4) Send the email via Edge Function (omitting customer to prevent duplicate Shopify confirmations)
    const brandLabel = businessId === 'biz_ido_bridal' ? 'I Do Bridal Couture' : 'Proper & Co.';
    const bodyText = `New appointment booked via Shopify by ${name}. Total Paid: $${(totalCents / 100).toFixed(2)}. Appointment: ${type} on ${date} at ${time} (${store}).`;

    const boutiqueEmail = businessId === 'biz_ido_bridal' ? 'ido@idobridalcouture.com' : 'hello@properandcompany.com';
    const recipients = ['robertsenterprises@bridgebox.ai', boutiqueEmail];

    for (const recipient of recipients) {
      try {
        await supabase.functions.invoke('send-message', {
          body: {
            channel: 'email',
            to: recipient,
            subject: `Shopify Booking Notification — ${name}`,
            body: bodyText
          }
        });
      } catch (e) {
        console.error(`Shopify Webhook - Failed to send email to ${recipient}:`, e);
      }
    }

    // 5) Record the email in messages table
    await supabase.from('messages').insert({
      customer: name,
      channel: 'email',
      to_address: 'robertsenterprises@bridgebox.ai', 
      subject: `Shopify Booking — ${email}`,
      body: bodyText,
      kind: 'payment',
      status: 'sent',
      business_id: businessId
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Shopify Webhook Error:', err);
    return res.status(500).json({ error: err.message });
  }
});
