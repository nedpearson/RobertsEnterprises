import { Router } from 'express';
import { supabase } from '../../index';
import twilio from 'twilio';

export const communicationsRouter = Router();

// Endpoint for sending outbound SMS
communicationsRouter.post('/send-sms', async (req, res) => {
  try {
    const { customerId, message, businessId } = req.body;
    
    if (!customerId || !message || !businessId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1) Verify smsOptIn
    const { data: customer, error: customerErr } = await supabase
      .from('customers')
      .select('phone, sms_opt_in')
      .eq('id', customerId)
      .single();

    if (customerErr || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!customer.sms_opt_in) {
      return res.status(403).json({ error: 'Customer has not opted in to SMS' });
    }

    if (!customer.phone) {
      return res.status(400).json({ error: 'Customer does not have a phone number' });
    }

    // Initialize Twilio (lazy)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioSid || !twilioAuth || !twilioFrom) {
      return res.status(500).json({ error: 'Twilio is not configured' });
    }

    const client = twilio(twilioSid, twilioAuth);

    // 2) Send via Twilio
    const twilioResponse = await client.messages.create({
      body: message,
      from: twilioFrom,
      to: customer.phone,
    });

    // 3) Log in messages table
    await supabase.from('messages').insert({
      business_id: businessId,
      customer_id: customerId,
      sender: 'Business',
      content: message,
      channel: 'sms',
      direction: 'outbound',
      status: 'sent',
      external_id: twilioResponse.sid
    });

    res.json({ success: true, messageId: twilioResponse.sid });
  } catch (err: any) {
    console.error('Send SMS error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Inbound webhook for Twilio
communicationsRouter.post('/twilio-webhook', async (req, res) => {
  try {
    // Twilio sends data as urlencoded by default, but express.urlencoded() is needed if it's form data.
    // Assuming express is configured to handle urlencoded or we parse req.body depending on Twilio config.
    const { From, To, Body, MessageSid } = req.body;

    if (!From || !Body) {
      return res.status(400).send('Bad Request');
    }

    // 1) Lookup customer by phone
    // We do a soft match by phone (assuming the DB formats match, or using LIKE)
    const { data: customers } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('phone', From)
      .limit(1);

    const customer = customers && customers.length > 0 ? customers[0] : null;
    
    // If we can't find the customer, we could log it or reject. We'll log it as an unassigned message if businessId can be deduced.
    // Actually, we can deduce businessId from the Twilio To number if we had a mapping.
    // For now, we'll try to use the customer's business_id.
    const businessId = customer?.business_id || 'b0000000-0000-0000-0000-000000000000'; // Fallback to demo/root if no customer match

    // 2) Insert inbound message
    await supabase.from('messages').insert({
      business_id: businessId,
      customer_id: customer?.id || null,
      sender: 'Customer',
      content: Body,
      channel: 'sms',
      direction: 'inbound',
      status: 'received',
      external_id: MessageSid
    });

    // Twilio requires TwiML response
    res.type('text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (err: any) {
    console.error('Twilio Webhook error:', err);
    res.status(500).send('Internal Server Error');
  }
});
