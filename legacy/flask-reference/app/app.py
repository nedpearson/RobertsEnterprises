from flask import Flask, render_template, session, redirect, url_for, request, flash
import os
from werkzeug.security import check_password_hash
from database import init_db
from flask_socketio import SocketIO

from werkzeug.middleware.proxy_fix import ProxyFix
app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key-for-roberts-enterprise")
socketio = SocketIO(app, cors_allowed_origins="*", manage_session=False, async_mode="threading")

# Ensure database is initialized on startup
with app.app_context():
    init_db()

from flask import g
@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        if exception:
            db.rollback()
        db.close()

# Register Blueprints
from routes.customers import bp as customers_bp  # noqa: E402
from routes.appointments import bp as appointments_bp  # noqa: E402
from routes.inventory import bp as inventory_bp  # noqa: E402
from routes.purchasing import bp as purchasing_bp  # noqa: E402
from routes.payroll import bp as payroll_bp  # noqa: E402
from routes.orders import bp as orders_bp  # noqa: E402
from routes.pickups import bp as pickups_bp  # noqa: E402
from routes.reports import bp as reports_bp  # noqa: E402
from routes.staff import bp as staff_bp  # noqa: E402
from routes.transfers import bp as transfers_bp  # noqa: E402
from routes.alterations import bp as alterations_bp  # noqa: E402
from routes.communications import bp as communications_bp  # noqa: E402
from routes.settings import bp as settings_bp  # noqa: E402
from routes.api_voice import bp as api_voice_bp  # noqa: E402
from routes.api_team_comm import bp as api_team_comm_bp  # noqa: E402

app.register_blueprint(customers_bp)
app.register_blueprint(appointments_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(purchasing_bp)
app.register_blueprint(payroll_bp)
app.register_blueprint(orders_bp)
app.register_blueprint(pickups_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(staff_bp)
app.register_blueprint(transfers_bp)
app.register_blueprint(alterations_bp)
app.register_blueprint(communications_bp)
app.register_blueprint(settings_bp)
app.register_blueprint(api_voice_bp)
app.register_blueprint(api_team_comm_bp)

@app.teardown_appcontext
def close_connection(exception):
    from flask import g
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

@app.context_processor
def inject_company_context():
    """
    Globally injects the active company's branding into every Jinja template.
    If no company is active in the session, falls back to a default theme.
    """
    from database import get_db
    company = None
    all_companies = []
    locations = []
    active_location = None
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Load all companies for the switcher dropdown
    cursor.execute("SELECT * FROM companies")
    all_companies = cursor.fetchall()
    
    if 'company_id' in session:
        cursor.execute("SELECT * FROM companies WHERE id = %s", (session['company_id'],))
        company = cursor.fetchone()
        
        # Check if the active user is clocked in
        is_clocked_in = False
        missing_clock_out_alert = False
        missing_clock_in_alert = False
        
        if 'user_id' in session:
            # Check clock out status (including > 12 hours check)
            cursor.execute('''
                SELECT id, clock_in, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - clock_in)) as elapsed 
                FROM time_entries 
                WHERE user_id = %s AND clock_out IS NULL 
                LIMIT 1
            ''', (session['user_id'],))
            active_shift = cursor.fetchone()
            
            if active_shift:
                is_clocked_in = True
                if active_shift['elapsed'] > 43200: # 12 hours in seconds
                    missing_clock_out_alert = True
            
            # Check missing clock in (scheduled today but not clocked in)
            if not is_clocked_in:
                cursor.execute('''
                    SELECT id FROM appointments 
                    WHERE assigned_staff_id = %s 
                    AND CAST(start_at AS DATE) = CURRENT_DATE 
                    AND status NOT IN ('Cancelled', 'Completed') 
                    LIMIT 1
                ''', (session['user_id'],))
                if cursor.fetchone():
                    missing_clock_in_alert = True
        
        # Load locations for this company
        cursor.execute("SELECT * FROM locations WHERE company_id = %s AND active = TRUE ORDER BY name ASC", (session['company_id'],))
        locations = cursor.fetchall()
        
        # Load active location if set, otherwise 0 means "All Locations"
        loc_id = session.get('location_id', 0)
        if loc_id != 0:
            cursor.execute("SELECT * FROM locations WHERE id = %s", (loc_id,))
            active_location = cursor.fetchone()
    
    # Fallback to an elegant light theme if no company is selected (e.g. Demo Bypass)
    theme_bg_type = company['theme_bg'] if company and company['theme_bg'] else 'light'
    primary = company['primary_color'] if company and company['primary_color'] else '#aa8c66'
    
    if theme_bg_type == 'custom_proper':
        t_bg, s_bg, c_bg, ch_bg = '#ffffff', '#6d6d6d', '#ffffff', '#ffffff'
        t_col, s_txt, s_hvr, b_col = '#2b3035', '#ffffff', '#3a3a3a', '#eaeaea'
        k_bg, muted = '#f8f9fa', '#6c757d'
        inp_bg, inp_br, inp_border = '#f1f3f5', '2rem', 'none'
        btn_bg, btn_hvr, btn_txt = '#6d6d6d', '#3a3a3a', '#ffffff'
    elif theme_bg_type == 'custom_idc':
        t_bg, s_bg, c_bg, ch_bg = '#ffffff', '#6d6d6d', '#ffffff', '#ffffff'
        t_col, s_txt, s_hvr, b_col = '#2b3035', '#ffffff', '#3a3a3a', '#eaeaea'
        k_bg, muted = '#f8f9fa', '#6c757d'
        inp_bg, inp_br, inp_border = '#f1f3f5', '2rem', 'none'
        btn_bg, btn_hvr, btn_txt = '#6d6d6d', '#3a3a3a', '#ffffff'
    elif theme_bg_type == 'dark':
        t_bg, s_bg, c_bg, ch_bg = '#121212', '#1e1e1e', '#1e1e1e', '#252525'
        t_col, s_txt, s_hvr, b_col = '#e0e0e0', '#aaaaaa', '#2d2d2d', '#333333'
        k_bg, muted = 'linear-gradient(145deg, #2a2a2a, #1e1e1e)', 'inherit'
        inp_bg, inp_br, inp_border = 'var(--card-bg)', '0.375rem', '1px solid var(--border-color)'
        btn_bg, btn_hvr, btn_txt = primary, primary, '#ffffff'
    else:
        # Elegant default
        t_bg, s_bg, c_bg, ch_bg = '#f8f9fa', '#ffffff', '#ffffff', '#ffffff'
        t_col, s_txt, s_hvr, b_col = '#2b3035', '#444444', '#f0f0f0', '#eaeaea'
        k_bg, muted = '#f8f9fa', '#6c757d'
        inp_bg, inp_br, inp_border = '#f1f3f5', '2rem', 'none'
        btn_bg, btn_hvr, btn_txt = primary, primary, '#ffffff'

    dynamic_css = f"""
    <style>
    :root {{
        --theme-color: {primary};
        --theme-bg: {t_bg};
        --sidebar-bg: {s_bg};
        --card-bg: {c_bg};
        --card-header-bg: {ch_bg};
        --text-color: {t_col};
        --sidebar-text: {s_txt};
        --sidebar-hover-bg: {s_hvr};
        --border-color: {b_col};
        --kpi-bg: {k_bg};
        --btn-bg: {btn_bg};
        --btn-hvr: {btn_hvr};
        --btn-txt: {btn_txt};
    }}
    body {{ background-color: var(--theme-bg); color: var(--text-color); font-family: 'Assistant', system-ui, -apple-system, sans-serif; font-size: 18px; line-height: 1.6; }}
    h1, h2, h3, h4, h5, h6, .h1, .h2, .h3, .h4, .h5, .h6, .logo-text {{ font-family: 'Halant', serif; font-weight: 600; letter-spacing: -0.025em; color: var(--text-color); }}
    .sidebar {{ background-color: var(--sidebar-bg); border-right: none; box-shadow: 2px 0 12px rgba(0,0,0,0.05); }}
    .card {{ background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); margin-bottom: 2rem; }}
    .card-header {{ background-color: var(--card-bg); border-bottom: 1px solid var(--border-color); border-radius: 12px 12px 0 0 !important; font-weight: 600; padding: 1.25rem 1.5rem; }}
    .card-body {{ padding: 1.5rem; }}
    .table {{ color: var(--text-color); font-family: 'Assistant', sans-serif; }}
    .table-dark {{ --bs-table-bg: var(--card-bg) !important; --bs-table-color: var(--text-color) !important; --bs-table-border-color: var(--border-color) !important; }}
    .nav-link {{ color: var(--sidebar-text); border-radius: 0px; margin: 4px 12px; font-weight: 500; transition: all 0.2s ease; font-family: 'Assistant', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }}
    .nav-link:hover, .nav-link.active {{ background-color: var(--sidebar-hover-bg); color: var(--sidebar-text); transform: translateX(2px); border-radius: 6px; }}
    .text-muted {{ color: {muted} !important; }}
    .border-bottom {{ border-color: var(--border-color) !important; }}
    .btn-primary {{ background-color: var(--btn-bg); border-color: var(--btn-bg); color: var(--btn-txt); border-radius: 2rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; font-family: 'Assistant', sans-serif; transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.2s ease; padding: 0.6rem 1.75rem; }}
    .btn-primary:hover, .btn-primary:focus, .btn-primary:active {{ background-color: var(--btn-hvr) !important; border-color: var(--btn-hvr) !important; color: var(--btn-txt) !important; transform: translateY(-1px); }}
    
    /* Overrides to map hardcoded dark classes */
    .text-light, .text-white {{ color: var(--text-color) !important; }}
    .bg-dark, .bg-secondary {{ background-color: var(--card-bg) !important; }}
    .border-secondary {{ border-color: var(--border-color) !important; }}
    .modal-content, .offcanvas {{ background-color: var(--card-bg) !important; color: var(--text-color) !important; border-color: var(--border-color) !important; border-radius: 12px; }}
    .form-control, .form-control:focus {{
        background-color: {inp_bg} !important;
        color: var(--text-color) !important;
        border: {inp_border} !important;
        border-radius: {inp_br} !important;
        box-shadow: none !important;
        padding: 0.75rem 1.25rem;
    }}
    .form-select, .form-select:focus {{
        background-color: {inp_bg} !important;
        color: var(--text-color) !important;
        border: {inp_border} !important;
        border-radius: {inp_br} !important;
        box-shadow: none !important;
    }}
    .btn-outline-light {{ color: var(--text-color) !important; border-color: var(--border-color) !important; border-radius: {inp_br} !important; }}
    .btn-outline-light:hover, .btn-outline-light:focus, .btn-outline-light:active {{ background-color: var(--sidebar-hover-bg) !important; color: var(--sidebar-text) !important; border-color: var(--sidebar-hover-bg) !important; }}
    </style>
    """

    return dict(
        active_company=company,
        all_companies=all_companies,
        companies=all_companies, # Provide fallback naming
        locations=locations,
        active_location=active_location,
        theme_color=primary,
        theme_bg=theme_bg_type,
        dynamic_css=dynamic_css,
        is_clocked_in=locals().get('is_clocked_in', False),
        missing_clock_out_alert=locals().get('missing_clock_out_alert', False),
        missing_clock_in_alert=locals().get('missing_clock_in_alert', False)
    )

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('dashboard'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '')
        password = request.form.get('password', '')
        remember = request.form.get('remember') == 'on'
        
        from database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE email = %s AND active = TRUE", (email,))
        user = cursor.fetchone()
        
        if user:
            is_valid_password = check_password_hash(user['password_hash'], password) if user.get('password_hash') else False
            is_valid_pin = False
            # If they entered a 4-digit pin in the password field, check the pin hash
            if user.get('pin_hash') and password.isdigit() and len(password) == 4:
                is_valid_pin = check_password_hash(user['pin_hash'], password)
                
            if is_valid_password or is_valid_pin:
                if remember:
                    session.permanent = True
                session['user_id'] = user['id']
                session['company_id'] = user['company_id']
                session['location_id'] = 0 if user['role'] == 'Owner' else user['location_id']
                session['role'] = user['role']
                session['name'] = f"{user['first_name']} {user['last_name']}"
                
                flash("Successfully logged in.", "success")
                return redirect(url_for('dashboard'))
            else:
                flash("Invalid email or password/PIN.", "error")
        else:
            flash("Invalid email or password.", "error")
            
    return render_template('login.html')

@app.route('/demo_login', methods=['POST'])
def demo_login():
    """Allows 1-click bypass for demo presentations by logging into the primary Owner account."""
    from database import get_db
    conn = get_db()
    cursor = conn.cursor()
    
    # Select the first active Owner. In a real demo environment, this would be a specific seeded Demo user.
    cursor.execute("SELECT * FROM users WHERE active = TRUE AND role = 'Owner' ORDER BY id ASC LIMIT 1")
    demo_user = cursor.fetchone()
    
    if demo_user:
        session['user_id'] = demo_user['id']
        session['company_id'] = demo_user['company_id']
        session['location_id'] = 0 if demo_user['role'] == 'Owner' else demo_user['location_id']
        session['role'] = demo_user['role']
        session['name'] = f"{demo_user['first_name']} {demo_user['last_name']} (Demo)"
        session['is_demo'] = True
        
        return redirect(url_for('dashboard'))
    else:
        flash("Demo account not configured.", "error")
        return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/switch_company/<int:company_id>', methods=['POST'])
def switch_company(company_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    from database import get_db
    conn = get_db()
    cursor = conn.cursor()
    # Verify the company exists
    cursor.execute("SELECT id FROM companies WHERE id = %s", (company_id,))
    if cursor.fetchone():
        session['company_id'] = company_id
        session['location_id'] = 0 # Reset location to "All" on company switch
        flash("Company switched successfully.", "success")
    else:
        flash("Invalid company selected.", "error")
        
    return redirect(request.referrer or url_for('dashboard'))

@app.route('/switch_location/<int:location_id>', methods=['POST'])
def switch_location(location_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    if location_id == 0:
        session['location_id'] = 0
        flash("Viewing all locations.", "success")
        return redirect(request.referrer or url_for('dashboard'))
        
    from database import get_db
    conn = get_db()
    cursor = conn.cursor()
    # Verify the location exists and belongs to the active company
    cursor.execute("SELECT id FROM locations WHERE id = %s AND company_id = %s", (location_id, session.get('company_id')))
    if cursor.fetchone():
        session['location_id'] = location_id
        flash("Location switched successfully.", "success")
    else:
        flash("Invalid location selected.", "error")
        
    return redirect(request.referrer or url_for('dashboard'))

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    from database import get_db
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    location_id = session.get('location_id', 0)
    
    # Dashboard metrics
    cursor.execute('''
        SELECT COUNT(a.id) as cnt FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        WHERE DATE(a.start_at) = CURRENT_DATE AND c.company_id = %s AND (a.location_id = %s OR %s = 0)
    ''', (company_id, location_id, location_id))
    today_appts = cursor.fetchone()['cnt']
    
    cursor.execute('''
        SELECT COUNT(p.id) as cnt FROM pickups p
        JOIN orders o ON p.order_id = o.id
        WHERE p.status IN ('Scheduled', 'Ready') AND o.company_id = %s AND (p.location_id = %s OR %s = 0)
    ''', (company_id, location_id, location_id))
    pickups_due = cursor.fetchone()['cnt']
    
    cursor.execute('''
        SELECT SUM(
            o.total - 
            COALESCE(paid.amount, 0) + 
            COALESCE(refunded.amount, 0)
        ) as balance
        FROM orders o
        LEFT JOIN (
            SELECT order_id, SUM(amount) as amount 
            FROM payment_ledger 
            WHERE type IN ('Deposit', 'Installment', 'Final')
            GROUP BY order_id
        ) paid ON o.id = paid.order_id
        LEFT JOIN (
            SELECT order_id, SUM(amount) as amount 
            FROM payment_ledger 
            WHERE type = 'Refund'
            GROUP BY order_id
        ) refunded ON o.id = refunded.order_id
        WHERE o.status != 'Cancelled' AND o.company_id = %s AND (o.location_id = %s OR %s = 0)
    ''', (company_id, location_id, location_id))
    row = cursor.fetchone()
    outstanding = row['balance'] if row and row['balance'] else 0.0
    
    cursor.execute('''
        SELECT COUNT(po.id) as cnt FROM purchase_orders po
        JOIN vendors v ON po.vendor_id = v.id
        WHERE po.status IN ('Submitted', 'Partially_Received') AND v.company_id = %s
    ''', (company_id,))
    po_count = cursor.fetchone()['cnt']
    
    # Today's schedule
    cursor.execute('''
        SELECT a.start_at, c.first_name || ' ' || c.last_name as customer_name, 
               s.name as service_name, u.first_name as stylist_name, a.status, c.wedding_date
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        JOIN services s ON a.service_id = s.id
        LEFT JOIN users u ON a.assigned_staff_id = u.id
        WHERE DATE(a.start_at) = CURRENT_DATE AND c.company_id = %s AND (a.location_id = %s OR %s = 0)
        ORDER BY a.start_at ASC
    ''', (company_id, location_id, location_id))
    schedule = cursor.fetchall()
        
    # Fetch data for New Appointment modal
    cursor.execute("SELECT id, first_name, last_name FROM customers WHERE company_id = %s ORDER BY first_name", (company_id,))
    customers = cursor.fetchall()
    
    cursor.execute("SELECT id, name FROM services WHERE company_id = %s ORDER BY name", (company_id,))
    services_list = cursor.fetchall()
    
    cursor.execute("SELECT id, first_name, last_name, role FROM users WHERE company_id = %s ORDER BY first_name", (company_id,))
    staff_list = cursor.fetchall()
        
    return render_template('dashboard.html',
                          today_appts=today_appts,
                          pickups_due=pickups_due,
                          outstanding=outstanding,
                          po_count=po_count,
                          schedule=schedule,
                          customers=customers,
                          services_list=services_list,
                          staff_list=staff_list)

@app.route('/api/dashboard/schedule_view')
def dashboard_schedule_view():
    if 'user_id' not in session:
        return {"error": "Unauthorized"}, 401
        
    period = request.args.get('range', 'day')
    
    from database import get_db
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    location_id = session.get('location_id', 0)
    
    if period == 'week':
        date_filter = "DATE(a.start_at) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 days'"
    elif period == 'month':
        date_filter = "DATE(a.start_at) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'"
    else: # day or default
        date_filter = "DATE(a.start_at) = CURRENT_DATE"
        
    query = '''
        SELECT a.start_at, c.first_name || ' ' || c.last_name as customer_name, 
               s.name as service_name, u.first_name as stylist_name, a.status, c.wedding_date
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        JOIN services s ON a.service_id = s.id
        LEFT JOIN users u ON a.assigned_staff_id = u.id
        WHERE {{date_filter}} AND c.company_id = ? AND (a.location_id = ? OR ? = 0)
        ORDER BY a.start_at ASC
    '''.replace('{date_filter}', date_filter) # Safe string replacement since date_filter is hardcoded internally
    
    cursor.execute(query, (company_id, location_id, location_id))
    schedule = [dict(row) for row in cursor.fetchall()]
    
    return {"schedule": schedule}

@app.route('/api/dashboard/drilldown/<metric>')
def dashboard_drilldown(metric):
    if 'user_id' not in session:
        return {"error": "Unauthorized"}, 401
        
    from database import get_db
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    location_id = session.get('location_id', 0)
    
    if metric == 'appointments_today':
        cursor.execute('''
            SELECT a.start_at as "Time", c.first_name || ' ' || c.last_name as "Customer", 
                   s.name as "Service", COALESCE(u.first_name, 'Unassigned') as "Stylist", 
                   a.status as "Status"
            FROM appointments a
            JOIN customers c ON a.customer_id = c.id
            JOIN services s ON a.service_id = s.id
            LEFT JOIN users u ON a.assigned_staff_id = u.id
            WHERE DATE(a.start_at) = CURRENT_DATE AND c.company_id = %s AND (a.location_id = %s OR %s = 0)
            ORDER BY a.start_at ASC
        ''', (company_id, location_id, location_id))
        rows = [dict(row) for row in cursor.fetchall()]
        return {"total_records": len(rows), "data": rows, "columns": ["Time", "Customer", "Service", "Stylist", "Status"]}
        
    elif metric == 'pickups_due':
        cursor.execute('''
            SELECT p.scheduled_at as "Date", '#' || o.id as "Order #", 
                   c.first_name || ' ' || c.last_name as "Customer", p.status as "Status"
            FROM pickups p
            JOIN orders o ON p.order_id = o.id
            JOIN customers c ON o.customer_id = c.id
            WHERE p.status IN ('Scheduled', 'Ready') AND o.company_id = %s AND (p.location_id = %s OR %s = 0)
            ORDER BY p.scheduled_at ASC
        ''', (company_id, location_id, location_id))
        rows = [dict(row) for row in cursor.fetchall()]
        return {"total_records": len(rows), "data": rows, "columns": ["Date", "Order #", "Customer", "Status"]}
        
    elif metric == 'outstanding_balances':
        cursor.execute('''
            SELECT '#' || order_id as "Order #", customer as "Customer", status as "Status", 
                   TO_CHAR(balance, 'FM$999,999,990.00') as "Balance"
            FROM (
                SELECT o.id as order_id, c.first_name || ' ' || c.last_name as customer, o.status,
                       o.total - 
                       COALESCE((SELECT SUM(amount) FROM payment_ledger WHERE order_id = o.id AND type IN ('Deposit', 'Installment', 'Final')), 0) +
                       COALESCE((SELECT SUM(amount) FROM payment_ledger WHERE order_id = o.id AND type = 'Refund'), 0) as balance
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE o.status != 'Cancelled' AND o.company_id = %s AND (o.location_id = %s OR %s = 0)
            )
            WHERE balance > 0
            ORDER BY balance DESC
        ''', (company_id, location_id, location_id))
        rows = [dict(row) for row in cursor.fetchall()]
        return {"total_records": len(rows), "data": rows, "columns": ["Order #", "Customer", "Status", "Balance"]}
        
    elif metric == 'awaiting_receiving':
        cursor.execute('''
            SELECT '#' || po.id as "PO #", v.name as "Vendor", po.order_date as "Order Date", 
                   po.expected_delivery as "Expected", po.status as "Status"
            FROM purchase_orders po
            JOIN vendors v ON po.vendor_id = v.id
            WHERE po.status IN ('Submitted', 'Partially_Received') AND v.company_id = %s
            ORDER BY po.order_date DESC
        ''', (company_id,))
        rows = [dict(row) for row in cursor.fetchall()]
        return {"total_records": len(rows), "data": rows, "columns": ["PO #", "Vendor", "Order Date", "Expected", "Status"]}
        
@app.route('/api/v2/drilldown/<metric>')
def universal_drilldown_v2(metric):
    if 'user_id' not in session:
        return {"error": "Unauthorized"}, 401
        
    from database import get_db
    from drilldown_engine import DrilldownEngine
    
    conn = get_db()
    engine = DrilldownEngine(conn)
    
    context = {
        'company_id': session.get('company_id'),
        'location_id': session.get('location_id'),
        'user_id': session.get('user_id'),
        'id': request.args.get('id')
    }
    
    result = engine.execute(metric, context)
    if "error" in result:
        return result, 400
        
    return result

@app.route('/api/drilldown/<type>/<int:id>')
def universal_drilldown(type, id):
    if 'user_id' not in session:
        return {"error": "Unauthorized"}, 401
        
    from database import get_db
    conn = get_db()
    cursor = conn.cursor()
    
    if type == 'appointment':
        cursor.execute('''
            SELECT a.start_at as "Time", a.end_at as "End", s.name as "Service", 
                   COALESCE(u.first_name, 'Unassigned') as "Stylist", a.status as "Status",
                   a.notes as "Notes"
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            JOIN customers c ON a.customer_id = c.id
            LEFT JOIN users u ON a.assigned_staff_id = u.id
            WHERE a.id = %s AND c.company_id = %s
        ''', (id, session.get('company_id')))
        rows = [dict(row) for row in cursor.fetchall()]
        if not rows:
             return {"error": "Appointment not found"}, 404
        return {"total_records": len(rows), "data": rows, "columns": ["Time", "End", "Service", "Stylist", "Status", "Notes"]}
        
    elif type == 'order':
        # Retrieve Order items securely bounded to company
        cursor.execute('''
            SELECT p.name as "Item", pv.size as "Size", pv.color as "Color", 
                   oi.quantity as "Qty", TO_CHAR(oi.unit_price, 'FM$999,999,990.00') as "Unit Price", 
                   TO_CHAR(oi.quantity * oi.unit_price, 'FM$999,999,990.00') as "Total"
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN product_variants pv ON oi.product_variant_id = pv.id
            JOIN products p ON pv.product_id = p.id
            WHERE oi.order_id = %s AND o.company_id = %s
        ''', (id, session.get('company_id')))
        items = [dict(row) for row in cursor.fetchall()]
        
        # We enforce company_id check so empty items array prevents leakage
        if not items:
             # Just query the order to verify ownership if there are no items
             cursor.execute("SELECT id FROM orders WHERE id = %s AND company_id = %s", (id, session.get('company_id')))
             if not cursor.fetchone():
                 return {"error": "Order not found"}, 404
                 
        return {"total_records": len(items), "data": items, "columns": ["Item", "Size", "Color", "Qty", "Unit Price", "Total"]}
        
    elif type == 'product':
        cursor.execute('''
            SELECT pv.sku_variant as "SKU", pv.size as "Size", pv.color as "Color", 
                   pv.on_hand_qty as "In Stock", CASE WHEN pv.track_inventory THEN 'Yes' ELSE 'No' END as "Tracked"
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.id
            JOIN vendors v ON p.vendor_id = v.id
            WHERE pv.product_id = %s AND v.company_id = %s
        ''', (id, session.get('company_id')))
        rows = [dict(row) for row in cursor.fetchall()]
        return {"total_records": len(rows), "data": rows, "columns": ["SKU", "Size", "Color", "In Stock", "Tracked"]}
        
    elif type == 'po':
        cursor.execute('''
            SELECT p.name as "Product", pv.sku_variant as "SKU", 
                   poi.qty_ordered as "Ordered", poi.qty_received as "Received", 
                   TO_CHAR(poi.unit_cost, 'FM$999,999,990.00') as "Cost",
                   TO_CHAR(poi.qty_ordered * poi.unit_cost, 'FM$999,999,990.00') as "Total"
            FROM purchase_order_items poi
            JOIN purchase_orders po ON poi.purchase_order_id = po.id
            JOIN vendors v ON po.vendor_id = v.id
            JOIN product_variants pv ON poi.product_variant_id = pv.id
            JOIN products p ON pv.product_id = p.id
            WHERE poi.purchase_order_id = %s AND v.company_id = %s
        ''', (id, session.get('company_id')))
        rows = [dict(row) for row in cursor.fetchall()]
        return {"total_records": len(rows), "data": rows, "columns": ["Product", "SKU", "Ordered", "Received", "Cost", "Total"]}
        
    elif type == 'pickup':
         cursor.execute('''
            SELECT p.pickup_contact_name as "Contact", p.pickup_contact_phone as "Phone",
                   p.signed_at as "Signed At", p.signed_by as "Signed By", p.notes as "Notes"
            FROM pickups p
            WHERE p.id = %s AND p.company_id = %s
         ''', (id, session.get('company_id')))
         rows = [dict(row) for row in cursor.fetchall()]
         return {"total_records": len(rows), "data": rows, "columns": ["Contact", "Phone", "Signed At", "Signed By", "Notes"]}

    return {"error": "Invalid drilldown type"}, 400

from flask import send_from_directory  # noqa: E402
import traceback  # noqa: E402

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js', mimetype='application/javascript')
from werkzeug.exceptions import HTTPException  # noqa: E402

@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return e
    with open('error_traceback.log', 'w', encoding='utf-8') as f:
        f.write(traceback.format_exc())
    return "Error captured to disk", 500

@app.route('/force-seed-database-railway')
def force_seed_database_railway():
    from flask import jsonify
    try:
        import seed_demo
        import threading
        # Run seeding in background so the request doesn't timeout
        thread = threading.Thread(target=seed_demo.seed_demo_data)
        thread.start()
        return jsonify({"message": "Database wipe and comprehensive demo seed initiated in the background! Please wait 10-15 seconds for it to complete."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    port = int(os.environ.get("PORT", 5005))
    socketio.run(app, host="0.0.0.0", port=port, debug=debug, allow_unsafe_werkzeug=True)

