from functools import wraps
from flask import session, flash, redirect, url_for, request

def requires_role(*roles):
    """
    Role-Based Access Control (RBAC) Decorator
    Ensure the active user session holds one of the allowed roles before routing.
    
    Usage:
        @app.route('/payroll')
        @requires_role('Owner', 'Manager')
        def payroll_dashboard():
            return render_template('payroll.html')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check authentication
            if 'user_id' not in session:
                flash("Please log in to access this page.", "error")
                return redirect(url_for('login'))
                
            # Check Role
            user_role = session.get('role', '')
            if user_role not in roles:
                flash(f"Access Denied: You must be an {', '.join(roles)} to view this page.", "error")
                return redirect(request.referrer or url_for('dashboard'))
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator
