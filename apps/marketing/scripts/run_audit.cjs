const { createClient } = require('@supabase/supabase-js');

const PAGE_SIZE = 1000;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function escapeWorkflowCommand(value) {
  return String(value)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}

function workflowError(message) {
  console.error(
    `::error title=VowOS Production Audit Failed::${escapeWorkflowCommand(message)}`,
  );
}

async function fetchAll(supabase, table, columns) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${table} audit query failed: ${error.message}`);
    }

    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function countNullBusiness(rows) {
  return rows.filter((row) => row.business_id == null).length;
}

function countCustomerTenantMismatches(rows, customersById, customerKey = 'customer_id') {
  return rows.filter((row) => {
    const customerId = row[customerKey];
    if (!customerId) return false;
    const customer = customersById.get(customerId);
    return customer && customer.business_id !== row.business_id;
  }).length;
}

async function main() {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('VowOS production audit: loading canonical records...');

  const [
    customers,
    appointments,
    gowns,
    invoices,
    purchaseOrders,
    leads,
    transfers,
    locations,
    messages,
  ] = await Promise.all([
    fetchAll(supabase, 'customers', 'id,business_id,spend_cents'),
    fetchAll(supabase, 'appointments', 'id,business_id,customer_id'),
    fetchAll(supabase, 'gowns', 'id,business_id,stock'),
    fetchAll(supabase, 'invoices', 'id,business_id,customer_id,amount_cents,paid_cents,status'),
    fetchAll(supabase, 'purchase_orders', 'id,business_id,assigned_customer'),
    fetchAll(supabase, 'leads', 'id,business_id'),
    fetchAll(supabase, 'transfers', 'id,from_location_id,to_location_id'),
    fetchAll(supabase, 'locations', 'id,business_id'),
    fetchAll(supabase, 'messages', 'id,business_id,customer_id'),
  ]);

  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const locationsById = new Map(locations.map((location) => [location.id, location]));

  const invariantViolations = {
    orphaned_customers: countNullBusiness(customers),
    orphaned_appointments: countNullBusiness(appointments),
    cross_tenant_appointments: countCustomerTenantMismatches(appointments, customersById),
    orphaned_inventory: countNullBusiness(gowns),
    orphaned_invoices: countNullBusiness(invoices),
    cross_tenant_invoices: countCustomerTenantMismatches(invoices, customersById),
    orphaned_orders: countNullBusiness(purchaseOrders),
    cross_tenant_orders: countCustomerTenantMismatches(
      purchaseOrders,
      customersById,
      'assigned_customer',
    ),
    orphaned_leads: countNullBusiness(leads),
    orphaned_messages: countNullBusiness(messages),
    cross_tenant_messages: countCustomerTenantMismatches(messages, customersById),
    cross_tenant_transfers: transfers.filter((transfer) => {
      const fromLocation = locationsById.get(transfer.from_location_id);
      const toLocation = locationsById.get(transfer.to_location_id);
      return (
        fromLocation &&
        toLocation &&
        fromLocation.business_id !== toLocation.business_id
      );
    }).length,
  };

  const invalidInvoices = invoices.filter((invoice) => {
    const amount = Number(invoice.amount_cents || 0);
    const paid = Number(invoice.paid_cents || 0);
    return (invoice.status === 'Paid' && paid < amount) || paid > amount;
  });

  const paymentsByCustomer = new Map();
  for (const invoice of invoices) {
    if (!invoice.customer_id) continue;
    paymentsByCustomer.set(
      invoice.customer_id,
      (paymentsByCustomer.get(invoice.customer_id) || 0) + Number(invoice.paid_cents || 0),
    );
  }

  const customerLtvMismatches = customers.filter((customer) => {
    const cached = Number(customer.spend_cents || 0);
    const computed = paymentsByCustomer.get(customer.id) || 0;
    return cached !== computed;
  });

  const negativeInventory = gowns.filter((gown) => Number(gown.stock || 0) < 0);

  const reconciliationViolations = {
    invalid_invoice_balances: invalidInvoices.length,
    customer_ltv_mismatches: customerLtvMismatches.length,
    negative_inventory_records: negativeInventory.length,
  };

  const result = {
    auditedAt: new Date().toISOString(),
    recordCounts: {
      customers: customers.length,
      appointments: appointments.length,
      gowns: gowns.length,
      invoices: invoices.length,
      purchase_orders: purchaseOrders.length,
      leads: leads.length,
      transfers: transfers.length,
      locations: locations.length,
      messages: messages.length,
    },
    invariantViolations,
    reconciliationViolations,
  };

  console.log(JSON.stringify(result, null, 2));

  const totalViolations = [
    ...Object.values(invariantViolations),
    ...Object.values(reconciliationViolations),
  ].reduce((sum, count) => sum + count, 0);

  if (totalViolations > 0) {
    throw new Error(
      `VowOS production audit found ${totalViolations} integrity violation(s). Summary: ${JSON.stringify({ invariantViolations, reconciliationViolations })}`,
    );
  }

  console.log('VowOS production audit PASSED: no audited integrity violations found.');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  workflowError(message);
  console.error('VowOS production audit FAILED:', message);
  process.exitCode = 1;
});
