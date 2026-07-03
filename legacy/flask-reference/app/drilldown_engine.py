
def safe_split(val, delim, idx, default=None):
    if not val: return default
    parts = str(val).split(delim)
    if idx < len(parts): return parts[idx]
    return default

class DrilldownEngine:
    """
    Centralized engine for the Global Drilldown Architecture.
    Maps metric IDs to raw SQL queries, parameterized safely via context.
    Provides nested drillability paths via 'drill_links'.
    """
    def __init__(self, db_conn):
        self.conn = db_conn
        self.registry = {
            # --- Dashboard KPIs ---
            'appointments_today': {
                'title': 'Appointments Today',
                'query': '''
                    SELECT a.id, a.start_at as "Time", a.end_at as "End", s.name as "Service", 
                           c.first_name || ' ' || c.last_name as "Customer", 
                           COALESCE(u.first_name, 'Unassigned') as "Stylist", a.status as "Status"
                    FROM appointments a
                    JOIN customers c ON a.customer_id = c.id
                    JOIN services s ON a.service_id = s.id
                    LEFT JOIN users u ON a.assigned_staff_id = u.id
                    WHERE date(a.start_at) = CURRENT_DATE
                    AND a.location_id IN (SELECT id FROM locations WHERE company_id = %s)
                    ORDER BY a.start_at ASC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Time", "End", "Service", "Customer", "Stylist", "Status"],
                'drill_links': {'id': 'appointment'} 
            },
            'pickups_due': {
                'title': 'Pickups Due',
                'query': '''
                    SELECT p.id, p.scheduled_at as "Date", c.first_name || ' ' || c.last_name as "Customer",
                           '#' || p.order_id as "Order", p.status as "Status", p.order_id as "_order_id"
                    FROM pickups p
                    JOIN customers c ON p.customer_id = c.id
                    WHERE p.status IN ('Scheduled', 'Ready', 'Rescheduled')
                    AND p.company_id = %s
                    ORDER BY p.scheduled_at ASC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Date", "Customer", "Order", "Status"],
                # We hide fields starting with _ but use them for linking
                'drill_links': {'id': 'pickup', '_order_id': 'url:/orders/'}
            },
            'outstanding_balances': {
                'title': 'Outstanding Balances',
                'query': '''
                    SELECT o.id, c.first_name || ' ' || c.last_name as "Customer",
                           TO_CHAR(o.total, 'FM$999,999,990.00') as "Total",
                           TO_CHAR(o.total - COALESCE((SELECT SUM(amount) FROM payment_ledger WHERE order_id = o.id AND type != 'Refund'), 0), 'FM$999,999,990.00') as "Balance Due",
                           o.status as "Status"
                    FROM orders o
                    JOIN customers c ON o.customer_id = c.id
                    WHERE o.company_id = %s AND o.status != 'Cancelled'
                    AND (o.total - COALESCE((SELECT SUM(amount) FROM payment_ledger WHERE order_id = o.id AND type != 'Refund'), 0)) > 0
                    ORDER BY "Balance Due" DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Customer", "Total", "Balance Due", "Status"],
                'drill_links': {'id': 'url:/orders/'}
            },
            'awaiting_receiving': {
                'title': 'Awaiting Receiving',
                'query': '''
                    SELECT po.id, '#' || po.id as "PO #", v.name as "Vendor", po.order_date as "Order Date", 
                           po.expected_delivery as "Expected", po.status as "Status"
                    FROM purchase_orders po
                    JOIN vendors v ON po.vendor_id = v.id
                    WHERE po.status IN ('Submitted', 'Partially_Received') AND v.company_id = %s
                    ORDER BY po.order_date DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["PO #", "Vendor", "Order Date", "Expected", "Status"],
                'drill_links': {'id': 'po'}
            },
            
            # --- Reports KPIs ---
            'active_orders': {
                'title': 'Active Orders Detail',
                'query': '''
                    SELECT o.id, c.first_name || ' ' || c.last_name as "Customer",
                           o.status as "Status", TO_CHAR(o.total, 'FM$999,999,990.00') as "Total",
                           o.created_at as "Date"
                    FROM orders o
                    JOIN customers c ON o.customer_id = c.id
                    WHERE o.company_id = %s AND o.status = 'Active'
                    ORDER BY o.created_at DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Customer", "Status", "Total", "Date"],
                'drill_links': {'id': 'url:/orders/'}
            },
            'collected_revenue': {
                'title': 'Revenue Ledger',
                'query': '''
                    SELECT pl.id, pl.occurred_at as "Date", c.first_name || ' ' || c.last_name as "Customer",
                           pl.type as "Type", pl.method as "Method", TO_CHAR(pl.amount, 'FM$999,999,990.00') as "Amount",
                           pl.order_id as "_order_id"
                    FROM payment_ledger pl
                    JOIN customers c ON pl.customer_id = c.id
                    JOIN orders o ON pl.order_id = o.id
                    WHERE o.company_id = %s AND pl.type != 'Refund'
                    ORDER BY pl.occurred_at DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Date", "Customer", "Type", "Method", "Amount"],
                'drill_links': {'_order_id': 'url:/orders/'} 
            },
            'accounts_receivable': {
                'title': 'Accounts Receivable',
                'query': '''
                    SELECT o.id, c.first_name || ' ' || c.last_name as "Customer",
                           TO_CHAR(o.total, 'FM$999,999,990.00') as "Total",
                           TO_CHAR(o.total - COALESCE((SELECT SUM(amount) FROM payment_ledger WHERE order_id = o.id AND type != 'Refund'), 0), 'FM$999,999,990.00') as "Balance Due",
                           o.status as "Status"
                    FROM orders o
                    JOIN customers c ON o.customer_id = c.id
                    WHERE o.company_id = %s AND o.status != 'Cancelled'
                    AND (o.total - COALESCE((SELECT SUM(amount) FROM payment_ledger WHERE order_id = o.id AND type != 'Refund'), 0)) > 0
                    ORDER BY "Balance Due" DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Customer", "Total", "Balance Due", "Status"],
                'drill_links': {'id': 'url:/orders/'}
            },

            # --- CRM Specific Drilldowns ---
            'customer_appointments': {
                'title': 'Customer Appointments',
                'query': '''
                    SELECT a.id, a.start_at as "Date/Time", s.name as "Service",
                           COALESCE(u.first_name, 'Unassigned') as "Stylist", a.status as "Status"
                    FROM appointments a
                    JOIN services s ON a.service_id = s.id
                    LEFT JOIN users u ON a.assigned_staff_id = u.id
                    JOIN locations l ON a.location_id = l.id
                    WHERE a.customer_id = %s AND l.company_id = %s
                    ORDER BY a.start_at DESC
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('company_id')],
                'columns': ["Date/Time", "Service", "Stylist", "Status"],
                'drill_links': {'id': 'appointment'}
            },
            'customer_orders': {
                'title': 'Customer Order History',
                'query': '''
                    SELECT o.id, o.created_at as "Date", o.status as "Status",
                           TO_CHAR(o.subtotal, 'FM$999,999,990.00') as "Subtotal",
                           TO_CHAR(o.tax, 'FM$999,999,990.00') as "Tax",
                           TO_CHAR(o.total, 'FM$999,999,990.00') as "Total"
                    FROM orders o
                    WHERE o.customer_id = %s AND o.company_id = %s
                    ORDER BY o.created_at DESC
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('company_id')],
                'columns': ["Date", "Status", "Subtotal", "Tax", "Total"],
                'drill_links': {'id': 'url:/orders/'}
            },

            # --- Inventory KPI Drilldowns ---
            'inventory_value': {
                'title': 'Inventory Valuation',
                'query': '''
                    SELECT pv.id, p.name as "Product", pv.sku_variant as "SKU", 
                           v.name as "Vendor", pv.on_hand_qty as "Qty",
                           TO_CHAR(p.cost, 'FM$999,999,990.00') as "Unit Cost",
                           TO_CHAR((pv.on_hand_qty * p.cost), 'FM$999,999,990.00') as "Total Value",
                           pv.product_id as "_product_id"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE pv.on_hand_qty > 0 AND v.company_id = %s
                    ORDER BY (pv.on_hand_qty * p.cost) DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Product", "SKU", "Vendor", "Qty", "Unit Cost", "Total Value"],
                'drill_links': {'_product_id': 'product'}
            },
            'low_stock': {
                'title': 'Low Stock Alerts',
                'query': '''
                    SELECT pv.id, p.name as "Product", pv.sku_variant as "SKU",
                           pv.size as "Size", pv.color as "Color", pv.on_hand_qty as "In Stock",
                           pv.product_id as "_product_id"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE pv.track_inventory = TRUE AND pv.on_hand_qty <= 2 
                    AND v.company_id = %s
                    ORDER BY pv.on_hand_qty ASC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Product", "SKU", "Size", "Color", "In Stock"],
                'drill_links': {'_product_id': 'product'}
            },


            # =================================================================
            # === PHASE 4: CORE OPERATIONAL WORKFLOWS (NESTED DRILLDOWNS) ===
            # =================================================================

            # 1. APPOINTMENTS
            'appointments_by_day': {
                'title': 'Appointments By Day',
                'query': '''
                    SELECT date(start_at) as "Date", count(id) as "Total Appointments", date(start_at) as "_date"
                    FROM appointments
                    WHERE location_id IN (SELECT id FROM locations WHERE company_id = %s)
                    GROUP BY "Date" ORDER BY "Date" DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Date", "Total Appointments"],
                'drill_links': {'_date': 'appointments_by_day_consultant'}
            },
            'appointments_by_day_consultant': {
                'title': 'Appointments By Consultant',
                'query': '''
                    SELECT COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') as "Consultant", 
                           count(a.id) as "Appointments",
                           %s || '|' || COALESCE(u.id, 0) as "_composite"
                    FROM appointments a LEFT JOIN users u ON a.assigned_staff_id = u.id
                    JOIN locations l ON a.location_id = l.id
                    WHERE date(a.start_at) = %s AND l.company_id = %s
                    GROUP BY "Consultant", "_composite" ORDER BY "Appointments" DESC
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('id'), ctx.get('company_id')],
                'columns': ["Consultant", "Appointments"],
                'drill_links': {'_composite': 'appointments_by_day_type'}
            },
            'appointments_by_day_type': {
                'title': 'Appointments By Service Type',
                'query': '''
                    SELECT s.name as "Service", count(a.id) as "Appointments",
                           %s || '|' || s.id as "_composite"
                    FROM appointments a JOIN services s ON a.service_id = s.id
                    JOIN locations l ON a.location_id = l.id
                    WHERE date(a.start_at) = %s AND COALESCE(a.assigned_staff_id, 0) = %s
                    AND l.company_id = %s
                    GROUP BY "Service", "_composite" ORDER BY "Appointments" DESC
                ''',
                'params': lambda ctx: [
                    ctx.get('id'), 
                    safe_split(ctx.get('id'), '|', 0), 
                    safe_split(ctx.get('id'), '|', 1), 
                    ctx.get('company_id')
                ],
                'columns': ["Service", "Appointments"],
                'drill_links': {'_composite': 'appointments_by_day_customer'}
            },
            'appointments_by_day_customer': {
                'title': 'Appointment Roster',
                'query': '''
                    SELECT a.id, c.first_name || ' ' || c.last_name as "Customer", a.start_at as "Time", a.status as "Status"
                    FROM appointments a
                    JOIN customers c ON a.customer_id = c.id
                    JOIN locations l ON a.location_id = l.id
                    WHERE date(a.start_at) = %s 
                      AND COALESCE(a.assigned_staff_id, 0) = %s
                      AND a.service_id = %s
                      AND l.company_id = %s
                    ORDER BY a.start_at ASC
                ''',
                'params': lambda ctx: [
                    safe_split(ctx.get('id'), '|', 0), 
                    safe_split(ctx.get('id'), '|', 1), 
                    safe_split(ctx.get('id'), '|', 2), 
                    ctx.get('company_id')
                ],
                'columns': ["Time", "Customer", "Status"],
                'drill_links': {'id': 'appointment'}
            },

            # 2. CUSTOMER / BRIDE JOURNEY
            'customer_pipeline_totals': {
                'title': 'Customer Pipeline',
                'query': '''
                    SELECT 
                        CASE WHEN a.id IS NULL THEN 'No Appointment'
                             WHEN o.id IS NULL THEN 'Appointed, No Order'
                             WHEN o.status != 'Fulfilled' THEN 'Active Order'
                             ELSE 'Completed' END as "Stage",
                        count(DISTINCT c.id) as "Brides",
                        CASE WHEN a.id IS NULL THEN 'stage1'
                             WHEN o.id IS NULL THEN 'stage2'
                             WHEN o.status != 'Fulfilled' THEN 'stage3'
                             ELSE 'stage4' END as "_stage"
                    FROM customers c
                    LEFT JOIN appointments a ON a.customer_id = c.id
                    LEFT JOIN orders o ON o.customer_id = c.id
                    WHERE c.company_id = %s
                    GROUP BY "Stage", "_stage" ORDER BY count(DISTINCT c.id) DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Stage", "Brides"],
                'drill_links': {'_stage': 'pipeline_stage_brides'}
            },
            'pipeline_stage_brides': {
                'title': 'Brides in pipeline stage',
                'query': '''
                    SELECT c.id as "_cid", c.first_name || ' ' || c.last_name as "Bride",
                           c.email as "Email", c.phone as "Phone"
                    FROM customers c
                    LEFT JOIN appointments a ON a.customer_id = c.id
                    LEFT JOIN orders o ON o.customer_id = c.id
                    WHERE c.company_id = %s
                    AND (
                        (%s = 'stage1' AND a.id IS NULL) OR
                        (%s = 'stage2' AND a.id IS NOT NULL AND o.id IS NULL) OR
                        (%s = 'stage3' AND o.id IS NOT NULL AND o.status != 'Fulfilled') OR
                        (%s = 'stage4' AND o.status = 'Fulfilled')
                    )
                    GROUP BY c.id ORDER BY c.first_name ASC
                ''',
                'params': lambda ctx: [
                    ctx.get('company_id'),
                    ctx.get('id'), ctx.get('id'), ctx.get('id'), ctx.get('id')
                ],
                'columns': ["Bride", "Email", "Phone"],
                'drill_links': {'_cid': 'customer_orders'}
            },

            # 3. SALES ORDERS
            'total_orders': {
                'title': 'Total Sales by Month',
                'query': '''
                    SELECT TO_CHAR(created_at, 'YYYY-MM') as "Month", count(id) as "Orders",
                           TO_CHAR(SUM(total), 'FM$999,999,990.00') as "Revenue",
                           TO_CHAR(created_at, 'YYYY-MM') as "_month"
                    FROM orders
                    WHERE company_id = %s
                    GROUP BY "Month" ORDER BY "Month" DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Month", "Orders", "Revenue"],
                'drill_links': {'_month': 'orders_by_month_consultant'}
            },
            'orders_by_month_consultant': {
                'title': 'Sales By Consultant',
                'query': '''
                    SELECT COALESCE(u.first_name || ' ' || u.last_name, 'Online/System') as "Consultant",
                           count(o.id) as "Orders", TO_CHAR(SUM(o.total), 'FM$999,999,990.00') as "Revenue",
                           %s || '|' || COALESCE(u.id, 0) as "_composite"
                    FROM orders o
                    LEFT JOIN customers c ON o.customer_id = c.id
                    LEFT JOIN users u ON c.created_by = u.id
                    WHERE TO_CHAR(o.created_at, 'YYYY-MM') = %s AND o.company_id = %s
                    GROUP BY "Consultant", "_composite" ORDER BY SUM(o.total) DESC
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('id'), ctx.get('company_id')],
                'columns': ["Consultant", "Orders", "Revenue"],
                'drill_links': {'_composite': 'orders_by_month_list'}
            },
            'orders_by_month_list': {
                'title': 'Order List',
                'query': '''
                    SELECT o.id, c.first_name || ' ' || c.last_name as "Customer",
                           TO_CHAR(o.total, 'FM$999,999,990.00') as "Total", o.status as "Status"
                    FROM orders o
                    JOIN customers c ON o.customer_id = c.id
                    WHERE TO_CHAR(o.created_at, 'YYYY-MM') = %s
                      AND COALESCE(c.created_by, 0) = %s
                      AND o.company_id = %s
                    ORDER BY o.created_at DESC
                ''',
                'params': lambda ctx: [
                    safe_split(ctx.get('id'), '|', 0), 
                    safe_split(ctx.get('id'), '|', 1), 
                    ctx.get('company_id')
                ],
                'columns': ["Customer", "Total", "Status"],
                'drill_links': {'id': 'url:/orders/'}
            },

            # 4. DEPOSITS AND PAYMENTS
            'deposits_collected': {
                'title': 'Deposits Collected',
                'query': '''
                    SELECT date(pl.occurred_at) as "Date", count(pl.id) as "Transactions", 
                           TO_CHAR(SUM(pl.amount), 'FM$999,999,990.00') as "Total",
                           date(pl.occurred_at) as "_date"
                    FROM payment_ledger pl
                    JOIN orders o ON pl.order_id = o.id
                    WHERE pl.type = 'Deposit' AND o.company_id = %s
                    GROUP BY "Date" ORDER BY "Date" DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Date", "Transactions", "Total"],
                'drill_links': {'_date': 'deposits_by_consultant'}
            },
            'deposits_by_consultant': {
                'title': 'Deposits By Consultant',
                'query': '''
                    SELECT COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as "Consultant", 
                           count(pl.id) as "Transactions", TO_CHAR(SUM(pl.amount), 'FM$999,999,990.00') as "Total",
                           %s || '|' || COALESCE(u.id, 0) as "_composite"
                    FROM payment_ledger pl
                    LEFT JOIN users u ON pl.created_by = u.id
                    JOIN orders o ON pl.order_id = o.id
                    WHERE date(pl.occurred_at) = %s AND pl.type = 'Deposit' AND o.company_id = %s
                    GROUP BY "Consultant", "_composite" ORDER BY SUM(pl.amount) DESC
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('id'), ctx.get('company_id')],
                'columns': ["Consultant", "Transactions", "Total"],
                'drill_links': {'_composite': 'deposits_by_bride'}
            },
            'deposits_by_bride': {
                'title': 'Deposits By Bride',
                'query': '''
                    SELECT pl.id as "_tx_id", c.first_name || ' ' || c.last_name as "Bride",
                           TO_CHAR(pl.amount, 'FM$999,999,990.00') as "Amount", pl.method as "Method", pl.order_id as "_order_id"
                    FROM payment_ledger pl
                    JOIN customers c ON pl.customer_id = c.id
                    JOIN orders o ON pl.order_id = o.id
                    WHERE date(pl.occurred_at) = %s AND COALESCE(pl.created_by, 0) = %s 
                      AND pl.type = 'Deposit' AND o.company_id = %s
                ''',
                'params': lambda ctx: [
                    safe_split(ctx.get('id'), '|', 0), 
                    safe_split(ctx.get('id'), '|', 1), 
                    ctx.get('company_id')
                ],
                'columns': ["Bride", "Amount", "Method"],
                'drill_links': {'_tx_id': 'transaction_detail'}
            },

            'transaction_detail': {
                'title': 'Transaction Record',
                'query': '''
                    SELECT pl.id as "Tx ID", pl.type as "Type", pl.method as "Method", 
                           TO_CHAR(pl.amount, 'FM$999,999,990.00') as "Amount", pl.occurred_at as "Timestamp",
                           c.first_name || ' ' || c.last_name as "Customer",
                           '#' || pl.order_id as "Order", pl.order_id as "_order_id", pl.reference as "Reference",
                           COALESCE(u.first_name, 'Unknown') as "Processed By"
                    FROM payment_ledger pl
                    JOIN customers c ON pl.customer_id = c.id
                    JOIN orders o ON pl.order_id = o.id
                    LEFT JOIN users u ON pl.created_by = u.id
                    WHERE pl.id = %s AND o.company_id = %s
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('company_id')],
                'columns': ["Tx ID", "Type", "Method", "Amount", "Timestamp", "Customer", "Processed By", "Reference"],
                'drill_links': {'_order_id': 'url:/orders/'}
            },

            # 5. PICKUP OPERATIONS
            'pickups_scheduled_by_date': {
                'title': 'Pickups Scheduled By Date',
                'query': '''
                    SELECT date(scheduled_at) as "Date", count(id) as "Pickups", date(scheduled_at) as "_date"
                    FROM pickups WHERE company_id = %s AND status IN ('Scheduled', 'Ready')
                    GROUP BY "Date" ORDER BY "Date" ASC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Date", "Pickups"],
                'drill_links': {'_date': 'pickups_on_date'}
            },
            'pickups_on_date': {
                'title': 'Pickups List',
                'query': '''
                    SELECT p.id, c.first_name || ' ' || c.last_name as "Customer",
                           '#' || p.order_id as "Order", p.status as "Status",
                           o.total - COALESCE((SELECT SUM(amount) FROM payment_ledger WHERE order_id = p.order_id AND type != 'Refund'), 0) as "Balance Due",
                           p.order_id as "_order_id"
                    FROM pickups p
                    JOIN customers c ON p.customer_id = c.id
                    JOIN orders o ON p.order_id = o.id
                    WHERE date(p.scheduled_at) = %s AND p.company_id = %s AND p.status IN ('Scheduled', 'Ready')
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('company_id')],
                'columns': ["Customer", "Order", "Status", "Balance Due"],
                'drill_links': {'id': 'pickup', '_order_id': 'url:/orders/'}
            },

            # 6. ALTERATIONS AND FITTINGS
            'fittings_scheduled': {
                'title': 'Fittings Scheduled',
                'query': '''
                    SELECT date(a.start_at) as "Date", count(a.id) as "Fittings", date(a.start_at) as "_date"
                    FROM appointments a
                    JOIN services s ON a.service_id = s.id
                    JOIN locations l ON a.location_id = l.id
                    WHERE s.name LIKE '%%Fit%%' AND l.company_id = %s AND a.status = 'Scheduled'
                    GROUP BY "Date" ORDER BY "Date" ASC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Date", "Fittings"],
                'drill_links': {'_date': 'appointments_by_day_customer'}
            },

            # 8. EMPLOYEE PERFORMANCE
            'staff_performance': {
                'title': 'Sales & Performance by Employee',
                'query': '''
                    SELECT u.id as "_uid", u.first_name || ' ' || u.last_name as "Employee",
                           (SELECT count(*) FROM orders o JOIN customers c ON o.customer_id = c.id WHERE c.created_by = u.id) as "Orders Closed",
                           (SELECT count(*) FROM appointments a WHERE a.assigned_staff_id = u.id) as "Appts Handled",
                           u.role as "Role"
                    FROM users u
                    WHERE u.company_id = %s AND u.active = TRUE
                    ORDER BY "Orders Closed" DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Employee", "Role", "Orders Closed", "Appts Handled"],
                'drill_links': {'_uid': 'orders_by_month_consultant'}
            },


            # =================================================================
            # === PHASE 5: INVENTORY & VENDORS (NESTED DRILLDOWNS) ===
            # =================================================================

            # 1. VENDORS & PRODUCTS
            'active_vendors_list': {
                'title': 'Active Vendor Directory',
                'query': '''
                    SELECT v.id as "_vid", v.name as "Vendor", v.contact_name as "Contact",
                           v.email as "Email", count(p.id) as "Products Supplied"
                    FROM vendors v
                    LEFT JOIN products p ON p.vendor_id = v.id
                    WHERE v.company_id = %s AND v.active = TRUE
                    GROUP BY v.id ORDER BY v.name ASC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Vendor", "Contact", "Email", "Products Supplied"],
                'drill_links': {'_vid': 'vendor_products'}
            },
            'vendor_products': {
                'title': 'Products by Vendor',
                'query': '''
                    SELECT p.id as "_pid", p.sku as "Base SKU", p.name as "Product",
                           p.type as "Category", TO_CHAR(p.cost, 'FM$999,999,990.00') as "Unit Cost"
                    FROM products p
                    WHERE p.vendor_id = %s AND p.active = TRUE
                ''',
                'params': lambda ctx: [ctx.get('id')],
                'columns': ["Base SKU", "Product", "Category", "Unit Cost"],
                'drill_links': {'_pid': 'product_variants_by_base'}
            },
            'product_variants_by_base': {
                'title': 'Product Variants / Stock',
                'query': '''
                    SELECT pv.id as "_pvid", pv.sku_variant as "SKU", pv.size as "Size", 
                           pv.color as "Color", pv.on_hand_qty as "In Stock"
                    FROM product_variants pv
                    WHERE pv.product_id = %s
                ''',
                'params': lambda ctx: [ctx.get('id')],
                'columns': ["SKU", "Size", "Color", "In Stock"],
                'drill_links': {'_pvid': 'product'} # links to existing product detail
            },

            # 2. PURCHASE ORDERS & COSTS
            'expected_cost_detail': {
                'title': 'Outstanding Expected Cost',
                'query': '''
                    SELECT po.id as "_poid", '#' || po.id as "PO #", v.name as "Vendor",
                           po.expected_delivery as "Expected", po.status as "Status",
                           TO_CHAR(po.total_cost, 'FM$999,999,990.00') as "Total Cost"
                    FROM purchase_orders po
                    JOIN vendors v ON po.vendor_id = v.id
                    WHERE v.company_id = %s AND po.status IN ('Submitted', 'Partially_Received')
                    ORDER BY po.total_cost DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["PO #", "Vendor", "Expected", "Status", "Total Cost"],
                'drill_links': {'_poid': 'po'}
            },
            'vendor_po_history': {
                'title': 'Vendor Purchase Orders',
                'query': '''
                    SELECT po.id as "_poid", '#' || po.id as "PO #", po.order_date as "Date",
                           po.status as "Status", TO_CHAR(po.total_cost, 'FM$999,999,990.00') as "Total"
                    FROM purchase_orders po
                    WHERE po.vendor_id = %s
                    ORDER BY po.order_date DESC
                ''',
                'params': lambda ctx: [ctx.get('id')],
                'columns': ["PO #", "Date", "Status", "Total"],
                'drill_links': {'_poid': 'po'}
            },

            # ==========================================
            # PHASE 7: ENHANCED INVENTORY & PURCHASING
            # ==========================================

            # --- Inventory Totals (On Hand) ---
            'inventory_on_hand_by_category': {
                'title': 'Inventory by Category',
                'query': '''
                    SELECT p.type as "_type", p.type as "Category",
                           COUNT(DISTINCT p.id) as "Distinct Styles",
                           SUM(pv.on_hand_qty) as "Qty On Hand",
                           TO_CHAR(SUM(pv.on_hand_qty * p.cost), 'FM$999,999,990.00') as "Total Value"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE v.company_id = %s AND pv.on_hand_qty > 0
                    GROUP BY p.type
                    ORDER BY "Qty On Hand" DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Category", "Distinct Styles", "Qty On Hand", "Total Value"],
                'drill_links': {'_type': 'inventory_on_hand_by_designer_for_cat'}
            },
            'inventory_on_hand_by_designer_for_cat': {
                'title': 'Category Inventory by Designer',
                'query': '''
                    SELECT v.id as "_vendor_id", v.name as "Designer",
                           COUNT(DISTINCT p.id) as "Styles",
                           SUM(pv.on_hand_qty) as "Qty On Hand",
                           TO_CHAR(SUM(pv.on_hand_qty * p.cost), 'FM$999,999,990.00') as "Total Value"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE v.company_id = %s AND p.type = %s AND pv.on_hand_qty > 0
                    GROUP BY v.id
                    ORDER BY "Qty On Hand" DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id'), ctx.get('id')], # Context ID is the Category name (_type)
                'columns': ["Designer", "Styles", "Qty On Hand", "Total Value"],
                'drill_links': {'_vendor_id': 'inventory_on_hand_by_style'}
            },
            'inventory_on_hand_by_designer': {
                'title': 'Inventory by Designer',
                'query': '''
                    SELECT v.id as "_vendor_id", v.name as "Designer",
                           COUNT(DISTINCT p.id) as "Styles",
                           SUM(pv.on_hand_qty) as "Qty On Hand",
                           TO_CHAR(SUM(pv.on_hand_qty * p.cost), 'FM$999,999,990.00') as "Total Value"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE v.company_id = %s AND pv.on_hand_qty > 0
                    GROUP BY v.id
                    ORDER BY "Qty On Hand" DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Designer", "Styles", "Qty On Hand", "Total Value"],
                'drill_links': {'_vendor_id': 'inventory_on_hand_by_style'}
            },
            'inventory_on_hand_by_style': {
                'title': 'Stock by Style / Product',
                'query': '''
                    SELECT p.id as "_product_id", p.name as "Style Name", p.sku as "Base SKU",
                           COUNT(pv.id) as "Variants",
                           SUM(pv.on_hand_qty) as "Total Qty",
                           TO_CHAR(SUM(pv.on_hand_qty * p.cost), 'FM$999,999,990.00') as "Total Cost"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE v.company_id = %s AND v.id = %s AND pv.on_hand_qty > 0
                    GROUP BY p.id
                    ORDER BY "Total Qty" DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id'), ctx.get('id')], # ID is Vendor ID
                'columns': ["Style Name", "Base SKU", "Variants", "Total Qty", "Total Cost"],
                'drill_links': {'_product_id': 'inventory_on_hand_variants'}
            },
            'inventory_on_hand_variants': {
                'title': 'Stock by Size & Color (Variants)',
                'query': '''
                    SELECT pv.id as "_variant_id", pv.sku_variant as "Variant SKU",
                           pv.size as "Size", pv.color as "Color",
                           pv.on_hand_qty as "On Hand",
                           (SELECT COUNT(*) FROM reservations r WHERE r.product_variant_id = pv.id AND r.status IN ('Held', 'Confirmed')) as "Committed / Reserved"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    WHERE p.vendor_id IN (SELECT id FROM vendors WHERE company_id = %s)
                    AND p.id = %s
                    ORDER BY pv.sku_variant ASC
                ''',
                'params': lambda ctx: [ctx.get('company_id'), ctx.get('id')], # ID is Product ID
                'columns': ["Variant SKU", "Size", "Color", "On Hand", "Committed / Reserved"],
                'drill_links': {'_variant_id': 'movement_history'}
            },
            'movement_history': {
                'title': 'Variant Movement History',
                'query': '''
                    SELECT date(po.order_date) as "Date", 'Inbound PO Received' as "Event Type",
                           poi.qty_received as "Quantity Change", '#' || po.id as "Reference", po.id as "_po_id"
                    FROM purchase_order_items poi
                    JOIN purchase_orders po ON poi.purchase_order_id = po.id
                    WHERE poi.product_variant_id = %s AND poi.qty_received > 0
                    
                    UNION ALL
                    
                    SELECT date(o.created_at) as "Date", 'Outbound Sale' as "Event Type",
                           -oi.qty as "Quantity Change", '#' || o.id as "Reference", o.id as "_order_id"
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE oi.product_variant_id = %s
                    
                    UNION ALL
                    
                    SELECT date(r.reserve_from) as "Date", 'Reserved/Committed' as "Event Type",
                           -1 as "Quantity Change", 'Appt/Res #' || COALESCE(r.appointment_id, r.id) as "Reference", r.customer_id as "_customer_id"
                    FROM reservations r
                    WHERE r.product_variant_id = %s AND r.status IN ('Held', 'Confirmed')
                    
                    ORDER BY "Date" DESC
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('id'), ctx.get('id')], # ID is Variant ID
                'columns': ["Date", "Event Type", "Quantity Change", "Reference"],
                'drill_links': {'_po_id': 'po', '_order_id': 'url:/orders/', '_customer_id': 'customer'}
            },

            # --- Low & Out of Stock ---
            'low_stock_alerts_by_category': {
                'title': 'Low Stock by Category',
                'query': '''
                    SELECT p.type as "_type", p.type as "Category",
                           COUNT(pv.id) as "Variants Low (Qty <= 1)",
                           SUM(pv.on_hand_qty) as "Total On Hand (Low Items)"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE v.company_id = %s AND pv.on_hand_qty BETWEEN 1 AND 1
                    GROUP BY p.type
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Category", "Variants Low (Qty <= 1)", "Total On Hand (Low Items)"],
                'drill_links': {'_type': 'low_stock_by_designer'}
            },
            'low_stock_by_designer': {
                'title': 'Low Stock by Designer',
                'query': '''
                    SELECT v.id as "_vendor_id", v.name as "Designer",
                           COUNT(pv.id) as "Variants Low (Qty <= 1)",
                           SUM(pv.on_hand_qty) as "Total On Hand (Low Items)"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE v.company_id = %s AND p.type = %s AND pv.on_hand_qty = 1
                    GROUP BY v.id
                ''',
                'params': lambda ctx: [ctx.get('company_id'), ctx.get('id')],
                'columns': ["Designer", "Variants Low (Qty <= 1)", "Total On Hand (Low Items)"],
                'drill_links': {'_vendor_id': 'low_stock_by_sku'}
            },
            'low_stock_by_sku': {
                'title': 'Low Stock Items (SKU Level)',
                'query': '''
                    SELECT pv.id as "_variant_id", p.name as "Style Definition",
                           pv.sku_variant as "SKU", pv.size as "Size", pv.color as "Color",
                           pv.on_hand_qty as "Qty On Hand",
                           (SELECT SUM(qty_ordered - qty_received) FROM purchase_order_items WHERE product_variant_id = pv.id) as "Pending Inbound"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    WHERE p.vendor_id = %s AND pv.on_hand_qty = 1
                    ORDER BY "Pending Inbound" ASC
                ''',
                'params': lambda ctx: [ctx.get('id')],
                'columns': ["Style Definition", "SKU", "Size", "Color", "Qty On Hand", "Pending Inbound"],
                'drill_links': {'_variant_id': 'reorder_context'}
            },
            'reorder_context': {
                'title': 'Variant Reorder Context',
                'query': '''
                    SELECT po.id as "_po_id", '#' || po.id as "PO Number",
                           v.name as "Vendor", po.order_date as "Date Ordered",
                           po.expected_delivery as "Expected",
                           poi.qty_ordered as "Ordered", poi.qty_received as "Received"
                    FROM purchase_order_items poi
                    JOIN purchase_orders po ON poi.purchase_order_id = po.id
                    JOIN vendors v ON po.vendor_id = v.id
                    WHERE poi.product_variant_id = %s AND po.status IN ('Submitted', 'Partially_Received')
                ''',
                'params': lambda ctx: [ctx.get('id')],
                'columns': ["PO Number", "Vendor", "Date Ordered", "Expected", "Ordered", "Received"],
                'drill_links': {'_po_id': 'po'}
            },
            
            'out_of_stock_by_sku': {
                'title': 'Out of Stock Items',
                'query': '''
                    SELECT pv.id as "_variant_id", p.name as "Style Definition",
                           pv.sku_variant as "SKU", pv.size as "Size", pv.color as "Color",
                           (SELECT SUM(qty_ordered - qty_received) FROM purchase_order_items WHERE product_variant_id = pv.id) as "Pending Inbound"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE v.company_id = %s AND pv.on_hand_qty = 0
                    ORDER BY "Pending Inbound" ASC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Style Definition", "SKU", "Size", "Color", "Pending Inbound"],
                'drill_links': {'_variant_id': 'reorder_context'}
            },

            # --- Available Quantity ---
            'available_inventory_by_category': {
                'title': 'Available vs Committed by Category',
                'query': '''
                    SELECT p.type as "_type", p.type as "Category",
                           SUM(pv.on_hand_qty) as "Physical On Hand",
                           SUM((SELECT COUNT(*) FROM reservations r WHERE r.product_variant_id = pv.id AND r.status IN ('Held', 'Confirmed'))) as "Committed",
                           SUM(pv.on_hand_qty - (SELECT COUNT(*) FROM reservations r WHERE r.product_variant_id = pv.id AND r.status IN ('Held', 'Confirmed'))) as "Available To Sell"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE v.company_id = %s
                    GROUP BY p.type
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["Category", "Physical On Hand", "Committed", "Available To Sell"],
                'drill_links': {'_type': 'available_inventory_by_sku'}
            },
            'available_inventory_by_sku': {
                'title': 'Availability & Commitments by SKU',
                'query': '''
                    SELECT pv.id as "_variant_id", p.name as "Style", pv.sku_variant as "SKU",
                           pv.on_hand_qty as "Physical",
                           (SELECT COUNT(*) FROM reservations r WHERE r.product_variant_id = pv.id AND r.status IN ('Held', 'Confirmed')) as "Committed",
                           pv.on_hand_qty - (SELECT COUNT(*) FROM reservations r WHERE r.product_variant_id = pv.id AND r.status IN ('Held', 'Confirmed')) as "Available"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE v.company_id = %s AND p.type = %s
                    ORDER BY "Available" DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id'), ctx.get('id')], # ID is type
                'columns': ["Style", "SKU", "Physical", "Committed", "Available"],
                'drill_links': {'_variant_id': 'allocated_quantities'}
            },
            'allocated_quantities': {
                'title': 'Active Allocations (Reservations & Orders)',
                'query': '''
                    SELECT r.id as "_res_id", r.customer_id as "_customer_id",
                           c.first_name || ' ' || c.last_name as "Customer",
                           'Reservation #' || r.id as "Hold Type",
                           date(r.reserve_from) || ' - ' || date(r.reserve_to) as "Hold Window",
                           r.status as "Status"
                    FROM reservations r
                    JOIN customers c ON r.customer_id = c.id
                    WHERE r.product_variant_id = %s AND r.status IN ('Held', 'Confirmed')
                ''',
                'params': lambda ctx: [ctx.get('id')],
                'columns': ["Customer", "Hold Type", "Hold Window", "Status"],
                'drill_links': {'_res_id': 'reservation', '_customer_id': 'customer'}
            },

            # --- Purchasing & Vendor Performance ---
            'overdue_vendor_orders': {
                'title': 'Overdue Purchase Orders',
                'query': '''
                    SELECT po.id as "_poid", '#' || po.id as "PO #", v.name as "Vendor",
                           date(po.expected_delivery) as "Expected Date",
                           EXTRACT(DAY FROM CURRENT_TIMESTAMP - (po.expected_delivery))::INTEGER as "Days Overdue",
                           po.status as "Status"
                    FROM purchase_orders po
                    JOIN vendors v ON po.vendor_id = v.id
                    WHERE v.company_id = %s AND po.status IN ('Submitted', 'Partially_Received') 
                    AND po.expected_delivery < CURRENT_TIMESTAMP
                    ORDER BY "Days Overdue" DESC
                ''',
                'params': lambda ctx: [ctx.get('company_id')],
                'columns': ["PO #", "Vendor", "Expected Date", "Days Overdue", "Status"],
                'drill_links': {'_poid': 'po_line_items'}
            },
            'po_line_items': {
                'title': 'Purchase Order Line Items',
                'query': '''
                    SELECT poi.product_variant_id as "_variant_id", p.name as "Style Definition",
                           pv.sku_variant as "SKU", poi.qty_ordered as "Ordered",
                           poi.qty_received as "Received", 
                           poi.qty_ordered - poi.qty_received as "Outstanding"
                    FROM purchase_order_items poi
                    JOIN product_variants pv ON poi.product_variant_id = pv.id
                    JOIN products p ON pv.product_id = p.id
                    WHERE poi.purchase_order_id = %s
                    ORDER BY "Outstanding" DESC
                ''',
                'params': lambda ctx: [ctx.get('id')],
                'columns': ["Style Definition", "SKU", "Ordered", "Received", "Outstanding"],
                'drill_links': {'_variant_id': 'impacted_customer_orders'}
            },
            'impacted_customer_orders': {
                'title': 'Impacted Customer Operations (Awaiting Item)',
                'query': '''
                    SELECT c.id as "_customer_id", c.first_name || ' ' || c.last_name as "Customer",
                           'Reservation #' || r.id as "Context",
                           date(r.reserve_from) as "Required By", r.status as "Hold Status"
                    FROM reservations r
                    JOIN customers c ON r.customer_id = c.id
                    WHERE r.product_variant_id = %s AND r.status IN ('Held', 'Confirmed')
                ''',
                'params': lambda ctx: [ctx.get('id')],
                'columns': ["Customer", "Context", "Required By", "Hold Status"],
                'drill_links': {'_customer_id': 'customer'}
            },

            # --- Row-Level Specific Details ---
            'appointment': {
                'title': 'Appointment Details',
                'query': '''
                    SELECT a.id, a.start_at as "Time", a.end_at as "End", s.name as "Service", 
                           COALESCE(u.first_name, 'Unassigned') as "Stylist", a.status as "Status",
                           a.notes as "Notes"
                    FROM appointments a
                    JOIN services s ON a.service_id = s.id
                    LEFT JOIN users u ON a.assigned_staff_id = u.id
                    JOIN locations l ON a.location_id = l.id
                    WHERE a.id = %s AND l.company_id = %s
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('company_id')],
                'columns': ["Time", "End", "Service", "Stylist", "Status", "Notes"]
            },
            'order': {
                'title': 'Order Items',
                'query': '''
                    SELECT oi.id, p.name as "Item", pv.size as "Size", pv.color as "Color", 
                           oi.qty as "Qty", TO_CHAR(oi.unit_price, 'FM$999,999,990.00') as "Unit Price", 
                           TO_CHAR(oi.line_total, 'FM$999,999,990.00') as "Total",
                           pv.product_id as "_product_id"
                    FROM order_items oi
                    JOIN product_variants pv ON oi.product_variant_id = pv.id
                    JOIN products p ON pv.product_id = p.id
                    JOIN orders o ON oi.order_id = o.id
                    WHERE oi.order_id = %s AND o.company_id = %s
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('company_id')],
                'columns': ["Item", "Size", "Color", "Qty", "Unit Price", "Total"],
                'drill_links': {'_product_id': 'product'}
            },
            'product': {
                'title': 'Product Variants',
                'query': '''
                    SELECT pv.id, pv.sku_variant as "SKU", pv.size as "Size", pv.color as "Color", 
                           pv.on_hand_qty as "In Stock", CASE WHEN pv.track_inventory THEN 'Yes' ELSE 'No' END as "Tracked"
                    FROM product_variants pv
                    JOIN products p ON pv.product_id = p.id
                    JOIN vendors v ON p.vendor_id = v.id
                    WHERE pv.product_id = %s AND v.company_id = %s
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('company_id')],
                'columns': ["SKU", "Size", "Color", "In Stock", "Tracked"]
            },
            'po': {
                'title': 'Purchase Order Details',
                'query': '''
                    SELECT poi.id, p.name as "Product", pv.sku_variant as "SKU", 
                           poi.qty_ordered as "Ordered", poi.qty_received as "Received", 
                           TO_CHAR(poi.unit_cost, 'FM$999,999,990.00') as "Cost",
                           TO_CHAR(poi.qty_ordered * poi.unit_cost, 'FM$999,999,990.00') as "Total",
                           pv.product_id as "_product_id"
                    FROM purchase_order_items poi
                    JOIN product_variants pv ON poi.product_variant_id = pv.id
                    JOIN products p ON pv.product_id = p.id
                    JOIN purchase_orders po ON poi.purchase_order_id = po.id
                    JOIN vendors v ON po.vendor_id = v.id
                    WHERE poi.purchase_order_id = %s AND v.company_id = %s
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('company_id')],
                'columns': ["Product", "SKU", "Ordered", "Received", "Cost", "Total"],
                'drill_links': {'_product_id': 'product'}
            },
            'pickup': {
                'title': 'Pickup Details',
                'query': '''
                    SELECT p.id, p.pickup_contact_name as "Contact", p.pickup_contact_phone as "Phone",
                           p.signed_at as "Signed At", p.signed_by as "Signed By", p.notes as "Notes"
                    FROM pickups p
                    WHERE p.id = %s AND p.company_id = %s
                ''',
                'params': lambda ctx: [ctx.get('id'), ctx.get('company_id')],
                'columns': ["Contact", "Phone", "Signed At", "Signed By", "Notes"]
            }
        }

    def execute(self, metric_id, context):
        if metric_id not in self.registry:
            return {"error": f"Unknown metric: {metric_id}"}
            
        config = self.registry[metric_id]
        
        try:
            raw_params = config['params'](context)
            params = [None if str(p).strip() == '' or str(p).strip() == 'None' else p for p in raw_params]
            
            cursor = self.conn.cursor()
            cursor.execute(config['query'], params)
            rows = [dict(row) for row in cursor.fetchall()]
            
            # Clean up hidden columns before sending to UI
            columns = config.get('columns', [])
            if not columns and rows:
                 columns = [k for k in rows[0].keys() if not k.startswith('_')]
            
            # Keep rows intact because the UI needs the ID fields to build links, 
            # even if they aren't explicit columns
            
            return {
                "title": config.get('title', metric_id.replace('_', ' ').title()),
                "total_records": len(rows),
                "data": rows,
                "columns": columns,
                "drill_links": config.get('drill_links', {})
            }
        except Exception as e:
            import traceback
            trace = traceback.format_exc()
            self.conn.rollback()
            print(f"Drilldown Engine Error: {e}\n{trace}")
            return {"error": str(e)}
