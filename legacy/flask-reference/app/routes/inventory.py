from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from database import get_db

bp = Blueprint('inventory', __name__, url_prefix='/inventory')

@bp.route('/')
def catalog():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    cursor.execute('''
        SELECT p.*, v.name as vendor_name,
            (SELECT SUM(on_hand_qty) FROM product_variants WHERE product_id = p.id) as total_qty
        FROM products p
        LEFT JOIN vendors v ON p.vendor_id = v.id
        WHERE v.company_id = %s
        ORDER BY p.name ASC
    ''', (company_id,))
    products = cursor.fetchall()

    cursor.execute('SELECT * FROM vendors WHERE company_id = %s ORDER BY name ASC', (company_id,))
    vendors = cursor.fetchall()
    
    return render_template('inventory.html', products=products, vendors=vendors)

@bp.route('/product/<int:id>/reserve', methods=['POST'])
def reserve_product(id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # In a full POS, this would capture dates and specific variants
    # For Phase 4, we generate a mock reservation to prove the flow
    qty = int(request.form.get('qty', 1))
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Reserve against the first available variant for the demo
        cursor.execute('''
            SELECT pv.id 
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.id
            JOIN vendors v ON p.vendor_id = v.id
            WHERE p.id = %s AND v.company_id = %s
            LIMIT 1
        ''', (id, session.get('company_id')))
        variant = cursor.fetchone()
        
        if variant:
            cursor.execute('''
                INSERT INTO reservations (product_variant_id, quantity, status)
                VALUES (%s, %s, 'Reserved')
            ''', (variant['id'], qty))
            conn.commit()
            flash(f"Successfully reserved {qty} item(s).", "success")
        else:
            flash("No variants available to reserve.", "error")
            
    except Exception:
        conn.rollback()
    finally:
        pass
        
    return redirect(url_for('inventory.catalog'))

@bp.route('/product/add', methods=['POST'])
def add_product():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    name = request.form.get('name')
    ptype = request.form.get('type')
    sku = request.form.get('sku')
    vendor_id = request.form.get('vendor_id') or None
    brand = request.form.get('brand')
    cost = request.form.get('cost', 0.0)
    price = request.form.get('price', 0.0)
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Check for duplicate SKU globally (as it MUST be unique)
        cursor.execute('SELECT id FROM products WHERE sku = %s', (sku,))
        if cursor.fetchone():
            flash("Error: That Product SKU already exists.", "error")
            return redirect(url_for('inventory.catalog'))
            
        cursor.execute('''
            INSERT INTO products (vendor_id, type, brand, name, sku, cost, price, active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE) RETURNING id
        ''', (vendor_id, ptype, brand, name, sku, cost, price))
        
        product_id = cursor.fetchone()['id']
        
        # Create a default variant so it actually has manageable inventory
        default_variant_sku = f"{sku}-BASE"
        cursor.execute('''
            INSERT INTO product_variants (product_id, size, color, sku_variant, on_hand_qty, track_inventory)
            VALUES (%s, 'O/S', 'Default', %s, 0, 1)
        ''', (product_id, default_variant_sku))
        
        conn.commit()
        flash(f"Successfully added product: {name}", "success")
        
    except Exception as e:
        conn.rollback()
        flash(f"Failed to add product: {str(e)}", "error")
        
    return redirect(url_for('inventory.catalog'))
