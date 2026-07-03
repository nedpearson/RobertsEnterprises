import os
import json
import traceback
from database import get_db
from openai import OpenAI

class AIOperationalOrchestrator:
    def __init__(self):
        self.api_key = os.environ.get('OPENAI_API_KEY')
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None

    def _resolve_context_id(self, company_id, entity_type, spoken_identifier):
        if not spoken_identifier:
            return None
        
        db = get_db()
        cursor = db.cursor()
        
        # very simple resolution to find a matching customer
        if entity_type == 'customer':
            cursor.execute("SELECT id FROM customers WHERE company_id=%s AND (first_name || ' ' || last_name) ILIKE %s LIMIT 1", (company_id, f"%{spoken_identifier}%"))
            row = cursor.fetchone()
            if row:
                return row['id']
            
        elif entity_type == 'po':
            cursor.execute("SELECT id FROM purchase_orders WHERE vendor_id IN (SELECT id FROM vendors WHERE company_id=%s) AND id::text = %s LIMIT 1", (company_id, str(spoken_identifier).replace('#', '').strip()))
            row = cursor.fetchone()
            if row:
                return row['id']
        elif entity_type == 'vendor':
            cursor.execute("SELECT id FROM vendors WHERE company_id=%s AND name ILIKE %s LIMIT 1", (company_id, f"%{spoken_identifier}%"))
            row = cursor.fetchone()
            if row:
                return row['id']
            
        return None

    def process_voice_command(self, company_id, current_user_id, current_page_context, transcript):
        """
        Stage 1: Intent Extraction and Entity Resolution.
        Never mutates the DB here directly. Returns structured action plan.
        """
        if not self.client:
            return {"status": "error", "message": "AI Orchestration layer is not configured (Missing OPENAI API key)."}
            
        from datetime import datetime
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id, name FROM services WHERE company_id = %s", (company_id,))
        services_list = cursor.fetchall()
        services_str = ", ".join([f"{s['name']} (ID: {s['id']})" for s in services_list])

        cursor.execute("SELECT id, first_name, last_name FROM users WHERE company_id = %s", (company_id,))
        staff_list = cursor.fetchall()
        staff_str = ", ".join([f"{s['first_name']} {s['last_name']} (ID: {s['id']})" for s in staff_list])

        system_prompt = f"""
        You are a routing agent for a bridal boutique ERP.
        Determine the user's intent from their transcript.
        
        Current Time: {now_str}
        Current Context: {current_page_context}
        Available Services: {services_str}
        Available Staff: {staff_str}
        
        Possible intents:
        - ADD_INTERNAL_TEAM_NOTE
        - BOOK_APPOINTMENT
        - RESCHEDULE_APPOINTMENT
        - CAPTURE_MEASUREMENTS
        - QUERY_DATABASE
        - INVENTORY_LOOKUP
        - UPDATE_ORDER_STATUS
        - TIME_CLOCK_ACTION
        - CREATE_REMINDER
        - NAVIGATE_PAGE
        - DRAFT_COMMUNICATION
        - CHECK_SCHEDULE
        - BROADCAST_MESSAGE
        - CREATE_ORDER
        - FETCH_KPI_DATA
        - GET_PAYROLL_SUMMARY
        - ADD_CUSTOMER
        - LOG_PAYMENT
        
        Extract these fields in JSON formatted exactly like:
        {{
            "intent": "ADD_INTERNAL_TEAM_NOTE",
            "target_entity_type": "customer", // or "po", "order", "vendor", "appointment", "product", "module"
            "spoken_target_identifier": "Jane Smith", // the name they said, or order number, or product keywords
            "parameters": {{
               "body": "The note text to save",
               "measurements": {{"bust": 36, "waist": 28, "hips": 39}}, // optional
               "question": "What is her balance due?", // for QUERY_DATABASE
               "appointment_details": {{
                   "service_id": 1, // extract matching service ID
                   "staff_id": 2, // extract matching staff ID if mentioned
                   "start_datetime": "YYYY-MM-DD HH:MM:00", // calculate from current time
                   "duration_minutes": 60 // default 60 or guess
               }}, // for BOOK_APPOINTMENT / RESCHEDULE_APPOINTMENT
               "inventory_query": "size 10 ivory veils", // string of search keywords for INVENTORY_LOOKUP
               "new_order_status": "Fulfilled", // Draft, Active, Fulfilled, Cancelled for UPDATE_ORDER_STATUS
               "action": "in", // "in" or "out" for TIME_CLOCK_ACTION
               "trigger_datetime": "YYYY-MM-DD HH:MM:00", // calculate from current time for CREATE_REMINDER
               "task_notes": "call Jane to confirm alterations", // description for CREATE_REMINDER
               "navigation_target": "point of sale", // if intent is NAVIGATE_PAGE, put the general area they want to go to
               "communication_type": "Email", // "Email" or "SMS" for DRAFT_COMMUNICATION
               "draft_body": "tell Jane her dress arrived", // instructions for DRAFT_COMMUNICATION
               "broadcast_message": "The boutique is closing in 10 minutes", // for BROADCAST_MESSAGE
               "schedule_date": "YYYY-MM-DD", // The specific date they are inquiring about for CHECK_SCHEDULE (typically today)
               "item_keywords": "sweetheart ivory gown size 10", // for CREATE_ORDER, what did they say they want to buy?
               "time_period": "today", // 'today', 'this week', 'this month' for analytics and payroll
               "new_customer": {{
                   "first_name": "Emma",
                   "last_name": "Stone",
                   "email": "emma@example.com",
                   "phone": "555-1234",
                   "wedding_date": "YYYY-MM-DD"
               }}, // for ADD_CUSTOMER
               "payment_amount": 500.00, // for LOG_PAYMENT
               "payment_method": "Credit Card" // for LOG_PAYMENT (Cash, Credit Card, Check)
            }}
        }}
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                response_format={ "type": "json_object" },
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": transcript}
                ],
                temperature=0.0
            )
            
            structured_data = json.loads(response.choices[0].message.content)
            
            # Resolve the spoken entity to an actual database ID if possible
            target_id = None
            if "spoken_target_identifier" in structured_data and structured_data["spoken_target_identifier"]:
                target_id = self._resolve_context_id(
                    company_id, 
                    structured_data.get("target_entity_type"), 
                    structured_data["spoken_target_identifier"]
                )
                
            # If we don't know the exact target_id but we have a page_context ID, let's use the page context
            if target_id is None and 'id' in current_page_context:
                target_id = current_page_context['id']
                structured_data['target_entity_type'] = current_page_context.get('type')
                
            structured_data['resolved_target_id'] = target_id
            
            return {
                "status": "success",
                "action_plan": structured_data
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

    def execute_action_plan(self, company_id, current_user_id, action_plan):
        """
        Stage 2: Deterministic execution of the action plan.
        """
        intent = action_plan.get('intent')
        target_type = action_plan.get('target_entity_type')
        target_id = action_plan.get('resolved_target_id')
        params = action_plan.get('parameters', {})
        
        db = get_db()
        cursor = db.cursor()
        
        # Log the AI Execution (Audit log)
        cursor.execute('''
            INSERT INTO ai_audit_logs 
            (company_id, actor_id, parsed_intent, extracted_entities_json, target_object_type, target_object_id, execution_outcome)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (company_id, current_user_id, intent, json.dumps(params), target_type, target_id, 'PENDING'))
        audit_id = cursor.fetchone()['id'] if cursor.description else None
        
        response = {"message": "Action not supported yet.", "status": "failed"}
        
        try:
            if intent == 'ADD_INTERNAL_TEAM_NOTE':
                from services.team_communication import CommunicationService
                if not target_id:
                    raise ValueError(f"Could not resolve the target {target_type} to save this note against.")
                    
                msg_id, message_data = CommunicationService.post_internal_message(
                    company_id=company_id,
                    author_id=current_user_id,
                    body=params.get('body'),
                    entity_type=target_type,
                    entity_id=target_id,
                    transcript_source="VOICE_AI",
                    return_payload=True
                )
                
                from flask import current_app
                try:
                    socketio = current_app.extensions['socketio']
                    socketio.emit(f"new_message_{company_id}_{target_type}_{target_id}", message_data)
                except Exception as ws_e:
                    current_app.logger.warning(f"Failed to emit websocket event: {ws_e}")
                    
                response = {"status": "success", "message": f"Successfully attached note to {target_type} #{target_id}", "msg_id": msg_id}
                
            elif intent == 'CAPTURE_MEASUREMENTS':
                if not target_id or target_type != 'customer':
                    raise ValueError("Measurements must be attached to a specific customer profile.")
                    
                meas = params.get('measurements', {})
                cursor.execute('''
                    INSERT INTO customer_measurements (customer_id, bust, waist, hips, hollow_to_hem) 
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT(customer_id) DO UPDATE SET
                    bust = EXCLUDED.bust,
                    waist = EXCLUDED.waist,
                    hips = EXCLUDED.hips,
                    hollow_to_hem = EXCLUDED.hollow_to_hem,
                    updated_at = CURRENT_TIMESTAMP
                ''', (target_id, meas.get('bust', 0), meas.get('waist', 0), meas.get('hips', 0), meas.get('hollow_to_hem', 0)))
                response = {"status": "success", "message": "Measurements updated successfully."}
                
            elif intent in ['BOOK_APPOINTMENT', 'RESCHEDULE_APPOINTMENT']:
                if not target_id or target_type != 'customer':
                    raise ValueError("You must specify a customer to book or reschedule for.")
                    
                apt_details = params.get('appointment_details', {})
                service_id = apt_details.get('service_id')
                staff_id = apt_details.get('staff_id')
                start_dt = apt_details.get('start_datetime')
                dur = apt_details.get('duration_minutes', 60)
                
                if not start_dt or not service_id:
                    raise ValueError("Could not determine service or start time.")
                    
                from datetime import datetime, timedelta
                start_obj = datetime.strptime(start_dt, "%Y-%m-%d %H:%M:%S")
                end_obj = start_obj + timedelta(minutes=dur)
                
                # Fetch location from execution scope or fallback to 0
                loc_id = 0
                
                if intent == 'BOOK_APPOINTMENT':
                    cursor.execute('''
                        INSERT INTO appointments (location_id, customer_id, service_id, assigned_staff_id, start_at, end_at)
                        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
                    ''', (loc_id, target_id, service_id, staff_id, start_dt, end_obj.strftime("%Y-%m-%d %H:%M:%S")))
                    response = {"status": "success", "message": f"Appointment booked successfully for {start_dt}."}
                else:
                    # Find upcoming appointment to reschedule
                    cursor.execute("SELECT id FROM appointments WHERE customer_id = %s ORDER BY start_at DESC LIMIT 1", (target_id,))
                    apt_row = cursor.fetchone()
                    if not apt_row:
                        raise ValueError("No existing appointment found to reschedule.")
                    
                    cursor.execute('''
                        UPDATE appointments 
                        SET start_at = %s, end_at = %s, service_id = %s, assigned_staff_id = %s
                        WHERE id = %s
                    ''', (start_dt, end_obj.strftime("%Y-%m-%d %H:%M:%S"), service_id, staff_id, apt_row['id']))
                    response = {"status": "success", "message": f"Appointment rescheduled successfully to {start_dt}."}

            elif intent == 'QUERY_DATABASE':
                if not target_id:
                    raise ValueError(f"Could not resolve the target {target_type} to query.")
                    
                context_data = {}
                if target_type == 'customer':
                    cursor.execute("SELECT first_name, last_name, email, phone, wedding_date, notes FROM customers WHERE id = %s AND company_id = %s", (target_id, company_id))
                    cust = dict(cursor.fetchone() or {})
                    
                    cursor.execute("""
                        SELECT subtotal, tax, total, status 
                        FROM orders 
                        WHERE customer_id = %s AND company_id = %s
                    """, (target_id, company_id))
                    orders = cursor.fetchall()
                    
                    cursor.execute("""
                        SELECT sum(amount) as total_paid
                        FROM payment_ledger 
                        WHERE customer_id = %s
                    """, (target_id,))
                    paid_row = cursor.fetchone()
                    total_paid = float(paid_row['total_paid'] or 0) if paid_row else 0.0
                    
                    total_billed = sum(float(o['total'] or 0) for o in orders)
                    
                    context_data = {
                        "customer_profile": cust,
                        "orders": [dict(o) for o in orders],
                        "financial_summary": {
                            "total_billed": total_billed,
                            "total_paid": total_paid,
                            "balance_due": total_billed - total_paid
                        }
                    }
                elif target_type == 'vendor':
                    cursor.execute("SELECT name, contact_name, lead_time_weeks, notes FROM vendors WHERE id = %s AND company_id = %s", (target_id, company_id))
                    context_data["vendor"] = dict(cursor.fetchone() or {})
                elif target_type == 'po':
                    cursor.execute("SELECT status, expected_delivery, total_cost, notes FROM purchase_orders WHERE id = %s AND vendor_id IN (SELECT id FROM vendors WHERE company_id = %s)", (target_id, company_id))
                    context_data["purchase_order"] = dict(cursor.fetchone() or {})
                
                if not context_data:
                    context_data = {"error": "No meaningful data found for this entity."}
                    
                sys_msg = "You are a bridal boutique assistant. Use the JSON data provided to answer the user's question concisely in 1-2 sentences. Do not use markdown."
                ans_resp = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": sys_msg},
                        {"role": "user", "content": f"Question: {params.get('question')}\nData: {json.dumps(context_data, default=str)}"}
                    ],
                    temperature=0.0
                )
                answer = ans_resp.choices[0].message.content
                response = {"status": "success", "message": answer}
                
            elif intent == 'UPDATE_ORDER_STATUS':
                new_status = params.get('new_order_status')
                if not new_status or new_status not in ['Draft', 'Active', 'Fulfilled', 'Cancelled']:
                    raise ValueError(f"Invalid or missing order status: {new_status}")
                    
                # The target_id might represent the order number
                order_id_to_update = target_id
                
                # If target_id resolves to a customer because they said "Jane's order", infer their active order
                if target_type == 'customer':
                    cursor.execute("SELECT id FROM orders WHERE customer_id = %s AND company_id = %s ORDER BY created_at DESC LIMIT 1", (target_id, company_id))
                    ord_row = cursor.fetchone()
                    if not ord_row:
                        raise ValueError("Could not find a recent order for this customer.")
                    order_id_to_update = ord_row['id']
                    
                # Actually update the status
                cursor.execute("UPDATE orders SET status = %s WHERE id = %s AND company_id = %s", (new_status, order_id_to_update, company_id))
                response = {"status": "success", "message": f"Successfully marked Order #{order_id_to_update} as {new_status}."}
                
            elif intent == 'INVENTORY_LOOKUP':
                search_query = params.get('inventory_query', '').replace('%', '')
                search_terms = search_query.split()
                
                query_parts = []
                query_args = []
                for term in search_terms:
                    query_parts.append("(p.name ILIKE %s OR p.brand ILIKE %s OR pv.size ILIKE %s OR pv.color ILIKE %s)")
                    for _ in range(4):
                        query_args.append(f"%{term}%")
                    
                where_clause = " AND ".join(query_parts) if query_parts else "1=1"
                
                cursor.execute(f"""
                    SELECT p.brand, p.name, pv.size, pv.color, pv.on_hand_qty, p.price
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE v.company_id = %s AND {where_clause}
                    LIMIT 5
                """, [company_id] + query_args)
                
                inv_results = cursor.fetchall()
                if not inv_results:
                    response = {"status": "success", "message": "I could not find any stock matching that description."}
                else:
                    context_data = {"inventory_hits": [dict(r) for r in inv_results]}
                    sys_msg = "You are a bridal boutique assistant. Summarize the inventory lookup results given in JSON into 1-2 natural spoken sentences. Do not use markdown."
                    ans_resp = self.client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": sys_msg},
                            {"role": "user", "content": f"Query: {search_query}\nData: {json.dumps(context_data, default=str)}"}
                        ],
                        temperature=0.0
                    )
                    response = {"status": "success", "message": ans_resp.choices[0].message.content}
                
            elif intent == 'TIME_CLOCK_ACTION':
                action = params.get('action') # 'in' or 'out'
                if action == 'in':
                    # Check if already clocked in
                    cursor.execute("SELECT id FROM time_entries WHERE user_id = %s AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1", (current_user_id,))
                    if cursor.fetchone():
                        response = {"status": "success", "message": "You are already clocked in."}
                    else:
                        cursor.execute("INSERT INTO time_entries (user_id, location_id, clock_in) VALUES (%s, %s, CURRENT_TIMESTAMP)", (current_user_id, 0))
                        response = {"status": "success", "message": "You have been successfully clocked in."}
                elif action == 'out':
                    cursor.execute("SELECT id, clock_in FROM time_entries WHERE user_id = %s AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1", (current_user_id,))
                    entry = cursor.fetchone()
                    if not entry:
                        response = {"status": "success", "message": "You are not currently clocked in."}
                    else:
                        cursor.execute("UPDATE time_entries SET clock_out = CURRENT_TIMESTAMP WHERE id = %s", (entry['id'],))
                        
                        # Use EXTRACT EPOCH for Postgres total hours calculation
                        cursor.execute("UPDATE time_entries SET total_hours = EXTRACT(EPOCH FROM (clock_out - clock_in))/3600.0 WHERE id = %s", (entry['id'],))
                        response = {"status": "success", "message": "You have been successfully clocked out."}
                else:
                    raise ValueError(f"Invalid clock action: {action}")
                    
            elif intent == 'CREATE_REMINDER':
                trigger_dt = params.get('trigger_datetime')
                task_notes = params.get('task_notes', 'Reminder')
                
                if not trigger_dt:
                    raise ValueError("Could not determine when to trigger this reminder.")
                    
                target_entity_id = target_id if target_id else 0
                
                cursor.execute('''
                    INSERT INTO reminders (type, reference_id, trigger_at, status) 
                    VALUES (%s, %s, %s, 'Pending') RETURNING id
                ''', ('Task', target_entity_id, trigger_dt))
                rem_id = cursor.fetchone()['id']
                
                # Tie it to the notification queue for the current staff member
                payload_data = json.dumps({"note": task_notes})
                cursor.execute('''
                    INSERT INTO notification_jobs (reminder_id, channel, recipient, payload)
                    VALUES (%s, 'In-App', %s, %s)
                ''', (rem_id, str(current_user_id), payload_data))
                
                response = {"status": "success", "message": f"Reminder created for {trigger_dt}."}
                
            elif intent == 'NAVIGATE_PAGE':
                nav_target_raw = params.get('navigation_target', '').lower()
                redirect_url = '/'
                
                # Directly route to entity profile if specified
                if target_type == 'customer' and target_id:
                    redirect_url = f"/customers/{target_id}"
                elif target_type == 'order' and target_id:
                    redirect_url = f"/orders/{target_id}"
                elif target_type == 'vendor' and target_id:
                    redirect_url = f"/purchasing/vendors/{target_id}"
                elif target_type == 'po' and target_id:
                    redirect_url = f"/purchasing/po/{target_id}"
                else:
                    # General module routing
                    if 'schedule' in nav_target_raw or 'calendar' in nav_target_raw or 'appointment' in nav_target_raw:
                        redirect_url = "/appointments/"
                    elif 'inventory' in nav_target_raw or 'stock' in nav_target_raw or 'product' in nav_target_raw:
                        redirect_url = "/inventory/directory"
                    elif 'customer' in nav_target_raw or 'client' in nav_target_raw or 'bride' in nav_target_raw:
                        redirect_url = "/customers/"
                    elif 'order' in nav_target_raw or 'point of sale' in nav_target_raw or 'pos' in nav_target_raw or 'sale' in nav_target_raw or 'checkout' in nav_target_raw:
                        redirect_url = "/orders/"
                    elif 'report' in nav_target_raw or 'dashboard' in nav_target_raw or 'analytics' in nav_target_raw:
                        redirect_url = "/reports/"
                    elif 'setting' in nav_target_raw or 'config' in nav_target_raw:
                        redirect_url = "/settings/"
                    elif 'staff' in nav_target_raw or 'employee' in nav_target_raw or 'payroll' in nav_target_raw or 'time' in nav_target_raw:
                        redirect_url = "/staff/"
                        
                response = {"status": "success", "message": "Routing you there now.", "redirect_url": redirect_url}
                
            elif intent == 'DRAFT_COMMUNICATION':
                if not target_id or target_type != 'customer':
                    raise ValueError("You must specify a customer to draft a communication for.")
                    
                comm_type = params.get('communication_type', 'Email')
                draft_instr = params.get('draft_body', '')
                
                cursor.execute("SELECT first_name, last_name FROM customers WHERE id = %s AND company_id = %s", (target_id, company_id))
                cust = cursor.fetchone()
                if not cust:
                    raise ValueError("Customer not found.")
                    
                sys_msg = f"Write a professional, warm {comm_type} from a bridal boutique to {cust['first_name']} {cust['last_name']} about: {draft_instr}. Keep it concise and formatted beautifully. Do not include markdown."
                ans_resp = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "system", "content": sys_msg}],
                    temperature=0.7
                )
                final_body = ans_resp.choices[0].message.content.strip()
                
                subj = "Update regarding your Bridal Appointment" if comm_type == 'Email' else 'SMS Update'
                
                cursor.execute('''
                    INSERT INTO communication_logs (company_id, customer_id, type, subject, message_body, status)
                    VALUES (%s, %s, %s, %s, %s, 'Draft')
                ''', (company_id, target_id, comm_type, subj, final_body))
                
                response = {"status": "success", "message": f"I have drafted the {comm_type} for {cust['first_name']}."}
                
                response = {"status": "success", "message": f"I have drafted the {comm_type} for {cust['first_name']}."}
                
            elif intent == 'BROADCAST_MESSAGE':
                msg = params.get('broadcast_message', '')
                if not msg:
                    raise ValueError("Empty broadcast message.")
                
                cursor.execute("SELECT first_name, last_name FROM users WHERE id = %s", (current_user_id,))
                usr = cursor.fetchone()
                sender = f"{usr['first_name']} {usr['last_name']}" if usr else "Operations"
                
                from flask import current_app
                socketio = current_app.extensions.get('socketio')
                if socketio:
                    socketio.emit(f'global_broadcast_{company_id}', {
                        'message': msg,
                        'sender': sender
                    })
                    response = {"status": "success", "message": "Message broadcasted to all active screens."}
                else:
                    raise ValueError("SocketIO not running.")
                    
            elif intent == 'CHECK_SCHEDULE':
                chk_date = params.get('schedule_date')
                if not chk_date:
                    from datetime import datetime
                    chk_date = datetime.now().strftime("%Y-%m-%d")
                    
                cursor.execute('''
                    SELECT a.start_at, a.end_at, s.name as service_name, c.first_name, c.last_name
                    FROM appointments a
                    JOIN services s ON a.service_id = s.id
                    LEFT JOIN customers c ON a.customer_id = c.id
                    WHERE a.assigned_staff_id = %s AND a.start_at::date = %s
                    ORDER BY a.start_at ASC
                ''', (current_user_id, chk_date))
                
                appts = cursor.fetchall()
                if not appts:
                    response = {"status": "success", "message": f"You have no scheduled appointments for {chk_date}."}
                else:
                    context_data = {"appointments": [dict(r) for r in appts], "date": chk_date}
                    sys_msg = "You are a personal assistant. Review the user's appointments and summarize them in 2 or 3 natural spoken sentences. Highlight who they are meeting and when. Do not use markdown."
                    ans_resp = self.client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[{"role": "system", "content": sys_msg}, {"role": "user", "content": json.dumps(context_data, default=str)}],
                        temperature=0.0
                    )
                    response = {"status": "success", "message": ans_resp.choices[0].message.content}
                
            elif intent == 'CREATE_ORDER':
                if not target_id or target_type != 'customer':
                    raise ValueError("You must specify a customer to create an order for.")
                    
                keywords = params.get('item_keywords', '')
                if not keywords:
                    raise ValueError("I need to know what product they want to buy.")
                
                # Intelligent product matching based on keywords
                search_terms = keywords.split()
                query_parts = []
                query_args = []
                for term in search_terms:
                    query_parts.append("(p.name ILIKE %s OR p.brand ILIKE %s OR pv.size ILIKE %s OR pv.color ILIKE %s)")
                    for _ in range(4):
                        query_args.append(f"%{term}%")
                    
                where_clause = " AND ".join(query_parts) if query_parts else "1=1"
                
                cursor.execute(f"""
                    SELECT pv.id as variant_id, p.price, p.name, pv.size, pv.color
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE v.company_id = %s AND {where_clause}
                    LIMIT 1
                """, [company_id] + query_args)
                
                prod = cursor.fetchone()
                if not prod:
                    raise ValueError("Could not find a product matching that description in the inventory.")
                
                # Fetch customer wedding date for snapshotting
                cursor.execute("SELECT wedding_date FROM customers WHERE id = %s", (target_id,))
                cust = cursor.fetchone()
                wed_dt = cust['wedding_date'] if cust else None
                
                subtotal = float(prod['price'])
                tax = subtotal * 0.08  # Default 8% tax assumption
                total = subtotal + tax
                
                # 1. Create Order Master Record
                cursor.execute('''
                    INSERT INTO orders (company_id, location_id, customer_id, status, subtotal, tax, total, wedding_date_snapshot, sold_by_id)
                    VALUES (%s, 0, %s, 'Draft', %s, %s, %s, %s, %s) RETURNING id
                ''', (company_id, target_id, subtotal, tax, total, wed_dt, current_user_id))
                
                new_ord_id = cursor.fetchone()['id']
                
                # 2. Attach Line Item
                cursor.execute('''
                    INSERT INTO order_items (order_id, product_variant_id, quantity, unit_price, sale_type)
                    VALUES (%s, %s, 1, %s, 'Off-the-Rack')
                ''', (new_ord_id, prod['variant_id'], prod['price']))
                
                response = {
                    "status": "success", 
                    "message": f"Successfully created a Draft Order for {prod['name']}. Bringing it up now.",
                    "redirect_url": f"/orders/{new_ord_id}"
                }
                
            elif intent == 'FETCH_KPI_DATA':
                period = params.get('time_period', 'today').lower()
                from datetime import datetime, timedelta
                
                # Default to today
                start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                if 'week' in period:
                    start_date = start_date - timedelta(days=start_date.weekday())
                elif 'month' in period:
                    start_date = start_date.replace(day=1)
                    
                cursor.execute("""
                    SELECT 
                        COALESCE(SUM(total), 0) as total_sales,
                        COUNT(id) as total_orders
                    FROM orders
                    WHERE company_id = %s AND created_at >= %s
                """, (company_id, start_date))
                sales_data = cursor.fetchone()
                
                cursor.execute("""
                    SELECT COUNT(id) as appts
                    FROM appointments
                    WHERE start_at >= %s AND start_at < %s
                """, (start_date, start_date + timedelta(days=1 if 'today' in period else 30)))
                appt_data = cursor.fetchone()
                
                sys_msg = f"You are a sales manager. Summarize the boutique's performance for {period} naturally based on this data: Sales: ${sales_data['total_sales']:.2f} across {sales_data['total_orders']} orders. Appointments: {appt_data['appts']}."
                ans_resp = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "system", "content": sys_msg}],
                    temperature=0.0
                )
                response = {
                    "status": "success", 
                    "message": ans_resp.choices[0].message.content,
                    "redirect_url": "/reports/" # take them to analytics view seamlessly
                }
                
            elif intent == 'GET_PAYROLL_SUMMARY':
                period = params.get('time_period', 'this week').lower()
                from datetime import datetime, timedelta
                
                start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                if 'today' in period:
                    pass
                elif 'month' in period:
                    start_date = start_date.replace(day=1)
                else: # this week
                    start_date = start_date - timedelta(days=start_date.weekday())
                    
                cursor.execute("""
                    SELECT COALESCE(SUM(total_hours), 0) as hours
                    FROM time_entries 
                    WHERE user_id = %s AND clock_in >= %s
                """, (current_user_id, start_date))
                time_data = cursor.fetchone()
                
                cursor.execute("""
                    SELECT COALESCE(SUM(amount), 0) as commission
                    FROM commissions
                    WHERE user_id = %s AND earned_at >= %s AND status != 'Void'
                """, (current_user_id, start_date))
                comm_data = cursor.fetchone()
                
                hours = float(time_data['hours'])
                comm = float(comm_data['commission'])
                
                sys_msg = f"You are an HR assistant. Give a warm, natural summary for the user's payroll data for {period}. They worked {hours:.2f} hours and earned ${comm:.2f} in commission. Keep it brief."
                ans_resp = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "system", "content": sys_msg}],
                    temperature=0.0
                )
                response = {
                    "status": "success", 
                    "message": ans_resp.choices[0].message.content,
                    "redirect_url": "/payroll/timesheets"
                }

            elif intent == 'ADD_CUSTOMER':
                new_cust = params.get('new_customer', {})
                fname = new_cust.get('first_name')
                lname = new_cust.get('last_name')
                
                if not fname:
                    raise ValueError("First name is required to create a customer.")
                
                cursor.execute('''
                    INSERT INTO customers (company_id, location_id, first_name, last_name, email, phone, wedding_date)
                    VALUES (%s, 0, %s, %s, %s, %s, %s) RETURNING id
                ''', (
                    company_id, fname, lname, 
                    new_cust.get('email'), new_cust.get('phone'), new_cust.get('wedding_date')
                ))
                new_id = cursor.fetchone()['id']
                
                response = {
                    "status": "success", 
                    "message": f"Successfully created a profile for {fname} {lname or ''}. Bringing it up now.",
                    "redirect_url": f"/customers/{new_id}"
                }
                
            elif intent == 'LOG_PAYMENT':
                amt = params.get('payment_amount')
                meth = params.get('payment_method', 'Credit Card')
                if not amt:
                    raise ValueError("You must specify a payment amount.")
                
                if target_type == 'order':
                    order_id = target_id
                    cursor.execute("SELECT customer_id FROM orders WHERE id = %s AND company_id = %s", (order_id, company_id))
                    o_row = cursor.fetchone()
                    if not o_row:
                        raise ValueError("Order not found.")
                    cust_id = o_row['customer_id']
                elif target_type == 'customer':
                    cust_id = target_id
                    cursor.execute("SELECT id FROM orders WHERE customer_id = %s AND company_id = %s ORDER BY created_at DESC LIMIT 1", (cust_id, company_id))
                    o_row = cursor.fetchone()
                    if not o_row:
                        raise ValueError("This customer does not have any active orders to apply payment to.")
                    order_id = o_row['id']
                else:
                    raise ValueError("You must specify a customer or an order to log a payment against.")
                    
                import hashlib
                import time
                imm_hash = hashlib.sha256(f"{target_id}{time.time()}{amt}{meth}".encode()).hexdigest()
                
                cursor.execute('''
                    INSERT INTO payment_ledger (order_id, customer_id, type, amount, method, created_by, immutable_hash)
                    VALUES (%s, %s, 'Payment', %s, %s, %s, %s)
                ''', (order_id, cust_id, amt, meth, current_user_id, imm_hash))
                
                response = {
                    "status": "success", 
                    "message": f"Successfully logged the payment of ${float(amt):.2f} via {meth}.",
                    "redirect_url": f"/orders/{order_id}"
                }
                
            else:
                response = {"status": "ignored", "message": "Intent recognized but handler not implemented."}
                
            if audit_id:
                cursor.execute("UPDATE ai_audit_logs SET execution_outcome = 'SUCCESS' WHERE id = %s", (audit_id,))
            db.commit()
        except Exception as e:
            db.rollback()
            if audit_id:
                cursor.execute("UPDATE ai_audit_logs SET execution_outcome = 'FAILED: ' || %s WHERE id = %s", (str(e), audit_id))
                db.commit()
            response = {"status": "error", "message": str(e)}
            
        return response
