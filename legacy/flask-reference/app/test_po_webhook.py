import sqlite3
DATABASE = 'roberts_enterprise.db'
def seed():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    # Force PO #1 to be Submitted
    cursor.execute("UPDATE purchase_orders SET status = 'Submitted' WHERE id = 1")
    conn.commit()
    
    cursor.execute("SELECT id FROM purchase_orders WHERE id = 1 AND status != 'Received' LIMIT 1")
    po_row = cursor.fetchone()
    if not po_row:
        print("PO #1 not found or already received.")
        return conn.close()
    po_id = po_row[0]
    cursor.execute("SELECT product_variant_id FROM purchase_order_items WHERE purchase_order_id = %s LIMIT 1", (po_id,))
    variant_row = cursor.fetchone()
    if not variant_row:
        return conn.close()
    variant_id = variant_row[0]
    cursor.execute("SELECT id FROM customers LIMIT 1")
    customer_id = cursor.fetchone()[0]
    cursor.execute("DELETE FROM reservations WHERE product_variant_id = %s", (variant_id,))
    cursor.execute("INSERT INTO reservations (product_variant_id, customer_id, reserve_from, reserve_to, status) VALUES (%s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Held')", (variant_id, customer_id))
    conn.commit()
    print(f"Set PO #1 to Submitted and Reserved Variant {variant_id} for Customer {customer_id}")
    conn.close()

if __name__ == '__main__':
    seed()
