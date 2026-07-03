import psycopg2
import psycopg2.extras
import psycopg2.extensions
import os
from flask import g
from dotenv import load_dotenv

def _cast_date_to_string(value, cursor):
    if value is None: return None
    return str(value)
    
psycopg2.extensions.register_type(
    psycopg2.extensions.new_type((1082, 1083, 1114, 1184), "STRINGCAST", _cast_date_to_string)
)

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:supabase_dummy_password@localhost:5434/roberts_enterprise')

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    return db

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Create tables if they do not exist (data persists across restarts)
    # Re-enable foreign keys if disabled
    
        
    # ==========================================
    # CORE ENTITIES
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS companies (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            domain TEXT,
            logo_url TEXT,
            primary_color TEXT DEFAULT '#aa8c66',
            theme_bg TEXT DEFAULT 'dark',
            active BOOLEAN DEFAULT TRUE,
            stripe_secret_key TEXT,
            stripe_publishable_key TEXT,
            qb_client_id TEXT,
            qb_client_secret TEXT,
            qb_access_token TEXT,
            qb_refresh_token TEXT,
            qb_realm_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS locations (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            email TEXT,
            active BOOLEAN DEFAULT TRUE,
            FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            company_id INTEGER,
            location_id INTEGER,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Viewer', -- Owner, Manager, Stylist, Alterations, Cashier, Viewer
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            commission_type TEXT DEFAULT 'NONE',
            commission_rate REAL DEFAULT 0.0,
            commission_locations TEXT,
            hourly_wage REAL DEFAULT 0.0,
            bonus REAL DEFAULT 0.0,
            FOREIGN KEY(company_id) REFERENCES companies(id),
            FOREIGN KEY(location_id) REFERENCES locations(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            company_id INTEGER,
            location_id INTEGER,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            notes TEXT,
            wedding_date TIMESTAMP,
            partner_name TEXT,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(company_id) REFERENCES companies(id),
            FOREIGN KEY(location_id) REFERENCES locations(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS services (
            id SERIAL PRIMARY KEY,
            company_id INTEGER,
            name TEXT NOT NULL, -- e.g., Consultation, Fitting, Alterations, Pickup
            duration_minutes INTEGER NOT NULL,
            default_price REAL DEFAULT 0.0,
            buffer_minutes INTEGER DEFAULT 0,
            active BOOLEAN DEFAULT TRUE,
            FOREIGN KEY(company_id) REFERENCES companies(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alterations (
            id SERIAL PRIMARY KEY,
            company_id INTEGER,
            location_id INTEGER,
            customer_id INTEGER NOT NULL,
            item_description TEXT NOT NULL,
            status TEXT DEFAULT 'Awaiting 1st Fitting', -- Awaiting 1st Fitting, Pinned, Sewing, Steaming, Ready for Pickup, Delivered
            due_date TIMESTAMP,
            assigned_seamstress_id INTEGER,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(company_id) REFERENCES companies(id),
            FOREIGN KEY(location_id) REFERENCES locations(id),
            FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
            FOREIGN KEY(assigned_seamstress_id) REFERENCES users(id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS customer_measurements (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER UNIQUE NOT NULL,
            bust REAL DEFAULT 0.0,
            waist REAL DEFAULT 0.0,
            hips REAL DEFAULT 0.0,
            hollow_to_hem REAL DEFAULT 0.0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
    ''')

    # ==========================================
    # COMMUNICATIONS & NOTIFICATIONS
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS communication_logs (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            type TEXT NOT NULL, -- SMS, Email
            subject TEXT,
            message_body TEXT NOT NULL,
            status TEXT DEFAULT 'Sent', -- Sent, Failed
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(company_id) REFERENCES companies(id),
            FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
    ''')

    # ==========================================
    # SCHEDULING
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id SERIAL PRIMARY KEY,
            location_id INTEGER,
            customer_id INTEGER NOT NULL,
            service_id INTEGER NOT NULL,
            assigned_staff_id INTEGER,
            start_at TIMESTAMP NOT NULL,
            end_at TIMESTAMP NOT NULL,
            status TEXT DEFAULT 'Scheduled', -- Scheduled, Checked_In, Completed, No_Show, Cancelled
            notes TEXT,
            created_by INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(location_id) REFERENCES locations(id),
            FOREIGN KEY(customer_id) REFERENCES customers(id),
            FOREIGN KEY(service_id) REFERENCES services(id),
            FOREIGN KEY(assigned_staff_id) REFERENCES users(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS appointment_participants (
            id SERIAL PRIMARY KEY,
            appointment_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            relation TEXT, -- e.g., Mother of Bride, Bridesmaid
            phone TEXT,
            notes TEXT,
            FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS appointment_checklists (
            id SERIAL PRIMARY KEY,
            appointment_id INTEGER NOT NULL,
            type TEXT NOT NULL, -- e.g., Fitting, Pickup
            items_json TEXT NOT NULL, -- JSON array of checklist items
            completed_by INTEGER,
            completed_at TIMESTAMP,
            FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
            FOREIGN KEY(completed_by) REFERENCES users(id)
        )
    ''')

    # ==========================================
    # INVENTORY & PURCHASING
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vendors (
            id SERIAL PRIMARY KEY,
            company_id INTEGER,
            name TEXT NOT NULL,
            contact_name TEXT,
            email TEXT,
            phone TEXT,
            portal_url TEXT,
            notes TEXT,
            active BOOLEAN DEFAULT TRUE,
            lead_time_weeks INTEGER DEFAULT 16,
            FOREIGN KEY(company_id) REFERENCES companies(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS designer_size_charts (
            id SERIAL PRIMARY KEY,
            vendor_id INTEGER NOT NULL,
            size_label TEXT NOT NULL,
            bust REAL NOT NULL,
            waist REAL NOT NULL,
            hips REAL NOT NULL,
            FOREIGN KEY(vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            vendor_id INTEGER,
            type TEXT NOT NULL, -- Dress, Accessory, Veil, Shoes
            brand TEXT,
            name TEXT NOT NULL,
            sku TEXT UNIQUE NOT NULL,
            cost REAL NOT NULL DEFAULT 0.0,
            price REAL NOT NULL DEFAULT 0.0,
            active BOOLEAN DEFAULT TRUE,
            FOREIGN KEY(vendor_id) REFERENCES vendors(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS product_variants (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL,
            size TEXT,
            color TEXT,
            sku_variant TEXT UNIQUE NOT NULL,
            on_hand_qty INTEGER DEFAULT 0,
            track_inventory BOOLEAN DEFAULT TRUE,
            FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reservations (
            id SERIAL PRIMARY KEY,
            product_variant_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            appointment_id INTEGER,
            reserve_from TIMESTAMP NOT NULL,
            reserve_to TIMESTAMP NOT NULL,
            status TEXT DEFAULT 'Held', -- Held, Confirmed, Released, Converted_To_Sale
            notes TEXT,
            FOREIGN KEY(product_variant_id) REFERENCES product_variants(id),
            FOREIGN KEY(customer_id) REFERENCES customers(id),
            FOREIGN KEY(appointment_id) REFERENCES appointments(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS purchase_orders (
            id SERIAL PRIMARY KEY,
            vendor_id INTEGER NOT NULL,
            order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expected_delivery TIMESTAMP,
            status TEXT DEFAULT 'Draft', -- Draft, Submitted, Partially_Received, Received, Cancelled
            total_cost REAL DEFAULT 0.0,
            notes TEXT,
            created_by INTEGER,
            FOREIGN KEY(vendor_id) REFERENCES vendors(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS purchase_order_items (
            id SERIAL PRIMARY KEY,
            purchase_order_id INTEGER NOT NULL,
            product_variant_id INTEGER NOT NULL,
            qty_ordered INTEGER NOT NULL,
            qty_received INTEGER DEFAULT 0,
            unit_cost REAL NOT NULL,
            FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            FOREIGN KEY(product_variant_id) REFERENCES product_variants(id)
        )
    ''')

    # ==========================================
    # INTER-STORE TRANSFERS
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS location_inventory (
            id SERIAL PRIMARY KEY,
            location_id INTEGER NOT NULL,
            product_variant_id INTEGER NOT NULL,
            qty_on_hand INTEGER DEFAULT 0,
            FOREIGN KEY(location_id) REFERENCES locations(id),
            FOREIGN KEY(product_variant_id) REFERENCES product_variants(id),
            UNIQUE(location_id, product_variant_id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transfers (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            from_location_id INTEGER NOT NULL,
            to_location_id INTEGER NOT NULL,
            status TEXT DEFAULT 'In_Transit', -- In_Transit, Received, Cancelled
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            received_at TIMESTAMP,
            received_by INTEGER,
            notes TEXT,
            FOREIGN KEY(company_id) REFERENCES companies(id),
            FOREIGN KEY(from_location_id) REFERENCES locations(id),
            FOREIGN KEY(to_location_id) REFERENCES locations(id),
            FOREIGN KEY(created_by) REFERENCES users(id),
            FOREIGN KEY(received_by) REFERENCES users(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transfer_items (
            id SERIAL PRIMARY KEY,
            transfer_id INTEGER NOT NULL,
            product_variant_id INTEGER NOT NULL,
            qty INTEGER NOT NULL,
            FOREIGN KEY(transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
            FOREIGN KEY(product_variant_id) REFERENCES product_variants(id)
        )
    ''')

    # ==========================================
    # SALES & PAYMENTS
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            company_id INTEGER,
            location_id INTEGER,
            customer_id INTEGER NOT NULL,
            status TEXT DEFAULT 'Draft', -- Draft, Active, Fulfilled, Cancelled
            subtotal REAL DEFAULT 0.0,
            tax REAL DEFAULT 0.0,
            total REAL DEFAULT 0.0,
            wedding_date_snapshot TIMESTAMP,
            notes TEXT,
            sold_by_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(company_id) REFERENCES companies(id),
            FOREIGN KEY(location_id) REFERENCES locations(id),
            FOREIGN KEY(customer_id) REFERENCES customers(id),
            FOREIGN KEY(sold_by_id) REFERENCES users(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL,
            product_variant_id INTEGER,
            service_id INTEGER,
            description TEXT NOT NULL,
            qty INTEGER NOT NULL DEFAULT 1,
            unit_price REAL NOT NULL,
            line_total REAL NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY(product_variant_id) REFERENCES product_variants(id),
            FOREIGN KEY(service_id) REFERENCES services(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payment_plans (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL UNIQUE,
            terms TEXT, -- e.g., "50% Deposit, 50% on Pickup", "Net 30"
            installment_count INTEGER DEFAULT 1,
            next_due_date TIMESTAMP,
            FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
    ''')

    # AUDITABLE LEDGER - APPEND ONLY
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payment_ledger (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            type TEXT NOT NULL, -- Deposit, Final, Installment, Refund, Fee
            amount REAL NOT NULL,
            method TEXT NOT NULL, -- Cash, Card, Check, ACH, Other
            occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reference TEXT,
            memo TEXT,
            created_by INTEGER,
            immutable_hash TEXT,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(customer_id) REFERENCES customers(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        )
    ''')

    # ==========================================
    # PAYROLL & COMMISSIONS
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS time_entries (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            location_id INTEGER,
            clock_in TIMESTAMP NOT NULL,
            clock_out TIMESTAMP,
            total_hours REAL,
            approved BOOLEAN DEFAULT FALSE,
            status TEXT DEFAULT 'Unpaid', -- Unpaid, Paid
            notes TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(location_id) REFERENCES locations(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS commissions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            order_id INTEGER,
            description TEXT,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'Pending', -- Pending, Paid, Reversed
            earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(order_id) REFERENCES orders(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS employee_regulations (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            company_id INTEGER,
            allow_discounts BOOLEAN DEFAULT FALSE,
            max_discount_percent REAL DEFAULT 0.0,
            allow_refunds BOOLEAN DEFAULT FALSE,
            require_manager_approval_above REAL DEFAULT 0.0,
            can_edit_shifts BOOLEAN DEFAULT FALSE,
            can_view_wholesale_pricing BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS commission_tiers (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            company_id INTEGER,
            tier_level INTEGER DEFAULT 1,
            revenue_threshold REAL DEFAULT 0.0,
            commission_rate REAL DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS paystubs (
            id SERIAL PRIMARY KEY,
            company_id INTEGER,
            user_id INTEGER NOT NULL,
            period_start DATE,
            period_end DATE,
            total_hours REAL DEFAULT 0.0,
            hourly_rate REAL DEFAULT 0.0,
            base_pay REAL DEFAULT 0.0,
            commission_pay REAL DEFAULT 0.0,
            bonus_pay REAL DEFAULT 0.0,
            total_pay REAL DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            FOREIGN KEY(company_id) REFERENCES companies(id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        )
    ''')

    # ==========================================
    # PICKUPS
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pickups (
            id SERIAL PRIMARY KEY,
            company_id INTEGER,
            location_id INTEGER,
            order_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            scheduled_at TIMESTAMP,
            status TEXT DEFAULT 'Scheduled', -- Scheduled, Ready, Picked_Up, No_Show, Rescheduled
            pickup_contact_name TEXT,
            pickup_contact_phone TEXT,
            notes TEXT,
            signed_at TIMESTAMP,
            signed_by TEXT,
            FOREIGN KEY(company_id) REFERENCES companies(id),
            FOREIGN KEY(location_id) REFERENCES locations(id),
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pickup_items (
            id SERIAL PRIMARY KEY,
            pickup_id INTEGER NOT NULL,
            order_item_id INTEGER NOT NULL,
            checklist_status BOOLEAN DEFAULT FALSE,
            FOREIGN KEY(pickup_id) REFERENCES pickups(id) ON DELETE CASCADE,
            FOREIGN KEY(order_item_id) REFERENCES order_items(id)
        )
    ''')

    # ==========================================
    # SHIFTS & SCHEDULING
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS shifts (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            location_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP NOT NULL,
            notes TEXT,
            FOREIGN KEY(company_id) REFERENCES companies(id),
            FOREIGN KEY(location_id) REFERENCES locations(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')

    # ==========================================
    # REMINDERS & NOTIFICATIONS
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notification_preferences (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER UNIQUE,
            user_id INTEGER UNIQUE,
            email_opt_in BOOLEAN DEFAULT TRUE,
            sms_opt_in BOOLEAN DEFAULT TRUE,
            in_app_opt_in BOOLEAN DEFAULT TRUE,
            FOREIGN KEY(customer_id) REFERENCES customers(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reminders (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL, -- Appointment, Balance_Due, Pickup, Alterations_Due
            reference_id INTEGER NOT NULL, -- ID of appointment, order, or pickup
            trigger_at TIMESTAMP NOT NULL,
            status TEXT DEFAULT 'Pending' -- Pending, Sent, Failed, Cancelled
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notification_jobs (
            id SERIAL PRIMARY KEY,
            reminder_id INTEGER,
            channel TEXT NOT NULL, -- Email, SMS, In-App
            recipient TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT DEFAULT 'Queued', -- Queued, Processing, Sent, Failed
            error_log TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(reminder_id) REFERENCES reminders(id) ON DELETE SET NULL
        )
    ''')

    # ==========================================
    # INTERNAL TEAM COMMUNICATIONS & AI ORCHESTRATION
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS internal_threads (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            customer_id INTEGER,
            order_id INTEGER,
            appointment_id INTEGER,
            po_id INTEGER,
            status TEXT DEFAULT 'Open',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(company_id) REFERENCES companies(id),
            FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL,
            FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
            FOREIGN KEY(po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS internal_messages (
            id SERIAL PRIMARY KEY,
            thread_id INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            body TEXT NOT NULL,
            transcript_source TEXT,
            super_admin_excluded BOOLEAN DEFAULT FALSE,
            exclusion_reason TEXT,
            exclusion_approved BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(thread_id) REFERENCES internal_threads(id) ON DELETE CASCADE,
            FOREIGN KEY(author_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS internal_alerts (
            id SERIAL PRIMARY KEY,
            message_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            read_state BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(message_id) REFERENCES internal_messages(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_audit_logs (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            actor_id INTEGER,
            raw_input TEXT,
            parsed_intent TEXT,
            extracted_entities_json TEXT,
            target_object_type TEXT,
            target_object_id INTEGER,
            execution_outcome TEXT,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(company_id) REFERENCES companies(id)
        )
    ''')

    conn.commit()

if __name__ == '__main__':
    print("Initializing Roberts Enterprise Database...")
    init_db()
    print("Database tables created successfully!")
