from flask import Blueprint, render_template, redirect, url_for, session, request, flash
from database import get_db

bp = Blueprint('appointments', __name__, url_prefix='/appointments')

@bp.route('/')
def appointment_list():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    location_id = session.get('location_id', 0)
    cursor.execute('''
        SELECT a.*, c.first_name, c.last_name, s.name as service_name, u.first_name as staff_name
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        JOIN services s ON a.service_id = s.id
        LEFT JOIN users u ON a.assigned_staff_id = u.id
        WHERE c.company_id = %s AND (a.location_id = %s OR %s = 0)
        ORDER BY a.start_at ASC
    ''', (company_id, location_id, location_id))
    appointments = cursor.fetchall()
    
    # Fetch data for New Appointment modal
    cursor.execute("SELECT id, first_name, last_name FROM customers WHERE company_id = %s ORDER BY first_name", (company_id,))
    customers = cursor.fetchall()
    
    cursor.execute("SELECT id, name FROM services WHERE company_id = %s ORDER BY name", (company_id,))
    services_list = cursor.fetchall()
    
    cursor.execute("SELECT id, first_name, last_name, role FROM users WHERE company_id = %s ORDER BY first_name", (company_id,))
    staff_list = cursor.fetchall()
    
    return render_template('appointments.html', 
                           appointments=appointments,
                           customers=customers,
                           services_list=services_list,
                           staff_list=staff_list)

@bp.route('/book', methods=['POST'])
def book_appointment():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    customer_id = request.form.get('customer_id')
    service_id = request.form.get('service_id')
    start_at = request.form.get('start_at')
    end_at = request.form.get('end_at')
    assigned_staff_id = request.form.get('assigned_staff_id') or None
    session.get('company_id')
    location_id = session.get('location_id', 0)
    
    # Simple replace of 'T' to space for SQLite TIMESTAMP formatting from HTML5 input
    start_at = start_at.replace('T', ' ') if start_at else None
    end_at = end_at.replace('T', ' ') if end_at else None
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO appointments (location_id, customer_id, service_id, assigned_staff_id, start_at, end_at)
        VALUES (%s, %s, %s, %s, %s, %s)
    ''', (location_id, customer_id, service_id, assigned_staff_id, start_at, end_at))
    conn.commit()
    
    flash("Appointment booked successfully.", "success")
    return redirect(request.referrer or url_for('appointments.appointment_list'))
