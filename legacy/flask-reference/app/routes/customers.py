from flask import Blueprint, render_template, redirect, url_for, flash, session, request, jsonify
from database import get_db

bp = Blueprint('customers', __name__, url_prefix='/customers')

@bp.route('/')
def customer_list():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    location_id = session.get('location_id', 0)
    
    cursor.execute('''
        SELECT c.*, 
            (SELECT COUNT(*) FROM appointments WHERE customer_id = c.id) as appt_count,
            (SELECT SUM(total) FROM orders WHERE customer_id = c.id) as total_spent
        FROM customers c
        WHERE c.company_id = %s AND (c.location_id = %s OR %s = 0)
        ORDER BY c.created_at DESC
    ''', (company_id, location_id, location_id))
    customers = cursor.fetchall()

    try:
        return render_template('customers.html', customers=customers)
    except Exception:
        import traceback
        traceback.print_exc()
        raise

@bp.route('/<int:id>')
def customer_detail(id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM customers WHERE id = %s AND company_id = %s', (id, session.get('company_id')))
    customer = cursor.fetchone()
    
    if not customer:
        flash("Customer not found or access denied.", "error")
        return redirect(url_for('customers.customer_list'))
        
    cursor.execute('SELECT * FROM appointments WHERE customer_id = %s ORDER BY start_at DESC', (id,))
    appointments = cursor.fetchall()
    
    cursor.execute('SELECT * FROM orders WHERE customer_id = %s ORDER BY created_at DESC', (id,))
    orders = cursor.fetchall()
    
    cursor.execute('SELECT * FROM customer_measurements WHERE customer_id = %s', (id,))
    measurements = cursor.fetchone()
    
    # Get vendors that have active size charts
    cursor.execute('''
        SELECT DISTINCT v.id, v.name 
        FROM vendors v 
        JOIN designer_size_charts d ON v.id = d.vendor_id 
        WHERE v.company_id = %s 
        ORDER BY v.name
    ''', (session.get('company_id'),))
    designers = cursor.fetchall()

    return render_template('customer_detail.html', customer=customer, appointments=appointments, orders=orders, measurements=measurements, designers=designers)

@bp.route('/<int:id>/measurements', methods=['POST'])
def save_measurements(id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify company_id
    cursor.execute('SELECT id FROM customers WHERE id = %s AND company_id = %s', (id, session.get('company_id')))
    if not cursor.fetchone():
        flash("Unauthorized", "error")
        return redirect(url_for('customers.customer_list'))
    
    bust = request.form.get('bust', 0.0)
    waist = request.form.get('waist', 0.0)
    hips = request.form.get('hips', 0.0)
    hollow_to_hem = request.form.get('hollow_to_hem', 0.0)
    
    cursor.execute("SELECT id FROM customer_measurements WHERE customer_id = %s", (id,))
    if cursor.fetchone():
        cursor.execute("UPDATE customer_measurements SET bust=%s, waist=%s, hips=%s, hollow_to_hem=%s, updated_at=CURRENT_TIMESTAMP WHERE customer_id=%s", (bust, waist, hips, hollow_to_hem, id))
    else:
        cursor.execute("INSERT INTO customer_measurements (customer_id, bust, waist, hips, hollow_to_hem) VALUES (%s, %s, %s, %s, %s)", (id, bust, waist, hips, hollow_to_hem))
        
    conn.commit()
    flash("Measurements saved successfully.", "success")
    return redirect(url_for('customers.customer_detail', id=id))

@bp.route('/api/customers/<int:id>/recommend_size')
def recommend_size(id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify company_id
    cursor.execute('SELECT id FROM customers WHERE id = %s AND company_id = %s', (id, session.get('company_id')))
    if not cursor.fetchone():
        return jsonify({"error": "Unauthorized"}), 403
        
    vendor_id = request.args.get('vendor_id')
    if not vendor_id:
        return jsonify({"error": "Missing vendor_id"}), 400
    
    cursor.execute('SELECT * FROM customer_measurements WHERE customer_id = %s', (id,))
    meas = cursor.fetchone()
    
    if not meas or (meas['bust'] == 0 and meas['waist'] == 0 and meas['hips'] == 0):
        return jsonify({"error": "No measurements on file. Save measurements first."}), 404
        
    bride_bust = meas['bust']
    bride_waist = meas['waist']
    bride_hips = meas['hips']
    
    cursor.execute('SELECT * FROM designer_size_charts WHERE vendor_id = %s ORDER BY bust ASC', (vendor_id,))
    charts = cursor.fetchall()
    
    if not charts:
        return jsonify({"error": "No size charts found for this designer"}), 404
        
    # Logic: Finding the minimum size where chart dims are ALL >= bride dims
    recommended_size = None
    limiting_factor = []
    
    for chart in charts:
        if chart['bust'] >= bride_bust and chart['waist'] >= bride_waist and chart['hips'] >= bride_hips:
            recommended_size = chart['size_label']
            
            # Determine limiting factor (the measurement closest to maxing out the size bracket)
            diffs = {
                'Bust': chart['bust'] - bride_bust,
                'Waist': chart['waist'] - bride_waist,
                'Hips': chart['hips'] - bride_hips
            }
            min_diff = min(diffs.values())
            for k, v in diffs.items():
                if v == min_diff:
                    limiting_factor.append(k)
            break
            
    if not recommended_size:
        return jsonify({"error": "Measurements exceed standard designer sizing chart bounds."}), 400
        
    limit_str = ' and '.join(limiting_factor)
    return jsonify({
        "success": True, 
        "recommended_size": recommended_size,
        "limiting_factor": f"{limit_str} determined this sizing"
    })

@bp.route('/add', methods=['POST'])
def add_customer():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    first_name = request.form.get('first_name')
    last_name = request.form.get('last_name')
    email = request.form.get('email')
    phone = request.form.get('phone')
    wedding_date = request.form.get('wedding_date')
    company_id = session.get('company_id')
    location_id = session.get('location_id', 0)
    
    # Handle empty date strings from HTML5 inputs
    if not wedding_date:
        wedding_date = None
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO customers (company_id, location_id, first_name, last_name, email, phone, wedding_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    ''', (company_id, location_id, first_name, last_name, email, phone, wedding_date))
    conn.commit()
    
    flash("Customer added successfully.", "success")
    return redirect(url_for('customers.customer_list'))
