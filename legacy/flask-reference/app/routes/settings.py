from flask import Blueprint, render_template, redirect, url_for, flash, session, request
from database import get_db
from utils.auth import requires_role
from werkzeug.security import generate_password_hash

bp = Blueprint('settings', __name__, url_prefix='/settings')

@bp.route('/')
@requires_role('Owner', 'Manager')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    company_id = session.get('company_id')
    conn = get_db()
    cursor = conn.cursor()
    
    # Fetch all employees with their specific regulations
    cursor.execute('''
        SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.active, 
               u.commission_type, u.commission_rate, u.hourly_wage,
               er.allow_discounts, er.max_discount_percent, er.allow_refunds,
               er.require_manager_approval_above, er.can_edit_shifts, er.can_view_wholesale_pricing
        FROM users u
        LEFT JOIN employee_regulations er ON u.id = er.user_id
        WHERE u.company_id = %s
        ORDER BY u.first_name ASC
    ''', (company_id,))
    employees = cursor.fetchall()
    
    # Fetch locations
    cursor.execute('''
        SELECT id, name, address, phone, email, active 
        FROM locations 
        WHERE company_id = %s
        ORDER BY name ASC
    ''', (company_id,))
    locations = cursor.fetchall()
    
    # Fetch general company settings (theme and gateways)
    cursor.execute('''
        SELECT theme_bg, primary_color, stripe_secret_key, stripe_publishable_key,
               qb_client_id, qb_client_secret, qb_access_token, qb_refresh_token, qb_realm_id
        FROM companies 
        WHERE id = %s
    ''', (company_id,))
    company = cursor.fetchone()
    
    # Fetch services
    cursor.execute('''
        SELECT id, name, duration_minutes, default_price, buffer_minutes, active 
        FROM services 
        WHERE company_id = %s
        ORDER BY name ASC
    ''', (company_id,))
    services = cursor.fetchall()
    
    # Fetch communication logs
    cursor.execute('''
        SELECT c.id, c.type, c.subject, c.message_body, c.status, c.created_at, cust.first_name, cust.last_name
        FROM communication_logs c
        LEFT JOIN customers cust ON c.customer_id = cust.id
        WHERE c.company_id = %s
        ORDER BY c.created_at DESC
        LIMIT 100
    ''', (company_id,))
    communication_logs = cursor.fetchall()

    # Load Commission Tiers and group by user
    cursor.execute('SELECT * FROM commission_tiers WHERE company_id = %s ORDER BY tier_level ASC', (company_id,))
    all_tiers = cursor.fetchall()
    
    # Convert employees to standard dicts so we can mutate easily
    employees_list = [dict(emp) for emp in employees]
    for emp in employees_list:
        emp['commission_tiers'] = [tier for tier in all_tiers if tier['user_id'] == emp['id']]
    
    return render_template('settings.html', employees=employees_list, locations=locations, company=company, services=services, communication_logs=communication_logs)

@bp.route('/employee/add', methods=['POST'])
@requires_role('Owner', 'Manager')
def add_employee():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    company_id = session.get('company_id')
    first_name = request.form.get('first_name')
    last_name = request.form.get('last_name')
    email = request.form.get('email')
    role = request.form.get('role')
    password = request.form.get('password')
    pin = request.form.get('pin')
    
    if not all([first_name, last_name, email, role, password, pin]):
        flash("All fields including PIN are required to invite a new employee.", "error")
        return redirect(url_for('settings.index'))
        
    hashed_password = generate_password_hash(password)
    hashed_pin = generate_password_hash(pin)
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO users (company_id, first_name, last_name, email, role, password_hash, pin_hash, active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
        ''', (company_id, first_name, last_name, email, role, hashed_password, hashed_pin))
        conn.commit()
        flash(f"Successfully added {first_name} {last_name} as a {role}.", "success")
    except Exception:
        conn.rollback()
        flash("Error adding employee (Email might already be in use).", "error")
        
    return redirect(url_for('settings.index'))

@bp.route('/employee/<int:emp_id>/update', methods=['POST'])
@requires_role('Owner', 'Manager')
def update_employee(emp_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    company_id = session.get('company_id')
    new_role = request.form.get('role')
    is_active = request.form.get('active') == 'on'
    commission_type = request.form.get('commission_type', 'NONE')
    commission_rate = float(request.form.get('commission_rate', 0.0))
    hourly_wage = float(request.form.get('hourly_wage', 0.0))
    
    # Regulations parsing
    allow_discounts = request.form.get('allow_discounts') == 'on'
    max_discount_percent = float(request.form.get('max_discount_percent', 0.0))
    allow_refunds = request.form.get('allow_refunds') == 'on'
    require_manager_approval_above = float(request.form.get('require_manager_approval_above', 0.0))
    can_edit_shifts = request.form.get('can_edit_shifts') == 'on'
    can_view_wholesale_pricing = request.form.get('can_view_wholesale_pricing') == 'on'

    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Check for PIN update
        new_pin = request.form.get('pin')
        if new_pin and len(new_pin) == 4 and new_pin.isdigit():
            hashed_pin = generate_password_hash(new_pin)
            cursor.execute('''
                UPDATE users 
                SET role = %s, active = %s, commission_type = %s, commission_rate = %s, hourly_wage = %s, pin_hash = %s
                WHERE id = %s AND company_id = %s
            ''', (new_role, is_active, commission_type, commission_rate, hourly_wage, hashed_pin, emp_id, company_id))
        else:
            cursor.execute('''
                UPDATE users 
                SET role = %s, active = %s, commission_type = %s, commission_rate = %s, hourly_wage = %s
                WHERE id = %s AND company_id = %s
            ''', (new_role, is_active, commission_type, commission_rate, hourly_wage, emp_id, company_id))
        
        # Upsert employee regulations
        cursor.execute('''
            INSERT INTO employee_regulations 
            (user_id, company_id, allow_discounts, max_discount_percent, allow_refunds, 
             require_manager_approval_above, can_edit_shifts, can_view_wholesale_pricing)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE -- Will fallback and update if existing
            -- Actually postgres doesn't have ON CONFLICT ON user_id, company_id unless it has a unique constraint.
            -- Instead, let's delete existing and reinsert (simpler for this use case since we don't have historical foreign keys chained to regulations table itself)
        ''', (emp_id, company_id, allow_discounts, max_discount_percent, allow_refunds, 
              require_manager_approval_above, can_edit_shifts, can_view_wholesale_pricing))
    except Exception:
        # Ignore and do custom delete insert manually below
        pass
        
    try:
        cursor.execute('DELETE FROM employee_regulations WHERE user_id = %s AND company_id = %s', (emp_id, company_id))
        cursor.execute('''
            INSERT INTO employee_regulations 
            (user_id, company_id, allow_discounts, max_discount_percent, allow_refunds, 
             require_manager_approval_above, can_edit_shifts, can_view_wholesale_pricing)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (emp_id, company_id, allow_discounts, max_discount_percent, allow_refunds, 
              require_manager_approval_above, can_edit_shifts, can_view_wholesale_pricing))
        
        # Safety Check: Don't let the user deactivate themselves
        if emp_id == session.get('user_id') and not is_active:
            conn.rollback()
            flash("You cannot deactivate your own account.", "error")
        else:
            # Process Custom Tiers
            cursor.execute('DELETE FROM commission_tiers WHERE user_id = %s AND company_id = %s', (emp_id, company_id))
            
            if commission_type in ['TIERED', 'TIERED_FLAT']:
                tier_levels = request.form.getlist('tier_level[]')
                tier_thresholds = request.form.getlist('tier_threshold[]')
                tier_rates = request.form.getlist('tier_rate[]')
                
                for idx, level in enumerate(tier_levels):
                    if idx < len(tier_thresholds) and idx < len(tier_rates):
                        # Ensure not blank
                        if str(level).strip() and str(tier_thresholds[idx]).strip() and str(tier_rates[idx]).strip():
                            cursor.execute('''
                                INSERT INTO commission_tiers (user_id, company_id, tier_level, revenue_threshold, commission_rate)
                                VALUES (%s, %s, %s, %s, %s)
                            ''', (emp_id, company_id, int(level), float(tier_thresholds[idx]), float(tier_rates[idx])))
            
            conn.commit()
            flash("Employee record successfully updated.", "success")
    except Exception as e:
        conn.rollback()
        flash(f"Error updating regulations/tiers: {str(e)}", "error")
        
    return redirect(url_for('settings.index'))

@bp.route('/company/update', methods=['POST'])
@requires_role('Owner', 'Manager')
def update_company():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    company_id = session.get('company_id')
    theme_bg = request.form.get('theme_bg')
    primary_color = request.form.get('primary_color')
    
    if not theme_bg or not primary_color:
        flash("Theme colors cannot be empty.", "warning")
        return redirect(url_for('settings.index'))
        
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE companies 
        SET theme_bg = %s, primary_color = %s
        WHERE id = %s
    ''', (theme_bg, primary_color, company_id))
    conn.commit()
    
    flash("Company settings updated! Please refresh to see the new theme.", "success")
    return redirect(url_for('settings.index'))

@bp.route('/location/add', methods=['POST'])
@requires_role('Owner', 'Manager')
def add_location():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    company_id = session.get('company_id')
    name = request.form.get('name')
    address = request.form.get('address')
    phone = request.form.get('phone')
    email = request.form.get('email')
    
    if not name:
        flash("Location Name is required.", "error")
        return redirect(url_for('settings.index'))
        
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO locations (company_id, name, address, phone, email, active)
        VALUES (%s, %s, %s, %s, %s, TRUE)
    ''', (company_id, name, address, phone, email))
    conn.commit()
    
    flash(f"Location '{name}' added successfully.", "success")
    return redirect(url_for('settings.index'))

@bp.route('/location/<int:loc_id>/update', methods=['POST'])
@requires_role('Owner', 'Manager')
def update_location(loc_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    company_id = session.get('company_id')
    name = request.form.get('name')
    address = request.form.get('address')
    phone = request.form.get('phone')
    email = request.form.get('email')
    is_active = request.form.get('active') == 'on'
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE locations 
        SET name = %s, address = %s, phone = %s, email = %s, active = %s
        WHERE id = %s AND company_id = %s
    ''', (name, address, phone, email, is_active, loc_id, company_id))
    conn.commit()
    
    flash(f"Location '{name}' updated successfully.", "success")
    return redirect(url_for('settings.index'))

@bp.route('/service/add', methods=['POST'])
@requires_role('Owner', 'Manager')
def add_service():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    company_id = session.get('company_id')
    name = request.form.get('name')
    duration_minutes = int(request.form.get('duration_minutes', 60))
    buffer_minutes = int(request.form.get('buffer_minutes', 0))
    default_price = float(request.form.get('default_price', 0.0))
    
    if not name:
        flash("Service Name is required.", "error")
        return redirect(url_for('settings.index'))
        
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO services (company_id, name, duration_minutes, buffer_minutes, default_price, active)
        VALUES (%s, %s, %s, %s, %s, TRUE)
    ''', (company_id, name, duration_minutes, buffer_minutes, default_price))
    conn.commit()
    
    flash(f"Service '{name}' added successfully.", "success")
    return redirect(url_for('settings.index'))

@bp.route('/service/<int:svc_id>/update', methods=['POST'])
@requires_role('Owner', 'Manager')
def update_service(svc_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    company_id = session.get('company_id')
    name = request.form.get('name')
    duration_minutes = int(request.form.get('duration_minutes', 60))
    buffer_minutes = int(request.form.get('buffer_minutes', 0))
    default_price = float(request.form.get('default_price', 0.0))
    is_active = request.form.get('active') == 'on'
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE services 
        SET name = %s, duration_minutes = %s, buffer_minutes = %s, default_price = %s, active = %s
        WHERE id = %s AND company_id = %s
    ''', (name, duration_minutes, buffer_minutes, default_price, is_active, svc_id, company_id))
    conn.commit()
    
    flash(f"Service '{name}' updated successfully.", "success")
    return redirect(url_for('settings.index'))

@bp.route('/gateways/update', methods=['POST'])
@requires_role('Owner')
def update_gateways():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    company_id = session.get('company_id')
    stripe_sec = request.form.get('stripe_secret_key', '')
    stripe_pub = request.form.get('stripe_publishable_key', '')
    qb_client = request.form.get('qb_client_id', '')
    qb_secret = request.form.get('qb_client_secret', '')
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE companies 
            SET stripe_secret_key = %s, stripe_publishable_key = %s,
                qb_client_id = %s, qb_client_secret = %s
            WHERE id = %s
        ''', (stripe_sec, stripe_pub, qb_client, qb_secret, company_id))
        conn.commit()
        flash("External Gateways updated successfully. (Changes apply immediately)", "success")
    except Exception as e:
        conn.rollback()
        flash(f"Error updating credentials: {str(e)}", "error")
        
    return redirect(url_for('settings.index'))
