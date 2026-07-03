from flask import Blueprint, render_template, redirect, url_for, flash, session, request
from database import get_db
from services.communications import send_arrival_notification

bp = Blueprint('purchasing', __name__, url_prefix='/purchasing')

@bp.route('/')
def vendor_list():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    
    # Get vendors
    cursor.execute('''
        SELECT v.*, 
            COUNT(po.id) as open_orders,
            SUM(po.total_cost) as total_spent
        FROM vendors v
        LEFT JOIN purchase_orders po ON v.id = po.vendor_id AND po.status IN ('Draft', 'Submitted', 'Partially_Received')
        WHERE v.company_id = %s
        GROUP BY v.id
        ORDER BY v.name ASC
    ''', (company_id,))
    vendors = cursor.fetchall()

    # Get recent POs
    cursor.execute('''
        SELECT po.*, v.name as vendor_name 
        FROM purchase_orders po
        JOIN vendors v ON po.vendor_id = v.id
        WHERE v.company_id = %s
        ORDER BY po.order_date DESC
        LIMIT 10
    ''', (company_id,))
    pos = cursor.fetchall()
    
    # KPIs for Drilldowns
    cursor.execute('''
        SELECT COUNT(po.id) as count, SUM(po.total_cost) as expected_cost
        FROM purchase_orders po
        JOIN vendors v ON po.vendor_id = v.id
        WHERE v.company_id = %s AND po.status != 'Received'
    ''', (company_id,))
    po_stats = cursor.fetchone()
    total_open_pos = po_stats['count'] if po_stats and po_stats['count'] else 0
    total_expected_cost = po_stats['expected_cost'] if po_stats and po_stats['expected_cost'] else 0
    total_active_vendors = len(vendors)
    
    return render_template('purchasing.html', 
                           vendors=vendors, 
                           pos=pos,
                           total_active_vendors=total_active_vendors,
                           total_open_pos=total_open_pos,
                           total_expected_cost=total_expected_cost)

@bp.route('/api/drilldown/<metric>')
def drilldown_api(metric):
    if 'user_id' not in session:
        return {"error": "Unauthorized"}, 401
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    
    if metric == 'active_vendors':
        cursor.execute('''
            SELECT name as "Vendor Name", contact_name as "Contact", email as "Email", phone as "Phone"
            FROM vendors WHERE company_id = %s ORDER BY name ASC
        ''', (company_id,))
        rows = [dict(row) for row in cursor.fetchall()]
        return {"total_records": len(rows), "data": rows, "columns": ["Vendor Name", "Contact", "Email", "Phone"]}
        
    elif metric == 'open_orders':
        cursor.execute('''
            SELECT '#' || po.id as "PO #", v.name as "Vendor", po.order_date as "Order Date", po.expected_delivery as "Expected", po.status as "Status"
            FROM purchase_orders po
            JOIN vendors v ON po.vendor_id = v.id
            WHERE v.company_id = %s AND po.status != 'Received'
            ORDER BY po.order_date DESC
        ''', (company_id,))
        rows = [dict(row) for row in cursor.fetchall()]
        return {"total_records": len(rows), "data": rows, "columns": ["PO #", "Vendor", "Order Date", "Expected", "Status"]}
        
    elif metric == 'expected_cost':
        cursor.execute('''
            SELECT '#' || po.id as "PO #", v.name as "Vendor", po.status as "Status", TO_CHAR(po.total_cost, 'FM$999,999,990.00') as "Amount"
            FROM purchase_orders po
            JOIN vendors v ON po.vendor_id = v.id
            WHERE v.company_id = %s AND po.status != 'Received'
            ORDER BY po.total_cost DESC
        ''', (company_id,))
        rows = [dict(row) for row in cursor.fetchall()]
        return {"total_records": len(rows), "data": rows, "columns": ["PO #", "Vendor", "Status", "Amount"]}
        
    return {"error": "Invalid metric"}, 400

@bp.route('/vendor/<int:id>')
def vendor_detail(id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Get vendor info securely
    cursor.execute('SELECT * FROM vendors WHERE id = %s AND company_id = %s', (id, session.get('company_id')))
    vendor = cursor.fetchone()
    
    if not vendor:
        flash("Vendor not found.", "error")
        return redirect(url_for('purchasing.vendor_list'))
        
    # Get PO history for this vendor
    cursor.execute('''
        SELECT * FROM purchase_orders 
        WHERE vendor_id = %s 
        ORDER BY order_date DESC
    ''', (id,))
    pos = cursor.fetchall()
    
    return render_template('vendor_detail.html', vendor=vendor, pos=pos)

@bp.route('/po/<int:id>/receive', methods=['POST'])
def receive_po(id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    
    # Simple validation that the PO exists and belongs to the active tenant
    cursor.execute('''
        SELECT po.id, po.vendor_id, v.company_id
        FROM purchase_orders po
        JOIN vendors v ON po.vendor_id = v.id
        WHERE po.id = %s AND v.company_id = %s
    ''', (id, company_id))
    
    if not cursor.fetchone():
        flash("PO not found or unauthorized.", "error")
        return redirect(url_for('purchasing.vendor_list'))
        
    # Mark PO as Received
    cursor.execute("UPDATE purchase_orders SET status = 'Received' WHERE id = %s", (id,))
    
    # 1. Fetch all items on this PO
    cursor.execute('''
        SELECT poi.product_variant_id, p.name as product_name
        FROM purchase_order_items poi
        JOIN product_variants pv ON poi.product_variant_id = pv.id
        JOIN products p ON pv.product_id = p.id
        WHERE poi.purchase_order_id = %s
    ''', (id,))
    po_items = cursor.fetchall()
    
    # 2. Cross-reference reservations to see if these incoming variants are earmarked for a Bride.
    for item in po_items:
        cursor.execute('''
            SELECT customer_id 
            FROM reservations 
            WHERE product_variant_id = %s AND status IN ('Held', 'Confirmed')
        ''', (item['product_variant_id'],))
        reservations = cursor.fetchall()
        
        # 3. Fire Webhook
        for res in reservations:
            send_arrival_notification(company_id=company_id, customer_id=res['customer_id'], product_name=item['product_name'])
            
    conn.commit()
    flash(f"Purchase Order #{id:04d} successfully received. Arrival notifications have been dispatched to the relevant brides.", "success")
    return redirect(url_for('purchasing.vendor_list'))

@bp.route('/vendor/add', methods=['POST'])
def add_vendor():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    name = request.form.get('name')
    contact_name = request.form.get('contact_name')
    email = request.form.get('email')
    phone = request.form.get('phone')
    lead_time_days = request.form.get('lead_time_days', 0)
    company_id = session.get('company_id')
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO vendors (company_id, name, contact_name, email, phone, lead_time_days)
        VALUES (%s, %s, %s, %s, %s, %s)
    ''', (company_id, name, contact_name, email, phone, lead_time_days))
    conn.commit()
    
    flash("Vendor added successfully.", "success")
    return redirect(url_for('purchasing.vendor_list'))

@bp.route('/po/add', methods=['POST'])
def create_po():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    vendor_id = request.form.get('vendor_id')
    expected_delivery = request.form.get('expected_delivery')
    notes = request.form.get('notes')
    user_id = session.get('user_id')
    
    if not expected_delivery:
        expected_delivery = None
        
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify vendor belongs to company
    cursor.execute("SELECT id FROM vendors WHERE id = %s AND company_id = %s", (vendor_id, session.get('company_id')))
    if not cursor.fetchone():
        flash("Invalid vendor selected.", "error")
        return redirect(url_for('purchasing.vendor_list'))
        
    cursor.execute('''
        INSERT INTO purchase_orders (vendor_id, expected_delivery, notes, created_by, status)
        VALUES (%s, %s, %s, %s, 'Draft') RETURNING id
    ''', (vendor_id, expected_delivery, notes, user_id))
    new_po_id = cursor.fetchone()['id']
    conn.commit()
    
    flash(f"Purchase Order Draft #{new_po_id:04d} created.", "success")
    # Redirect to PO detail / vendor detail view
    return redirect(url_for('purchasing.vendor_detail', id=vendor_id))
