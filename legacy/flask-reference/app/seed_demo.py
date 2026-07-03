import psycopg2
from werkzeug.security import generate_password_hash
from database import DATABASE_URL
import datetime
import json

def seed_demo_data():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    print("Clearing existing data...")
    tables = [
        "communication_logs", "transfer_items", "transfers", "location_inventory",
        "purchase_order_items", "purchase_orders", "reservations", "pickup_items", "pickups",
        "payment_plans", "payment_ledger", "order_items", "orders",
        "appointment_checklists", "appointment_participants", "appointments", "services",
        "customer_measurements", "alterations", "customers", 
        "paystubs", "commissions", "time_entries", "shifts",
        "notification_jobs", "notification_preferences", "reminders",
        "product_variants", "products", "designer_size_charts", "vendors",
        "users", "locations", "companies"
    ]
    
    for table in tables:
        try:
            cursor.execute(f"TRUNCATE TABLE {table} CASCADE;")
        except Exception:
            pass

    print("Inserting comprehensive demo data...")
    now = datetime.datetime.now()
    
    # 1. Company
    cursor.execute("""
        INSERT INTO companies (name, domain, logo_url, primary_color, theme_bg, active, stripe_secret_key, stripe_publishable_key, qb_client_id, qb_client_secret, qb_access_token, qb_refresh_token, qb_realm_id)
        VALUES ('I Do Bridal Couture', 'idobridalcouture.com', '/static/img/ido_logo.png', '#aa8c66', 'custom_idc', TRUE, 'sk_test_123', 'pk_test_123', 'qb_client_123', 'qb_secret_123', 'qb_access_123', 'qb_refresh_123', 'realm_123')
        RETURNING id
    """)
    company_id = cursor.fetchone()[0]

    # 2. Locations
    cursor.execute("""
        INSERT INTO locations (company_id, name, address, phone, email, active)
        VALUES 
        (%s, 'Baton Rouge', 'Baton Rouge, LA', '212-555-0100', 'downtown@robertsbridal.com', TRUE),
        (%s, 'Covington', 'Covington, LA', '212-555-0200', 'uptown@robertsbridal.com', TRUE)
        RETURNING id
    """, (company_id, company_id))
    loc1_id, loc2_id = [r[0] for r in cursor.fetchmany(2)]

    # 3. Users
    pw_hash = generate_password_hash("1979Ramsey30!")
    cursor.execute("""
        INSERT INTO users (company_id, location_id, email, password_hash, role, first_name, last_name, commission_type, commission_rate, hourly_wage, bonus)
        VALUES 
        (%s, %s, 'ramsey@idobridalcouture.com', %s, 'Owner', 'Ramsey', 'Roberts', 'NONE', 0.0, 0.0, 5000.0),
        (%s, %s, 'manager@example.com', %s, 'Manager', 'Sarah', 'Smith', 'FLAT', 50.0, 25.0, 500.0),
        (%s, %s, 'stylist1@example.com', %s, 'Stylist', 'Emily', 'Chen', 'PERCENTAGE', 5.0, 18.0, 100.0),
        (%s, %s, 'stylist2@example.com', %s, 'Stylist', 'Jessica', 'Davis', 'PERCENTAGE', 5.0, 18.0, 100.0),
        (%s, %s, 'seamstress@example.com', %s, 'Alterations', 'Maria', 'Garcia', 'NONE', 0.0, 22.0, 50.0)
        RETURNING id
    """, (
        company_id, loc1_id, pw_hash,
        company_id, loc1_id, pw_hash,
        company_id, loc1_id, pw_hash,
        company_id, loc2_id, pw_hash,
        company_id, loc1_id, pw_hash
    ))
    owner_id, manager_id, stylist1_id, stylist2_id, seamstress_id = [r[0] for r in cursor.fetchmany(5)]

    # 3.5 Proper & Co
    cursor.execute("""
        INSERT INTO companies (name, domain, logo_url, primary_color, theme_bg, active, stripe_secret_key, stripe_publishable_key, qb_client_id, qb_client_secret, qb_access_token, qb_refresh_token, qb_realm_id)
        VALUES ('Proper & Co', 'properandco.com', '/static/img/proper_logo.png', '#aa8c66', 'custom_proper', TRUE, 'sk_test_123', 'pk_test_123', 'qb_client_123', 'qb_secret_123', 'qb_access_123', 'qb_refresh_123', 'realm_123')
        RETURNING id
    """)
    proper_company_id = cursor.fetchone()[0]

    cursor.execute("""
        INSERT INTO locations (company_id, name, address, phone, email, active)
        VALUES 
        (%s, 'Baton Rouge', 'Baton Rouge, LA', '212-555-0100', 'br@properandco.com', TRUE),
        (%s, 'Covington', 'Covington, LA', '212-555-0200', 'covington@properandco.com', TRUE)
        RETURNING id
    """, (proper_company_id, proper_company_id))
    proper_loc1_id, proper_loc2_id = [r[0] for r in cursor.fetchmany(2)]

    cursor.execute("""
        INSERT INTO users (company_id, location_id, email, password_hash, role, first_name, last_name, commission_type, commission_rate, hourly_wage, bonus)
        VALUES 
        (%s, %s, 'ramsey@properandco.com', %s, 'Owner', 'Ramsey', 'Roberts', 'NONE', 0.0, 0.0, 5000.0)
        RETURNING id
    """, (proper_company_id, proper_loc1_id, pw_hash))
    proper_owner_id = cursor.fetchone()[0]


    def seed_brand_data(company_id, loc1_id, loc2_id, owner_id, manager_id, stylist1_id, stylist2_id, seamstress_id):
        # 4. Services
        cursor.execute("""
            INSERT INTO services (company_id, name, duration_minutes, default_price, buffer_minutes)
            VALUES 
            (%s, 'Bridal Consultation', 90, 50.0, 15),
            (%s, 'Follow-up Fitting', 60, 0.0, 10),
            (%s, 'Alterations Session', 120, 150.0, 20),
            (%s, 'Dress Pickup', 30, 0.0, 5)
            RETURNING id
        """, (company_id, company_id, company_id, company_id))
        sv1, sv2, sv3, sv4 = [r[0] for r in cursor.fetchmany(4)]
    
        # 5. Customers
        wedding1 = now + datetime.timedelta(days=180)
        wedding2 = now + datetime.timedelta(days=60)
        wedding3 = now + datetime.timedelta(days=30)
        
        cursor.execute("""
            INSERT INTO customers (company_id, location_id, first_name, last_name, email, phone, address, notes, wedding_date, partner_name, created_by)
            VALUES 
            (%s, %s, 'Amanda', 'Seyfried', 'amanda@test.com', '555-0100', '789 Park Ave, NY', 'Allergic to specific fabrics', %s, 'Thomas', %s),
            (%s, %s, 'Rachel', 'McAdams', 'rachel@test.com', '555-0101', '101 Broadway, NY', 'Loves lace designs', %s, 'Michael', %s),
            (%s, %s, 'Emma', 'Stone', 'emma@test.com', '555-0102', '202 5th Ave, NY', 'Looking for a veil too', %s, 'David', %s)
            RETURNING id
        """, (company_id, loc1_id, wedding1, stylist1_id,
              company_id, loc1_id, wedding2, stylist1_id,
              company_id, loc2_id, wedding3, stylist2_id))
        cust1, cust2, cust3 = [r[0] for r in cursor.fetchmany(3)]
    
        # 5b. Customer Measurements
        cursor.execute("""
            INSERT INTO customer_measurements (customer_id, bust, waist, hips, hollow_to_hem)
            VALUES 
            (%s, 34.5, 26.0, 36.5, 58.0),
            (%s, 36.0, 28.5, 38.0, 59.5)
        """, (cust1, cust2))
    
        # 5c. Communication Logs
        cursor.execute("""
            INSERT INTO communication_logs (company_id, customer_id, type, subject, message_body, status)
            VALUES
            (%s, %s, 'Email', 'Welcome to Roberts Bridal!', 'We are so excited for your upcoming consultation.', 'Sent'),
            (%s, %s, 'SMS', NULL, 'Hi Rachel, your dress is ready for pickup!', 'Sent')
        """, (company_id, cust1, company_id, cust2))
    
        # 5d. Notification Preferences
        cursor.execute("""
            INSERT INTO notification_preferences (customer_id, email_opt_in, sms_opt_in, in_app_opt_in)
            VALUES (%s, TRUE, TRUE, TRUE), (%s, TRUE, FALSE, TRUE)
        """, (cust1, cust2))
    
        # 6. Appointments
        cursor.execute("""
            INSERT INTO appointments (location_id, customer_id, service_id, assigned_staff_id, start_at, end_at, status, notes, created_by)
            VALUES 
            (%s, %s, %s, %s, %s, %s, 'Scheduled', 'First time consultation', %s),
            (%s, %s, %s, %s, %s, %s, 'Scheduled', 'Needs to try the Juliet dress', %s),
            (%s, %s, %s, %s, %s, %s, 'Completed', 'Dress successfully picked up', %s)
            RETURNING id
        """, (
            loc1_id, cust1, sv1, stylist1_id, now.replace(hour=10, minute=0), now.replace(hour=11, minute=30), manager_id,
            loc1_id, cust2, sv2, stylist1_id, now.replace(hour=13, minute=0), now.replace(hour=14, minute=0), manager_id,
            loc2_id, cust3, sv4, stylist2_id, now - datetime.timedelta(days=1), now - datetime.timedelta(days=1), manager_id
        ))
        appt1, appt2, appt3 = [r[0] for r in cursor.fetchmany(3)]
    
        # 6b. Appointment Participants
        cursor.execute("""
            INSERT INTO appointment_participants (appointment_id, name, relation, phone, notes)
            VALUES 
            (%s, 'Martha Seyfried', 'Mother of Bride', '555-0999', 'Bringing champagne'),
            (%s, 'Lucy Stone', 'Bridesmaid', '555-0888', 'Helping with the veil')
        """, (appt1, appt3))
    
        # 6c. Appointment Checklists
        checklist_json = json.dumps([{"task": "Offer water/champagne", "done": True}, {"task": "Take measurements", "done": False}])
        cursor.execute("""
            INSERT INTO appointment_checklists (appointment_id, type, items_json, completed_by)
            VALUES (%s, 'Consultation', %s, %s)
        """, (appt1, checklist_json, stylist1_id))
    
        # 7. Vendors & Products
        cursor.execute("""
            INSERT INTO vendors (company_id, name, contact_name, email, phone, portal_url, notes, lead_time_weeks)
            VALUES 
            (%s, 'Vera Wang', 'John Doe', 'john@verawang.com', '800-111-2222', 'https://vendors.verawang.com', 'VIP Vendor', 16),
            (%s, 'Monique Lhuillier', 'Jane Smith', 'jane@ml.com', '800-333-4444', 'https://vendors.ml.com', 'Fast shipping', 12)
            RETURNING id
        """, (company_id, company_id))
        vendor1, vendor2 = [r[0] for r in cursor.fetchmany(2)]
    
        # 7b. Designer Size Charts
        cursor.execute("""
            INSERT INTO designer_size_charts (vendor_id, size_label, bust, waist, hips)
            VALUES 
            (%s, '8', 35.0, 27.0, 37.5),
            (%s, '10', 36.5, 28.5, 39.0)
        """, (vendor1, vendor1))
    
        # 7c. Products
        cursor.execute(f"""
            INSERT INTO products (vendor_id, type, brand, name, sku, cost, price)
            VALUES 
            (%s, 'Dress', 'Vera Wang Bridal', 'The Juliet', 'VW-JULIET-{company_id}', 1500.0, 3500.0),
            (%s, 'Dress', 'ML Collection', 'The Athena', 'ML-ATHENA-{company_id}', 2000.0, 4500.0),
            (%s, 'Veil', 'Vera Wang Accessories', 'Cathedral Lace', 'VW-VEIL-1-{company_id}', 150.0, 450.0)
            RETURNING id
        """, (vendor1, vendor2, vendor1))
        prod1, prod2, prod3 = [r[0] for r in cursor.fetchmany(3)]
    
        # 7d. Product Variants
        cursor.execute(f"""
            INSERT INTO product_variants (product_id, size, color, sku_variant, on_hand_qty, track_inventory)
            VALUES 
            (%s, '8', 'Ivory', 'VW-JULIET-8-IV-{company_id}', 2, TRUE),
            (%s, '10', 'White', 'VW-JULIET-10-WH-{company_id}', 1, TRUE),
            (%s, '6', 'Blush', 'ML-ATHENA-6-BL-{company_id}', 0, TRUE),
            (%s, 'One Size', 'Ivory', 'VW-VEIL-1-IV-{company_id}', 5, TRUE)
            RETURNING id
        """, (prod1, prod1, prod2, prod3))
        var1, var2, var3, var4 = [r[0] for r in cursor.fetchmany(4)]
    
        # 8. Inventory Location Tracking & Transfers
        cursor.execute("""
            INSERT INTO location_inventory (location_id, product_variant_id, qty_on_hand)
            VALUES (%s, %s, 1), (%s, %s, 1), (%s, %s, 5)
        """, (loc1_id, var1, loc2_id, var2, loc1_id, var4))
    
        cursor.execute("""
            INSERT INTO transfers (company_id, from_location_id, to_location_id, status, created_by, notes)
            VALUES (%s, %s, %s, 'In_Transit', %s, 'Urgent transfer for fitting')
            RETURNING id
        """, (company_id, loc1_id, loc2_id, manager_id))
        transfer1 = cursor.fetchone()[0]
    
        cursor.execute("""
            INSERT INTO transfer_items (transfer_id, product_variant_id, qty)
            VALUES (%s, %s, 1)
        """, (transfer1, var1))
    
        # 9. Reservations
        cursor.execute("""
            INSERT INTO reservations (product_variant_id, customer_id, appointment_id, reserve_from, reserve_to, status, notes)
            VALUES (%s, %s, %s, %s, %s, 'Held', 'Holding dress for appointment')
        """, (var1, cust1, appt1, now, now + datetime.timedelta(days=1)))
    
        # 10. Purchase Orders & Items
        cursor.execute("""
            INSERT INTO purchase_orders (vendor_id, expected_delivery, status, total_cost, notes, created_by)
            VALUES 
            (%s, %s, 'Submitted', 2000.0, 'Rush order', %s),
            (%s, %s, 'Partially_Received', 3000.0, 'Regular restock', %s)
            RETURNING id
        """, (vendor1, now + datetime.timedelta(days=30), manager_id,
              vendor2, now + datetime.timedelta(days=15), manager_id))
        po1, po2 = [r[0] for r in cursor.fetchmany(2)]
    
        cursor.execute("""
            INSERT INTO purchase_order_items (purchase_order_id, product_variant_id, qty_ordered, qty_received, unit_cost)
            VALUES 
            (%s, %s, 2, 0, 1000.0),
            (%s, %s, 3, 1, 1000.0)
        """, (po1, var1, po2, var3))
    
        # 11. Orders & Order Items
        cursor.execute("""
            INSERT INTO orders (company_id, location_id, customer_id, status, subtotal, tax, total, wedding_date_snapshot, notes, sold_by_id)
            VALUES 
            (%s, %s, %s, 'Active', 3950.0, 345.63, 4295.63, %s, 'Customer wants urgent delivery', %s),
            (%s, %s, %s, 'Fulfilled', 4500.0, 393.75, 4893.75, %s, 'Delivered successfully', %s)
            RETURNING id
        """, (company_id, loc1_id, cust1, wedding1, stylist1_id,
              company_id, loc2_id, cust3, wedding3, stylist2_id))
        order1, order2 = [r[0] for r in cursor.fetchmany(2)]
    
        cursor.execute("""
            INSERT INTO order_items (order_id, product_variant_id, description, qty, unit_price, line_total)
            VALUES 
            (%s, %s, 'The Juliet - Size 8 Ivory', 1, 3500.0, 3500.0),
            (%s, %s, 'Cathedral Lace Veil', 1, 450.0, 450.0),
            (%s, %s, 'The Athena - Size 6 Blush', 1, 4500.0, 4500.0)
        """, (order1, var1, order1, var4, order2, var3))
    
        # 11b. Payment Plans
        cursor.execute("""
            INSERT INTO payment_plans (order_id, terms, installment_count, next_due_date)
            VALUES (%s, '50%% Deposit, 50%% on Pickup', 2, %s)
        """, (order1, now + datetime.timedelta(days=30)))
    
        # 11c. Payment Ledger
        cursor.execute("""
            INSERT INTO payment_ledger (order_id, customer_id, type, amount, method, reference, memo, created_by)
            VALUES 
            (%s, %s, 'Deposit', 2000.0, 'Card', 'TXN-001', 'Initial deposit paid', %s),
            (%s, %s, 'Final', 4893.75, 'Card', 'TXN-002', 'Paid in full', %s)
        """, (order1, cust1, manager_id, order2, cust3, manager_id))
    
        # 12. Alterations
        cursor.execute("""
            INSERT INTO alterations (company_id, location_id, customer_id, item_description, status, due_date, assigned_seamstress_id, notes)
            VALUES (%s, %s, %s, 'Take in the waist 1 inch, hem length by 2 inches', 'Sewing', %s, %s, 'Needs delicate lace handling')
        """, (company_id, loc1_id, cust1, now + datetime.timedelta(days=14), seamstress_id))
    
        # 13. Pickups & Pickup Items
        cursor.execute("""
            INSERT INTO pickups (company_id, location_id, order_id, customer_id, scheduled_at, status, pickup_contact_name, pickup_contact_phone, notes, signed_at, signed_by)
            VALUES 
            (%s, %s, %s, %s, %s, 'Scheduled', 'Martha Seyfried', '555-0999', 'Mother will pick up', NULL, NULL),
            (%s, %s, %s, %s, %s, 'Pickled_Up', 'Emma Stone', '555-0102', 'All good', %s, 'Emma Stone')
            RETURNING id
        """, (company_id, loc1_id, order1, cust1, now + datetime.timedelta(days=45),
              company_id, loc2_id, order2, cust3, now - datetime.timedelta(days=1), now - datetime.timedelta(days=1)))
        pickup1, pickup2 = [r[0] for r in cursor.fetchmany(2)]
    
        # Fetch order items to link them
        cursor.execute("SELECT id FROM order_items WHERE order_id = %s", (order1,))
        oi1 = cursor.fetchone()[0]
        cursor.execute("""
            INSERT INTO pickup_items (pickup_id, order_item_id, checklist_status)
            VALUES (%s, %s, FALSE)
        """, (pickup1, oi1))
    
        # 14. Payroll & Commissions & Shifts
        cursor.execute("""
            INSERT INTO time_entries (user_id, location_id, clock_in, clock_out, total_hours, approved, status, notes)
            VALUES 
            (%s, %s, %s, NULL, NULL, FALSE, 'Unpaid', 'Forgot to clock out'),
            (%s, %s, %s, %s, 8.0, TRUE, 'Paid', 'Regular shift')
        """, (
            manager_id, loc1_id, now - datetime.timedelta(hours=14),
            stylist1_id, loc1_id, now - datetime.timedelta(days=2, hours=10), now - datetime.timedelta(days=2, hours=2)
        ))
    
        cursor.execute("""
            INSERT INTO shifts (company_id, location_id, user_id, start_time, end_time, notes)
            VALUES (%s, %s, %s, %s, %s, 'Morning Shift')
        """, (company_id, loc1_id, stylist1_id, now.replace(hour=9, minute=0), now.replace(hour=17, minute=0)))
    
        cursor.execute("""
            INSERT INTO commissions (user_id, order_id, description, amount, status)
            VALUES (%s, %s, 'Sale of The Juliet', 175.0, 'Pending')
        """, (stylist1_id, order1))
    
        cursor.execute("""
            INSERT INTO paystubs (company_id, user_id, period_start, period_end, total_hours, hourly_rate, base_pay, commission_pay, bonus_pay, total_pay, created_by)
            VALUES (%s, %s, %s, %s, 40.0, 18.0, 720.0, 150.0, 0.0, 870.0, %s)
        """, (company_id, stylist1_id, now.date() - datetime.timedelta(days=14), now.date(), manager_id))
    
        # 15. Reminders & Notification Jobs
        cursor.execute("""
            INSERT INTO reminders (type, reference_id, trigger_at, status)
            VALUES ('Appointment', %s, %s, 'Pending')
            RETURNING id
        """, (appt2, now + datetime.timedelta(hours=2)))
        reminder_id = cursor.fetchone()[0]
    
        cursor.execute("""
            INSERT INTO notification_jobs (reminder_id, channel, recipient, payload, status)
            VALUES (%s, 'SMS', '555-0101', '{"message": "Reminder for your appointment"}', 'Queued')
        """, (reminder_id,))
    
    

    # Seed I Do Bridal
    seed_brand_data(company_id, loc1_id, loc2_id, owner_id, manager_id, stylist1_id, stylist2_id, seamstress_id)
    
    # Seed Proper & Co
    seed_brand_data(proper_company_id, proper_loc1_id, proper_loc2_id, proper_owner_id, proper_owner_id, proper_owner_id, proper_owner_id, proper_owner_id)

    print("Comprehensive Demo data successfully seeded!")
    conn.close()

if __name__ == '__main__':
    seed_demo_data()
