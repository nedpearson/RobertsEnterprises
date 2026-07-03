from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from database import get_db

bp = Blueprint('transfers', __name__, url_prefix='/transfers')

@bp.route('/')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    current_location = session.get('location_id', 0)

    # Fetch active locations for the dropdown
    cursor.execute("SELECT id, name FROM locations WHERE company_id = %s AND active = TRUE", (company_id,))
    locations = cursor.fetchall()
    
    # Fetch all transfers for the company to show history and transit
    # We will join to get location names and user names
    cursor.execute('''
        SELECT t.*, 
            fl.name as from_location_name,
            tl.name as to_location_name,
            u.first_name || ' ' || u.last_name as created_by_name,
            ru.first_name || ' ' || ru.last_name as received_by_name
        FROM transfers t
        LEFT JOIN locations fl ON t.from_location_id = fl.id
        LEFT JOIN locations tl ON t.to_location_id = tl.id
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN users ru ON t.received_by = ru.id
        WHERE t.company_id = %s
        ORDER BY t.created_at DESC
    ''', (company_id,))
    
    transfers = cursor.fetchall()

    # Pre-fetch inventory to populate the create transfer dropdowns (variants currently in stock)
    cursor.execute('''
        SELECT li.id as ledger_id, li.location_id, li.qty_on_hand,
               pv.id as variant_id, pv.size, pv.color, pv.sku_variant,
               p.name as product_name, v.name as brand_name
        FROM location_inventory li
        JOIN product_variants pv ON li.product_variant_id = pv.id
        JOIN products p ON pv.product_id = p.id
        LEFT JOIN vendors v ON p.vendor_id = v.id
        WHERE p.active = TRUE AND li.qty_on_hand > 0
    ''')
    inventory_items = cursor.fetchall()

    return render_template('transfers.html', 
        locations=locations, 
        current_location=current_location,
        transfers=transfers,
        inventory_items=inventory_items
    )

@bp.route('/new', methods=['POST'])
def new_transfer():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    from_loc = request.form.get('from_location_id')
    to_loc = request.form.get('to_location_id')
    variant_id = request.form.get('product_variant_id')
    qty = int(request.form.get('qty', 1))
    notes = request.form.get('notes', '')
    
    if not all([from_loc, to_loc, variant_id]):
        flash("Please complete all required fields for the transfer.", "error")
        return redirect(url_for('transfers.dashboard'))

    if from_loc == to_loc:
        flash("Source and Destination locations cannot be the same.", "error")
        return redirect(url_for('transfers.dashboard'))

    conn = get_db()
    cursor = conn.cursor()
    company_id = session.get('company_id')
    user_id = session.get('user_id')

    try:
        # 1. Verify exact location inventory exists and is sufficient
        cursor.execute("SELECT qty_on_hand FROM location_inventory WHERE location_id = %s AND product_variant_id = %s", (from_loc, variant_id))
        stock = cursor.fetchone()
        
        if not stock or stock['qty_on_hand'] < qty:
            flash("Insufficient stock at the source location to fulfill this transfer.", "error")
            return redirect(url_for('transfers.dashboard'))
            
        # 2. Deduct from source ledger
        cursor.execute('''
            UPDATE location_inventory 
            SET qty_on_hand = qty_on_hand - %s 
            WHERE location_id = %s AND product_variant_id = %s
        ''', (qty, from_loc, variant_id))

        # 3. Create the Transfer Record
        cursor.execute('''
            INSERT INTO transfers (company_id, from_location_id, to_location_id, status, created_by, notes)
            VALUES (%s, %s, %s, 'In_Transit', %s, %s) RETURNING id
        ''', (company_id, from_loc, to_loc, user_id, notes))
        transfer_id = cursor.fetchone()['id']

        # 4. Attach the Items to the Transfer
        cursor.execute('''
            INSERT INTO transfer_items (transfer_id, product_variant_id, qty)
            VALUES (%s, %s, %s)
        ''', (transfer_id, variant_id, qty))

        conn.commit()
        flash(f"Successfully initiated transfer of {qty} item(s) to Location #{to_loc}.", "success")
        
    except Exception as e:
        conn.rollback()
        flash(f"Transfer failed: {str(e)}", "error")

    return redirect(url_for('transfers.dashboard'))

@bp.route('/<int:id>/receive', methods=['POST'])
def receive_transfer(id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    conn = get_db()
    cursor = conn.cursor()
    user_id = session.get('user_id')
    company_id = session.get('company_id')

    try:
        # 1. Verify Transfer is In Transit and belongs to company
        cursor.execute("SELECT * FROM transfers WHERE id = %s AND company_id = %s AND status = 'In_Transit'", (id, company_id))
        transfer = cursor.fetchone()
        
        if not transfer:
            flash("Transfer record invalid or already processed.", "error")
            return redirect(url_for('transfers.dashboard'))

        # 2. Get all Items belonging to Transfer
        cursor.execute("SELECT product_variant_id, qty FROM transfer_items WHERE transfer_id = %s", (id,))
        items = cursor.fetchall()

        # 3. For each item, Add to Destination Location Ledger
        for item in items:
            # Upsert into location inventory
            cursor.execute('''
                INSERT INTO location_inventory (location_id, product_variant_id, qty_on_hand)
                VALUES (%s, %s, %s)
                ON CONFLICT(location_id, product_variant_id) DO UPDATE SET
                qty_on_hand = qty_on_hand + %s
            ''', (transfer['to_location_id'], item['product_variant_id'], item['qty'], item['qty']))

        # 4. Mark Transfer as Received
        cursor.execute('''
            UPDATE transfers 
            SET status = 'Received', received_at = CURRENT_TIMESTAMP, received_by = %s
            WHERE id = %s
        ''', (user_id, id))

        conn.commit()
        flash(f"Transfer #{id} officially received into destination inventory.", "success")
        
    except Exception as e:
        conn.rollback()
        flash(f"Failed to receive transfer: {str(e)}", "error")

    return redirect(url_for('transfers.dashboard'))
