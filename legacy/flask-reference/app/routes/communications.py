from flask import Blueprint, render_template, session, redirect, url_for
from database import get_db

bp = Blueprint('communications', __name__, url_prefix='/communications')

@bp.route('/')
def log_view():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    company_id = session.get('company_id')
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Fetch all sent messages
    cursor.execute('''
        SELECT cl.id, cl.type, cl.subject, cl.message_body, cl.status, cl.created_at,
               c.first_name || ' ' || c.last_name as customer_name, c.phone, c.email
        FROM communication_logs cl
        JOIN customers c ON cl.customer_id = c.id
        WHERE cl.company_id = %s
        ORDER BY cl.created_at DESC
    ''', (company_id,))
    
    logs = cursor.fetchall()
    
    return render_template('communications.html', logs=logs)
