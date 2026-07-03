from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from database import get_db
import json
from utils.auth import requires_role

bp = Blueprint('payroll', __name__, url_prefix='/payroll')

@bp.route('/')
@requires_role('Owner', 'Manager')
def payroll_dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    location_id = session.get('location_id', 0)
    
    # Get active staff members and their pending commissions
    cursor.execute('''
        SELECT u.*, 
            COALESCE(SUM(c.amount), 0) as pending_commissions,
            (SELECT COUNT(*) FROM time_entries WHERE user_id = u.id AND approved = FALSE) as unapproved_timesheets
        FROM users u
        LEFT JOIN commissions c ON u.id = c.user_id AND c.status = 'Pending'
        WHERE u.active = TRUE AND u.company_id = %s AND (u.location_id = %s OR %s = 0)
        GROUP BY u.id
        ORDER BY u.first_name ASC
    ''', (company_id, location_id, location_id))
    staff = cursor.fetchall()
    
    # Get recent commissions
    cursor.execute('''
        SELECT c.*, u.first_name, u.last_name, o.id as order_ref
        FROM commissions c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN orders o ON c.order_id = o.id
        WHERE u.company_id = %s AND (u.location_id = %s OR %s = 0)
        ORDER BY c.earned_at DESC
        LIMIT 15
    ''', (company_id, location_id, location_id))
    commissions = cursor.fetchall()
    
    # Get recent paystubs
    cursor.execute('''
        SELECT p.*, u.first_name, u.last_name 
        FROM paystubs p
        JOIN users u ON p.user_id = u.id
        WHERE p.company_id = %s
        ORDER BY p.created_at DESC
        LIMIT 20
    ''', (company_id,))
    paystubs = cursor.fetchall()
    
    return render_template('payroll.html', staff=staff, commissions=commissions, paystubs=paystubs)

@bp.route('/timesheets/<int:user_id>')
def view_timesheets(user_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if session.get('role') not in ['Owner', 'Manager'] and session.get('user_id') != user_id:
        flash("Unauthorized to view other timesheets.", "error")
        return redirect(url_for('dashboard'))
        
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))
    person = cursor.fetchone()
    
    if not person:
        flash("Staff member not found.", "error")
        return redirect(url_for('payroll.payroll_dashboard'))
        
    cursor.execute('SELECT * FROM time_entries WHERE user_id = %s ORDER BY clock_in DESC', (user_id,))
    timesheets = cursor.fetchall()
    
    unapproved_count = sum(1 for t in timesheets if not t['approved'])
    
    return render_template('timesheets.html', person=person, timesheets=timesheets, unapproved_count=unapproved_count)

@bp.route('/timesheets/<int:user_id>/approve', methods=['POST'])
def approve_timesheets(user_id):
    if 'user_id' not in session or session.get('role') != 'Owner': 
        flash("Unauthorized to approve timesheets", "error")
        return redirect(url_for('payroll.view_timesheets', user_id=user_id))
        
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute('UPDATE time_entries SET approved = TRUE WHERE user_id = %s AND approved = FALSE', (user_id,))
        conn.commit()
        flash("All pending timesheets approved.", "success")
    except Exception as e:
        conn.rollback()
        flash(f"Error approving timesheets: {str(e)}", "error")
    finally:
        pass
        
    return redirect(url_for('payroll.view_timesheets', user_id=user_id))

@bp.route('/clock_in', methods=['POST'])
def clock_in():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    conn = get_db()
    cursor = conn.cursor()
    
    entered_pin = request.form.get('pin')
    cursor.execute("SELECT pin_hash, password_hash FROM users WHERE id = %s", (session['user_id'],))
    user_data = cursor.fetchone()
    
    if user_data:
        from werkzeug.security import check_password_hash
        is_valid = False
        
        # Check if they entered their actual complex password
        if entered_pin and check_password_hash(user_data['password_hash'], entered_pin):
            is_valid = True
            
        # Check if they entered their 4-digit PIN
        elif entered_pin and user_data.get('pin_hash') and check_password_hash(user_data['pin_hash'], entered_pin):
            is_valid = True
            
        # Optional validation if neither matched but a PIN is heavily enforced. If no pin_hash is set, any clock in is fine?
        # Actually, let's strictly require one of them if they provided an input, or if pin_hash exists.
        if (user_data.get('pin_hash') or user_data.get('password_hash')):
            if not is_valid and entered_pin:
                flash("Invalid 4-digit PIN or Password.", "error")
                return redirect(request.referrer or url_for('dashboard'))
            elif not entered_pin:
                flash("Enter your PIN or Password to clock in.", "error")
                return redirect(request.referrer or url_for('dashboard'))
            
    # Check if already clocked in
    cursor.execute("SELECT id FROM time_entries WHERE user_id = %s AND clock_out IS NULL", (session['user_id'],))
    if cursor.fetchone():
        flash("You are already clocked in.", "warning")
        return redirect(request.referrer or url_for('dashboard'))
        
    try:
        cursor.execute("INSERT INTO time_entries (user_id, location_id, clock_in) VALUES (%s, %s, CURRENT_TIMESTAMP)", 
                       (session['user_id'], session.get('location_id', 0)))
        conn.commit()
        flash("Clocked in successfully.", "success")
    except Exception as e:
        conn.rollback()
        flash(f"Error clocking in: {str(e)}", "error")
        
    return redirect(request.referrer or url_for('dashboard'))

@bp.route('/clock_out', methods=['POST'])
def clock_out():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    conn = get_db()
    cursor = conn.cursor()
    
    entered_pin = request.form.get('pin')
    cursor.execute("SELECT pin_hash, password_hash FROM users WHERE id = %s", (session['user_id'],))
    user_data = cursor.fetchone()
    
    if user_data:
        from werkzeug.security import check_password_hash
        is_valid = False
        
        # Check if they entered their actual complex password
        if entered_pin and check_password_hash(user_data['password_hash'], entered_pin):
            is_valid = True
            
        # Check if they entered their 4-digit PIN
        elif entered_pin and user_data.get('pin_hash') and check_password_hash(user_data['pin_hash'], entered_pin):
            is_valid = True
            
        if (user_data.get('pin_hash') or user_data.get('password_hash')):
            if not is_valid and entered_pin:
                flash("Invalid 4-digit PIN or Password.", "error")
                return redirect(request.referrer or url_for('dashboard'))
            elif not entered_pin:
                flash("Enter your PIN or Password to clock out.", "error")
                return redirect(request.referrer or url_for('dashboard'))
            
    cursor.execute("SELECT id, clock_in FROM time_entries WHERE user_id = %s AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1", (session['user_id'],))
    entry = cursor.fetchone()
    
    if not entry:
        flash("You are not currently clocked in.", "warning")
        return redirect(request.referrer or url_for('dashboard'))
        
    try:
        cursor.execute('''
            UPDATE time_entries 
            SET clock_out = CURRENT_TIMESTAMP,
                total_hours = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - clock_in)) / 3600.0
            WHERE id = %s
        ''', (entry['id'],))
        conn.commit()
        flash("Clocked out successfully.", "success")
    except Exception as e:
        conn.rollback()
        flash(f"Error clocking out: {str(e)}", "error")
        
    return redirect(request.referrer or url_for('dashboard'))

@bp.route('/run_process', methods=['POST'])
@requires_role('Owner', 'Manager')
def run_process():
    if 'user_id' not in session or session.get('role') != 'Owner':
        flash("Unauthorized to run payroll.", "error")
        return redirect(url_for('payroll.payroll_dashboard'))
        
    start_date = request.form.get('start_date')
    end_date = request.form.get('end_date')
    
    if not start_date or not end_date:
        flash("Please provide both start and end dates.", "error")
        return redirect(url_for('payroll.payroll_dashboard'))
        
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    
    try:
        # Get active staff
        cursor.execute("SELECT * FROM users WHERE active = TRUE AND company_id = %s", (company_id,))
        staff_members = cursor.fetchall()
        
        paystubs_created = 0
        
        for person in staff_members:
            user_id = person['id']
            hourly_wage = float(person['hourly_wage'] or 0.0)
            target_bonus = float(person['bonus'] or 0.0)
            
            # --- 1. Total Approved Unpaid Hours ---
            cursor.execute('''
                SELECT SUM(total_hours) as thours
                FROM time_entries 
                WHERE user_id = %s AND status = 'Unpaid' AND approved = TRUE
                AND CAST(clock_out AS DATE) >= %s AND CAST(clock_out AS DATE) <= %s
            ''', (user_id, start_date, end_date))
            row = cursor.fetchone()
            total_hours = float(row['thours'] or 0.0)
            base_pay = round(total_hours * hourly_wage, 2)
            
            # --- 2. Total Pending Commissions ---
            cursor.execute('''
                SELECT SUM(amount) as tcomm 
                FROM commissions 
                WHERE user_id = %s AND status = 'Pending'
                AND CAST(earned_at AS DATE) >= %s AND CAST(earned_at AS DATE) <= %s
            ''', (user_id, start_date, end_date))
            row2 = cursor.fetchone()
            commission_pay = float(row2['tcomm'] or 0.0)
            
            # Skip if nothing is owed
            if total_hours == 0 and commission_pay == 0 and target_bonus == 0:
                continue
                
            total_pay = base_pay + commission_pay + target_bonus
            
            # --- 3. Generate Paystub ---
            cursor.execute('''
                INSERT INTO paystubs 
                (company_id, user_id, period_start, period_end, total_hours, hourly_rate, base_pay, commission_pay, bonus_pay, total_pay, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (company_id, user_id, start_date, end_date, total_hours, hourly_wage, base_pay, commission_pay, target_bonus, total_pay, session['user_id']))
            
            # --- 4. Mark Time and Commissions as Paid ---
            cursor.execute('''
                UPDATE time_entries SET status = 'Paid'
                WHERE user_id = %s AND status = 'Unpaid' AND approved = TRUE
                AND CAST(clock_out AS DATE) >= %s AND CAST(clock_out AS DATE) <= %s
            ''', (user_id, start_date, end_date))
            
            cursor.execute('''
                UPDATE commissions SET status = 'Paid'
                WHERE user_id = %s AND status = 'Pending'
                AND CAST(earned_at AS DATE) >= %s AND CAST(earned_at AS DATE) <= %s
            ''', (user_id, start_date, end_date))
            
            paystubs_created += 1
            
        conn.commit()
        if paystubs_created > 0:
            flash(f"Successfully generated {paystubs_created} paystubs for the period.", "success")
        else:
            flash("No paystubs were generated. There may be no approved unpaid hours or pending commissions in this range.", "warning")
            
    except Exception as e:
        conn.rollback()
        flash(f"Error running payroll: {str(e)}", "error")
        
    return redirect(url_for('payroll.payroll_dashboard'))

@bp.route('/distribute_pools', methods=['POST'])
@requires_role('Owner', 'Manager')
def distribute_pools():
    if 'user_id' not in session or session.get('role') != 'Owner':
        flash("Unauthorized to distribute pools.", "error")
        return redirect(url_for('payroll.payroll_dashboard'))
        
    month = request.form.get('month')
    year = request.form.get('year')
    
    if not month or not year:
        flash("Please provide both month and year.", "error")
        return redirect(url_for('payroll.payroll_dashboard'))
        
    month_str = f"{int(month):02d}"
    year_str = f"{int(year)}"
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    
    try:
        # Get all employees that have a commission structure
        cursor.execute("SELECT * FROM users WHERE active = TRUE AND company_id = %s AND commission_type != 'NONE' AND commission_type IS NOT NULL", (company_id,))
        staff_members = cursor.fetchall()
        
        total_payout = 0.0
        
        for person in staff_members:
            ctype = person['commission_type']
            cut = 0.0
            desc = ""
            
            # 1. Location Pool Logic
            if ctype == 'LOCATION':
                if not person['commission_locations'] or not person['commission_rate']:
                    continue
                try:
                    locations = json.loads(person['commission_locations'])
                except Exception:
                    continue
                rate = float(person['commission_rate']) / 100.0
                if not locations:
                    continue
                placeholders = ','.join('%s' for _ in locations)
                query = f'''
                    SELECT SUM(total) as pool_rev
                    FROM orders 
                    WHERE company_id = %s 
                    AND location_id IN ({placeholders})
                    AND status IN ('Active', 'Fulfilled')
                    AND EXTRACT(MONTH FROM created_at) = %s 
                    AND EXTRACT(YEAR FROM created_at) = %s
                '''
                params = [company_id] + [int(loc) for loc in locations] + [int(month), int(year)]
                cursor.execute(query, tuple(params))
                row = cursor.fetchone()
                pool_rev = float(row['pool_rev'] or 0.0)
                if pool_rev > 0:
                    cut = round(pool_rev * rate, 2)
                    desc = f"{month_str}/{year_str} Pool Payout"
                    
            # 2. Individual Sales Logic (Percentage, Flat, Tiered)
            elif ctype in ['PERCENTAGE', 'FLAT_RATE', 'TIERED', 'TIERED_FLAT']:
                # Get the person's total sales and count of orders for the month
                cursor.execute('''
                    SELECT COALESCE(SUM(total), 0.0) as my_sales, COUNT(id) as sale_count
                    FROM orders
                    WHERE company_id = %s AND sold_by_id = %s
                    AND status IN ('Active', 'Fulfilled')
                    AND EXTRACT(MONTH FROM created_at) = %s 
                    AND EXTRACT(YEAR FROM created_at) = %s
                ''', (company_id, person['id'], int(month), int(year)))
                stats = cursor.fetchone()
                my_sales = float(stats['my_sales'])
                sale_count = int(stats['sale_count'])
                
                if my_sales > 0 or sale_count > 0:
                    if ctype == 'PERCENTAGE':
                        rate = float(person.get('commission_rate') or 0.0) / 100.0
                        cut = round(my_sales * rate, 2)
                        desc = f"{month_str}/{year_str} Sales Commission ({person.get('commission_rate')}%)"
                        
                    elif ctype == 'FLAT_RATE':
                        rate = float(person.get('commission_rate') or 0.0)
                        cut = round(sale_count * rate, 2)
                        desc = f"{month_str}/{year_str} Flat Rate ({sale_count} Sales)"
                        
                    elif ctype in ['TIERED', 'TIERED_FLAT']:
                        cursor.execute('SELECT * FROM commission_tiers WHERE user_id = %s ORDER BY revenue_threshold DESC', (person['id'],))
                        tiers = cursor.fetchall()
                        
                        # Tiers are sorted highest threshold to lowest. First one we pass is our tier!
                        achieved_tier = None
                        for t in tiers:
                            if my_sales >= float(t['revenue_threshold']):
                                achieved_tier = t
                                break
                                
                        if achieved_tier:
                            rate = float(achieved_tier['commission_rate'])
                            if ctype == 'TIERED':
                                # Rate is a percentage
                                cut = round(my_sales * (rate / 100.0), 2)
                                desc = f"{month_str}/{year_str} Tier {achieved_tier['tier_level']} ({rate}%)"
                            else:
                                # Rate is a flat dollar bonus
                                cut = round(rate, 2)
                                desc = f"{month_str}/{year_str} Tier {achieved_tier['tier_level']} Flat Bonus"

            if cut > 0:
                cursor.execute('''
                    INSERT INTO commissions (user_id, description, amount, status)
                    VALUES (%s, %s, %s, 'Pending')
                ''', (person['id'], desc, cut))
                total_payout += cut
                
        conn.commit()
        if total_payout > 0:
            flash(f"Successfully distributed ${total_payout:,.2f} in location pools.", "success")
        else:
            flash("No pool revenue generated for that cycle or no eligible employees.", "warning")
            
    except Exception as e:
        conn.rollback()
        flash(f"Error distributing pools: {str(e)}", "error")
        
    return redirect(url_for('payroll.payroll_dashboard'))
