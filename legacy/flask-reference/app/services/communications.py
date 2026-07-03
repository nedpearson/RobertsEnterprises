import os
from database import get_db
from twilio.rest import Client
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def send_sms(to_phone, body):
    """
    Dispatches an SMS via Twilio. Contains graceful fallback to stdout if keys are missing/mocked.
    """
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
    from_phone = os.environ.get('TWILIO_PHONE_NUMBER')
    
    if not all([account_sid, auth_token, from_phone]) or account_sid.startswith('mock_'):
        print(f"[MOCK SMS] To: {to_phone} | Body: {body}")
        return True
        
    try:
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=body,
            from_=from_phone,
            to=to_phone
        )
        print(f"[TWILIO SMS] Sent Successfully. SID: {message.sid}")
        return True
    except Exception as e:
        print(f"[TWILIO ERROR] {e}")
        return False

def send_email(to_email, subject, body):
    """
    Dispatches an Email via SendGrid. Contains graceful fallback to stdout if keys are missing/mocked.
    """
    api_key = os.environ.get('SENDGRID_API_KEY')
    from_email = os.environ.get('SENDGRID_FROM_EMAIL')
    
    if not api_key or not from_email or api_key.startswith('mock_'):
        print(f"[MOCK EMAIL] To: {to_email} | Subject: {subject} | Body: {body}")
        return True
        
    try:
        sg = SendGridAPIClient(api_key)
        message = Mail(
            from_email=from_email,
            to_emails=to_email,
            subject=subject,
            plain_text_content=body
        )
        response = sg.send(message)
        print(f"[SENDGRID EMAIL] Sent Successfully. Status: {response.status_code}")
        return True
    except Exception as e:
        print(f"[SENDGRID ERROR] {e}")
        return False

def log_communication(company_id, customer_id, type_str, subject, message_body, status):
    """
    Writes the outbound blast to the PostgreSQL audit log so staff can verify it was sent.
    """
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO communication_logs (company_id, customer_id, type, subject, message_body, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (company_id, customer_id, type_str, subject, message_body, status))
        conn.commit()
    except Exception as e:
        print(f"Communications: Failed to log notification. Error: {e}")
        conn.rollback()

def send_arrival_notification(company_id, customer_id, product_name):
    """
    Triggers when a gown/accessory arrives on a Purchase Order.
    Dispatches *both* an SMS and an Email alert if the contact info exists.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT first_name, phone, email FROM customers WHERE id = %s", (customer_id,))
    customer = cursor.fetchone()
    
    if not customer:
        print("Communications: Customer not found. Notification aborted.")
        return False
        
    bride_name = customer['first_name']
    
    # Construct the payloads
    subject = f"Arrival Alert: {product_name}"
    sms_message = f"Exciting news, {bride_name}! Your {product_name} has officially arrived. Please call us to schedule your fitting/pickup."
    email_message = f"Hello {bride_name},\n\nWe are thrilled to inform you that your {product_name} has officially arrived at the boutique!\n\nPlease give us a call at your earliest convenience to get your next fitting or pickup scheduled on the calendar.\n\nWarmly,\nThe Boutique Team"
    
    success = False
    
    # Fire SMS Pipeline
    if customer['phone']:
        sms_sent = send_sms(customer['phone'], sms_message)
        log_communication(company_id, customer_id, 'SMS', subject, sms_message, 'Sent' if sms_sent else 'Failed')
        if sms_sent:
            success = True
        
    # Fire Email Pipeline
    if customer['email']:
        email_sent = send_email(customer['email'], subject, email_message)
        log_communication(company_id, customer_id, 'Email', subject, email_message, 'Sent' if email_sent else 'Failed')
        if email_sent:
            success = True
        
    return success

def send_ready_for_pickup(company_id, customer_id, item_description):
    """
    Triggers when an Alteration ticket is moved to 'Ready for Pickup'.
    Dispatches SMS/Email to the bride.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT first_name, phone, email FROM customers WHERE id = %s", (customer_id,))
    customer = cursor.fetchone()
    
    if not customer:
        print("Communications: Customer not found. Notification aborted.")
        return False
        
    bride_name = customer['first_name']
    
    subject = f"Ready for Pickup: {item_description}"
    sms_message = f"Hi {bride_name}! Your alterations for {item_description} are officially complete and ready for pickup. Please call us to schedule a time."
    email_message = f"Hello {bride_name},\n\nWe are excited to let you know that your alterations for {item_description} are complete and it is ready for pickup.\n\nPlease give us a call at your earliest convenience to schedule a time to pick it up.\n\nWarmly,\nThe Boutique Team"
    
    success = False
    
    if customer['phone']:
        sms_sent = send_sms(customer['phone'], sms_message)
        log_communication(company_id, customer_id, 'SMS', subject, sms_message, 'Sent' if sms_sent else 'Failed')
        if sms_sent:
            success = True
        
    if customer['email']:
        email_sent = send_email(customer['email'], subject, email_message)
        log_communication(company_id, customer_id, 'Email', subject, email_message, 'Sent' if email_sent else 'Failed')
        if email_sent:
            success = True
        
    return success
