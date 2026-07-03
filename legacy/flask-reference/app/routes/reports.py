from flask import Blueprint, render_template, redirect, url_for, session, jsonify
from database import get_db
from utils.auth import requires_role

bp = Blueprint('reports', __name__, url_prefix='/reports')

@bp.route('/')
@requires_role('Owner', 'Manager')
def overview():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    location_id = session.get('location_id', 0)
    
    # Calculate global metrics
    cursor.execute("SELECT COUNT(*) as cnt FROM orders WHERE status = 'Active' AND company_id = %s AND (location_id = %s OR %s = 0)", (company_id, location_id, location_id))
    active_orders = cursor.fetchone()['cnt']
    
    cursor.execute('''
        SELECT SUM(amount) as collected 
        FROM payment_ledger pl
        JOIN orders o ON pl.order_id = o.id
        WHERE type IN ('Deposit', 'Installment', 'Final') AND o.company_id = %s AND (o.location_id = %s OR %s = 0)
    ''', (company_id, location_id, location_id))
    row = cursor.fetchone()
    total_collected = row['collected'] if row and row['collected'] else 0.0
    
    cursor.execute('''
        SELECT SUM(o.total) as total_sales, 
               SUM( (SELECT COALESCE(SUM(amount), 0) FROM payment_ledger WHERE order_id = o.id AND type IN ('Deposit', 'Installment', 'Final')) ) as total_paid
        FROM orders o
        WHERE o.company_id = %s AND (o.location_id = %s OR %s = 0)
    ''', (company_id, location_id, location_id))
    order_totals = cursor.fetchone()
    total_sales = order_totals['total_sales'] if order_totals and order_totals['total_sales'] else 0.0
    total_paid = order_totals['total_paid'] if order_totals and order_totals['total_paid'] else 0.0
    total_ar = max(0, total_sales - total_paid)
    
    cursor.execute('''
        SELECT COUNT(*) as cnt 
        FROM ai_audit_logs 
        WHERE company_id = %s
    ''', (company_id,))
    total_ai_actions = cursor.fetchone()['cnt']
    
    return render_template('reports.html', 
                          active_orders=active_orders,
                          total_collected=total_collected,
                          total_ar=total_ar,
                          total_ai_actions=total_ai_actions)

@bp.route('/api/drilldown/<metric>')
@requires_role('Owner', 'Manager')
def drilldown_api(metric):
    """
    Returns JSON tabular data for the requested metric, mimicking Forensic CPA's
    DrillDownDrawer component.
    """
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    location_id = session.get('location_id', 0)
    
    data = []
    columns = []
    
    if metric == 'collected_revenue':
        columns = ['Date', 'Order ID', 'Customer', 'Type', 'Amount', 'Method']
        cursor.execute('''
            SELECT pl.occurred_at, pl.order_id, c.first_name, c.last_name, pl.type, pl.amount, pl.method
            FROM payment_ledger pl
            JOIN customers c ON pl.customer_id = c.id
            JOIN orders o ON pl.order_id = o.id
            WHERE pl.type IN ('Deposit', 'Installment', 'Final') AND o.company_id = %s AND (o.location_id = %s OR %s = 0)
            ORDER BY pl.occurred_at DESC
        ''', (company_id, location_id, location_id))
        for row in cursor.fetchall():
            data.append({
                'Date': row['occurred_at'].split(' ')[0],
                'Order ID': f"#{row['order_id']:04d}",
                'Customer': f"{row['first_name']} {row['last_name']}",
                'Type': row['type'],
                'Amount': f"${row['amount']:,.2f}",
                'Method': row['method']
            })
            
    elif metric == 'accounts_receivable':
        columns = ['Order ID', 'Customer', 'Order Total', 'Balance Due', 'Status']
        cursor.execute('''
            SELECT o.id, c.first_name, c.last_name, o.total, o.status,
                (SELECT COALESCE(SUM(amount), 0) FROM payment_ledger WHERE order_id = o.id AND type IN ('Deposit', 'Installment', 'Final')) as paid,
                (SELECT COALESCE(SUM(amount), 0) FROM payment_ledger WHERE order_id = o.id AND type = 'Refund') as refunded
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.status != 'Cancelled' AND o.company_id = %s AND (o.location_id = %s OR %s = 0)
        ''', (company_id, location_id, location_id))
        for row in cursor.fetchall():
            balance = row['total'] - (row['paid'] - row['refunded'])
            if balance > 0.01: # Accounting for float precision
                data.append({
                    'Order ID': f"#{row['id']:04d}",
                    'Customer': f"{row['first_name']} {row['last_name']}",
                    'Order Total': f"${row['total']:,.2f}",
                    'Balance Due': f"${balance:,.2f}",
                    'Status': row['status']
                })
                
    elif metric == 'active_orders':
        columns = ['Order ID', 'Customer', 'Created', 'Status']
        cursor.execute('''
            SELECT o.id, c.first_name, c.last_name, o.created_at, o.status
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.status = 'Active' AND o.company_id = %s AND (o.location_id = %s OR %s = 0)
            ORDER BY o.created_at DESC
        ''', (company_id, location_id, location_id))
        for row in cursor.fetchall():
            data.append({
                'Order ID': f"#{row['id']:04d}",
                'Customer': f"{row['first_name']} {row['last_name']}",
                'Created': row['created_at'].split(' ')[0],
                'Status': row['status']
            })
            
    elif metric == 'ai_actions':
        columns = ['ID', 'Staff', 'Intent', 'Target Type', 'Target ID', 'Outcome', 'Time']
        cursor.execute('''
            SELECT a.id, u.first_name, u.last_name, a.parsed_intent, a.target_object_type, a.target_object_id, a.execution_outcome, a.created_at
            FROM ai_audit_logs a
            LEFT JOIN users u ON a.actor_id = u.id
            WHERE a.company_id = %s
            ORDER BY a.created_at DESC
        ''', (company_id,))
        for row in cursor.fetchall():
            data.append({
                'ID': f"#{row['id']}",
                'Staff': f"{row['first_name'] or ''} {row['last_name'] or ''}".strip(),
                'Intent': row['parsed_intent'],
                'Target Type': row['target_object_type'] or 'N/A',
                'Target ID': f"#{row['target_object_id']}" if row['target_object_id'] else 'N/A',
                'Outcome': row['execution_outcome'],
                'Time': str(row['created_at']).split('.')[0]
            })
            
    return jsonify({
        "metric": metric,
        "columns": columns,
        "data": data,
        "total_records": len(data)
    })
