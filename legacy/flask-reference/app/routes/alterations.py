from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from database import get_db

bp = Blueprint('alterations', __name__)

@bp.route('/alterations')
def alterations_board():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    company_id = session.get('company_id')
    location_id = session.get('location_id', 0)
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Fetch all alterations for the active company/location
    cursor.execute('''
        SELECT a.id, c.first_name || ' ' || c.last_name as customer_name,
               a.item_description, a.status, a.due_date,
               u.first_name as seamstress_name, a.notes
        FROM alterations a
        JOIN customers c ON a.customer_id = c.id
        LEFT JOIN users u ON a.assigned_seamstress_id = u.id
        WHERE a.company_id = %s AND (a.location_id = %s OR %s = 0)
        ORDER BY a.due_date ASC
    ''', (company_id, location_id, location_id))
    
    all_tickets = [dict(row) for row in cursor.fetchall()]
    
    # Group by Kanban Lane
    kanban = {
        'Awaiting 1st Fitting': [],
        'Pinned': [],
        'Sewing': [],
        'Steaming': [],
        'Ready for Pickup': []
    }
    
    for t in all_tickets:
        # Fallback if status is weird
        if t['status'] in kanban:
            kanban[t['status']].append(t)
        else:
            kanban['Awaiting 1st Fitting'].append(t)
            
    # Fetch seamstresses for potential reassignment logic
    cursor.execute("SELECT id, first_name || ' ' || last_name as name FROM users WHERE company_id = %s AND role IN ('Owner', 'Manager', 'Alterations')", (company_id,))
    staff = cursor.fetchall()
    
    # Fetch customers for modal
    cursor.execute("SELECT id, first_name, last_name FROM customers WHERE company_id = %s ORDER BY first_name", (company_id,))
    customers = cursor.fetchall()

    return render_template('alterations.html', kanban=kanban, staff=staff, customers=customers)

@bp.route('/api/alterations/update_status', methods=['POST'])
def update_alteration_status():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json
    ticket_id = data.get('id')
    new_status = data.get('status')
    
    valid_statuses = ['Awaiting 1st Fitting', 'Pinned', 'Sewing', 'Steaming', 'Ready for Pickup']
    if not ticket_id or new_status not in valid_statuses:
        return jsonify({"error": "Invalid payload"}), 400
        
    company_id = session.get('company_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify ownership before updating
    cursor.execute("SELECT id, customer_id, item_description FROM alterations WHERE id = %s AND company_id = %s", (ticket_id, company_id))
    ticket = cursor.fetchone()
    if not ticket:
        return jsonify({"error": "Ticket not found or unauthorized"}), 403
        
    cursor.execute("UPDATE alterations SET status = %s WHERE id = %s", (new_status, ticket_id))
    conn.commit()
    
    if new_status == 'Ready for Pickup':
        from services.communications import send_ready_for_pickup
        send_ready_for_pickup(company_id, ticket['customer_id'], ticket['item_description'])
    
    return jsonify({"success": True})

@bp.route('/add', methods=['POST'])
def add_ticket():
    from flask import request as req, flash
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    company_id = session.get('company_id')
    location_id = session.get('location_id', 0)
    customer_id = req.form.get('customer_id')
    item_description = req.form.get('item_description')
    due_date = req.form.get('due_date') or None
    assigned_seamstress_id = req.form.get('assigned_seamstress_id') or None
    notes = req.form.get('notes')
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO alterations (company_id, location_id, customer_id, item_description, due_date, assigned_seamstress_id, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    ''', (company_id, location_id, customer_id, item_description, due_date, assigned_seamstress_id, notes))
    conn.commit()
    
    flash("Alteration ticket created successfully.", "success")
    return redirect(url_for('alterations.alterations_board'))
