from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from database import get_db
import datetime
from utils.auth import requires_role

bp = Blueprint('staff', __name__, url_prefix='/staff')

@bp.route('/')
@requires_role('Owner', 'Manager')
def staff_list():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    
    # Get all active employees for the company, joined with location
    cursor.execute('''
        SELECT u.*, l.name as location_name 
        FROM users u
        LEFT JOIN locations l ON u.location_id = l.id
        WHERE u.company_id = %s AND u.active = TRUE
        ORDER BY u.first_name ASC
    ''', (company_id,))
    employees = cursor.fetchall()
    
    # We also need to send the locations for the "New Employee" dropdown
    cursor.execute("SELECT id, name FROM locations WHERE company_id = %s AND active = TRUE ORDER BY name ASC", (company_id,))
    locations = cursor.fetchall()
    
    return render_template('staff.html', employees=employees, locations=locations)

@bp.route('/add', methods=['POST'])
@requires_role('Owner', 'Manager')
def add_employee():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    first_name = request.form.get('first_name')
    last_name = request.form.get('last_name')
    email = request.form.get('email')
    role = request.form.get('role', 'Stylist')
    location_id = request.form.get('location_id') # Crucial requirement
    password = request.form.get('password', 'password123') # Default for demo
    
    commission_type = request.form.get('commission_type', 'NONE')
    commission_rate = request.form.get('commission_rate', '0.0')
    if not commission_rate:
        commission_rate = 0.0
        
    if commission_type == 'LOCATION':
        commission_locations = ','.join(request.form.getlist('commission_locations'))
    else:
        commission_locations = None
        
    hourly_wage = float(request.form.get('hourly_wage', 0.0) or 0.0)
    bonus = float(request.form.get('bonus', 0.0) or 0.0)
    
    pin = request.form.get('pin', '')
    
    # Mock password hashing for demo
    from werkzeug.security import generate_password_hash
    password_hash = generate_password_hash(password)
    pin_hash = generate_password_hash(pin) if pin else None
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    
    try:
        cursor.execute('''
            INSERT INTO users (company_id, location_id, email, password_hash, role, first_name, last_name, commission_type, commission_rate, commission_locations, hourly_wage, bonus, pin, pin_hash)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (company_id, location_id, email, password_hash, role, first_name, last_name, commission_type, commission_rate, commission_locations, hourly_wage, bonus, pin, pin_hash))
        conn.commit()
        flash(f"Successfully added {first_name} {last_name} to the team.", "success")
    except Exception as e:
        conn.rollback()
        flash(f"Error adding staff member: {str(e)}", "error")
        
    return redirect(url_for('staff.staff_list'))

@bp.route('/edit/<int:user_id>', methods=['POST'])
@requires_role('Owner', 'Manager')
def edit_employee(user_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))

    first_name = request.form.get('first_name')
    last_name = request.form.get('last_name')
    email = request.form.get('email')
    role = request.form.get('role', 'Stylist')
    location_id = request.form.get('location_id')
    
    commission_type = request.form.get('commission_type', 'NONE')
    commission_rate = request.form.get('commission_rate', '0.0')
    if not commission_rate:
        commission_rate = 0.0
        
    if commission_type == 'LOCATION':
        commission_locations = ','.join(request.form.getlist('commission_locations'))
    else:
        commission_locations = None
        
    hourly_wage = float(request.form.get('hourly_wage', 0.0) or 0.0)
    bonus = float(request.form.get('bonus', 0.0) or 0.0)
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    
    try:
        cursor.execute('''
            UPDATE users SET
                location_id = %s, email = %s, role = %s, first_name = %s, last_name = %s,
                commission_type = %s, commission_rate = %s, commission_locations = %s,
                hourly_wage = %s, bonus = %s
            WHERE id = %s AND company_id = %s
        ''', (location_id, email, role, first_name, last_name, commission_type, commission_rate, commission_locations, hourly_wage, bonus, user_id, company_id))
        conn.commit()
        flash(f"Successfully updated {first_name} {last_name}.", "success")
    except Exception as e:
        conn.rollback()
        flash(f"Error updating staff member: {str(e)}", "error")
        
    return redirect(url_for('staff.staff_list'))

@bp.route('/schedule')
def schedule():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    
    location_id = request.args.get('location_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not start_date:
        today = datetime.date.today()
        # Default to Monday
        start = today - datetime.timedelta(days=today.weekday())
        start_date = start.strftime('%Y-%m-%d')
    if not end_date:
        start = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
        end = start + datetime.timedelta(days=6)
        end_date = end.strftime('%Y-%m-%d')
        
    cursor.execute("SELECT * FROM locations WHERE company_id = %s", (company_id,))
    locations = cursor.fetchall()
    
    if not location_id and locations:
        location_id = locations[0]['id']
        
    # Get Active Staff
    cursor.execute('''
        SELECT * FROM users 
        WHERE company_id = %s AND active = TRUE AND (location_id = %s OR commission_locations LIKE %s)
        ORDER BY first_name ASC
    ''', (company_id, location_id, f'%"{location_id}"%'))
    staff_members = cursor.fetchall()
    
    # Get Shifts bounded by precise Day/Month/Year strings via DATE() SQLite func
    query = '''
        SELECT s.*, u.first_name, u.last_name, u.role
        FROM shifts s
        JOIN users u ON s.user_id = u.id
        WHERE s.company_id = ? AND s.location_id = ?
        AND date(s.start_time) >= date(?) AND date(s.start_time) <= date(?)
        ORDER BY s.start_time ASC
    '''
    cursor.execute(query, (company_id, location_id, start_date, end_date))
    shifts = cursor.fetchall()
    
    # Coverage Gap Detection Algorithm
    s_date = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
    e_date = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()
    
    covered_days = set()
    for s in shifts:
        # Get purely the date string
        # s.start_time is native SQLite 'YYYY-MM-DD HH:MM:SS'
        date_str = s['start_time'].split(' ')[0]
        covered_days.add(date_str)
        
    understaffed_days = []
    current_day = s_date
    while current_day <= e_date:
        d_str = current_day.strftime('%Y-%m-%d')
        if d_str not in covered_days:
            understaffed_days.append(d_str)
        current_day += datetime.timedelta(days=1)
    
    return render_template('schedule.html', 
        locations=locations, 
        current_location_id=int(location_id) if location_id else None,
        staff=staff_members,
        shifts=shifts,
        start_date=start_date,
        end_date=end_date,
        understaffed_days=understaffed_days
    )

@bp.route('/schedule/add', methods=['POST'])
@requires_role('Owner', 'Manager')
def add_shift():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    staff_id = request.form.get('staff_id')
    location_id = request.form.get('location_id')
    start_date = request.form.get('start_date') # YYYY-MM-DD
    start_time = request.form.get('start_time') # HH:MM
    end_date = request.form.get('end_date') # YYYY-MM-DD
    end_time = request.form.get('end_time') # HH:MM
    notes = request.form.get('notes', '')
    
    if not all([staff_id, location_id, start_date, start_time, end_date, end_time]):
        flash("All time fields are required.", "error")
        return redirect(url_for('staff.schedule', location_id=location_id))
        
    # Construct exact SQL timestamps: YYYY-MM-DD HH:MM:SS
    full_start = f"{start_date} {start_time}:00"
    full_end = f"{end_date} {end_time}:00"
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    
    try:
        cursor.execute('''
            INSERT INTO shifts (company_id, location_id, user_id, start_time, end_time, notes)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (company_id, location_id, staff_id, full_start, full_end, notes))
        conn.commit()
        flash("Shift scheduled successfully.", "success")
    except Exception as e:
        conn.rollback()
        flash(f"Error scheduling shift: {str(e)}", "error")
        
    return redirect(url_for('staff.schedule', location_id=location_id, start_date=start_date))

@bp.route('/schedule/delete/<int:shift_id>', methods=['POST'])
@requires_role('Owner', 'Manager')
def delete_shift(shift_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    
    try:
        cursor.execute("DELETE FROM shifts WHERE id = %s AND company_id = %s", (shift_id, company_id))
        conn.commit()
        flash("Shift removed.", "success")
    except Exception as e:
        conn.rollback()
        flash(f"Error removing shift: {str(e)}", "error")
        
    # Try to redirect to referer to maintain current filters
    referer = request.headers.get("Referer")
    if referer:
        return redirect(referer)
    return redirect(url_for('staff.schedule'))
