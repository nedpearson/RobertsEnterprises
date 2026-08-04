import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card, CardBody } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { Button } from '../../design-system/Button';
import { PageHeader } from '../../design-system/PageHeader';
import { exportToExcel, exportToPDF, exportToWord } from '../../utils/exporters';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("financials");
  const [data, setData] = useState<any>({ financials: null, sales: null, inventory: null });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [extData, setExtData] = useState<any>({
    openOrders: null,
    expectedDeliveries: null,
    bookings: null,
    cancellations: null,
    didNotBuy: null,
    transfers: null,
    followUps: null
  });
  const [extLoading, setExtLoading] = useState(false);

  const fetchBaseline = async () => {
    try {
      setLoading(true);
      const [finRes, salRes, invRes] = await Promise.all([
        api.get<any>('/api/reports/financials').catch(() => ({})),
        api.get<any>('/api/reports/sales').catch(() => []),
        api.get<any>('/api/reports/inventory').catch(() => ({})),
      ]);
      setData({ financials: finRes, sales: salRes, inventory: invRes });
    } catch (e: any) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExtendedTab = async (tab: string) => {
    const endpoints: Record<string, string> = {
      'open-orders': '/api/reports/open-orders',
      'expected-deliveries': '/api/reports/expected-deliveries',
      'bookings': '/api/reports/bookings',
      'cancellations': '/api/reports/cancellations',
      'did-not-buy': '/api/reports/did-not-buy',
      'transfers': '/api/reports/transfers',
      'follow-ups': '/api/follow-ups',
    };

    const keyMap: Record<string, string> = {
      'open-orders': 'openOrders',
      'expected-deliveries': 'expectedDeliveries',
      'bookings': 'bookings',
      'cancellations': 'cancellations',
      'did-not-buy': 'didNotBuy',
      'transfers': 'transfers',
      'follow-ups': 'followUps'
    };

    const endpoint = endpoints[tab];
    const stateKey = keyMap[tab];
    if (!endpoint || !stateKey) return;

    try {
      setExtLoading(true);
      const res = await api.get<any>(endpoint);
      setExtData((prev: any) => ({ ...prev, [stateKey]: Array.isArray(res) ? res : [] }));
    } catch (e: any) {
      setExtData((prev: any) => ({ ...prev, [stateKey]: { _error: e.message } }));
    } finally {
      setExtLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseline();
  }, []);

  useEffect(() => {
    if (['open-orders', 'expected-deliveries', 'bookings', 'cancellations', 'did-not-buy', 'transfers', 'follow-ups'].includes(activeTab)) {
      fetchExtendedTab(activeTab);
    }
  }, [activeTab]);

  const handleExport = (type: string) => {
    let exportData: any[] = [];
    let cols: any[] = [];
    let filename = "";
    let title = "";

    if (activeTab === "financials" && data.financials?.invoices) {
      filename = "Financial_Ledger";
      title = "VowOS Financial Ledger";
      cols = [
        { header: "Invoice #", dataKey: "id" },
        { header: "Customer", dataKey: "customerName" },
        { header: "Total ($)", dataKey: "totalVal" },
        { header: "Due ($)", dataKey: "dueVal" },
        { header: "Status", dataKey: "status" }
      ];
      exportData = data.financials.invoices.map((i: any) => ({
        id: i.id,
        customerName: `${i.first_name || ""} ${i.last_name || ""}`,
        totalVal: ((i.total_amount_cents || 0) / 100).toFixed(2),
        dueVal: ((i.balance_due_cents || 0) / 100).toFixed(2),
        status: String(i.status || "open").toUpperCase()
      }));
    } else if (activeTab === "sales" && data.sales) {
      filename = "Sales_Performance";
      title = "Consultant Appt Performance";
      cols = [
        { header: "ID", dataKey: "id" },
        { header: "Consultant", dataKey: "consultant" },
        { header: "Customer", dataKey: "customer" },
        { header: "Appt Type", dataKey: "type" },
        { header: "Time Slot", dataKey: "time" }
      ];
      const appointments = Array.isArray(data.sales) ? data.sales : (data.sales.appointments || []);
      exportData = appointments.map((a: any) => ({
        id: a.id,
        consultant: a.consultant_name,
        customer: `${a.first_name || ""} ${a.last_name || ""}`,
        type: a.type,
        time: a.time_slot
      }));
    } else if (activeTab === "inventory" && data.inventory?.items) {
      filename = "Inventory_Valuation";
      title = "Global Pipeline & Vault Stock";
      cols = [
        { header: "SKU / Style", dataKey: "style" },
        { header: "Designer", dataKey: "vendor" },
        { header: "Category", dataKey: "category" },
        { header: "Base Price ($)", dataKey: "price" }
      ];
      exportData = data.inventory.items.map((i: any) => ({
        style: i.style_number,
        vendor: i.vendor_name,
        category: i.category,
        price: ((i.base_price_cents || 0) / 100).toFixed(2)
      }));
    }

    const extTabMap: Record<string, { key: string; label: string }> = {
      'open-orders': { key: 'openOrders', label: 'Open_Orders' },
      'expected-deliveries': { key: 'expectedDeliveries', label: 'Expected_Deliveries' },
      'bookings': { key: 'bookings', label: 'Bookings' },
      'cancellations': { key: 'cancellations', label: 'Cancellations' },
      'did-not-buy': { key: 'didNotBuy', label: 'Did_Not_Buy' },
      'transfers': { key: 'transfers', label: 'Transfers' },
      'follow-ups': { key: 'followUps', label: 'Follow_Ups' },
    };

    if (extTabMap[activeTab]) {
      const { key, label } = extTabMap[activeTab];
      const rows: any[] = extData[key] || [];
      if (rows.length === 0) return;
      filename = label;
      title = label.replace(/_/g, ' ');
      exportData = rows;
      cols = Object.keys(rows[0]).map(k => ({ header: k.replace(/_/g, ' '), dataKey: k }));
    }

    if (type === "excel") exportToExcel(exportData, filename);
    if (type === "pdf") exportToPDF(exportData, cols, filename, title);
    if (type === "word") exportToWord(exportData, cols, filename, title);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6 text-red-600">
        <strong>Failed to load reports:</strong> {fetchError}
      </div>
    );
  }

  const fin = data.financials || { invoices: [], payments: [] };
  const sal = Array.isArray(data.sales) ? { appointments: data.sales, leads: [] } : (data.sales || { appointments: [], leads: [] });
  const inv = data.inventory || { items: [] };

  const finInvoices = Array.isArray(fin.invoices) ? fin.invoices : [];
  const totalRev = finInvoices.reduce((sum: number, i: any) => sum + (i.total_amount_cents || 0), 0) / 100;
  const totalAR = finInvoices.reduce((sum: number, i: any) => sum + (i.balance_due_cents || 0), 0) / 100;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Reporting Hub"
          subtitle="Exportable ledgers, drill-down metrics, and performance analytics"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="bg-emerald-700 hover:bg-emerald-800 text-white border-none" onClick={() => handleExport("excel")}>Export Excel</Button>
          <Button variant="outline" className="bg-red-600 hover:bg-red-700 text-white border-none" onClick={() => handleExport("pdf")}>Export PDF</Button>
          <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white border-none" onClick={() => handleExport("word")}>Export Word</Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {[
          ["financials", "Financials"],
          ["sales", "Sales"],
          ["inventory", "Inventory"],
          ["open-orders", "Open Orders"],
          ["expected-deliveries", "Expected Deliveries"],
          ["bookings", "Bookings"],
          ["cancellations", "Cancellations"],
          ["did-not-buy", "Did Not Buy"],
          ["transfers", "Transfers"],
          ["follow-ups", "Follow-Ups"]
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors whitespace-nowrap ${
              activeTab === key
                ? 'bg-rose-600 text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "financials" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardBody className="p-5">
                <span className="text-sm text-gray-500">Total Processed Revenue</span>
                <div className="text-2xl font-bold mt-1 text-gray-900">${totalRev.toLocaleString()}</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-5">
                <span className="text-sm text-gray-500">Total Outstanding A/R</span>
                <div className="text-2xl font-bold mt-1 text-red-600">${totalAR.toLocaleString()}</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-5">
                <span className="text-sm text-gray-500">Payments Processed</span>
                <div className="text-2xl font-bold mt-1 text-gray-900">{fin.payments?.length || 0}</div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody className="p-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-100">
                    <th className="p-4">Invoice ID</th>
                    <th>Customer Name</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {finInvoices.map((i: any) => (
                    <tr key={i.id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-bold">INV-{String(i.id).padStart(4, "0")}</td>
                      <td>{i.first_name} {i.last_name}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-100 text-gray-800">
                          {i.status}
                        </span>
                      </td>
                      <td>${((i.total_amount_cents || 0) / 100).toFixed(2)}</td>
                      <td className="font-semibold text-red-600">${((i.balance_due_cents || 0) / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === "sales" && (
        <Card>
          <CardBody className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-100">
                  <th className="p-4">Time Slot</th>
                  <th>Stylist</th>
                  <th>Customer Name</th>
                  <th>Service Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {(sal.appointments || []).map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-bold">{a.time_slot}</td>
                    <td>
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                        {a.consultant_name}
                      </span>
                    </td>
                    <td>{a.first_name} {a.last_name}</td>
                    <td>{a.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {activeTab === "inventory" && (
        <Card>
          <CardBody className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-100">
                  <th className="p-4">Designer</th>
                  <th>Style Number</th>
                  <th>Category</th>
                  <th>Base MSRP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {(inv.items || []).map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-bold">{item.vendor_name}</td>
                    <td>{item.style_number}</td>
                    <td>{item.category}</td>
                    <td className="font-semibold text-rose-600">${((item.base_price_cents || 0) / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {['open-orders', 'expected-deliveries', 'bookings', 'cancellations', 'did-not-buy', 'transfers', 'follow-ups'].includes(activeTab) && (
        <Card>
          <CardBody className="p-0">
            {extLoading && <div className="p-6 text-center text-sm text-gray-500">Loading...</div>}
            {!extLoading && (() => {
              const keyMap: Record<string, string> = {
                'open-orders': 'openOrders',
                'expected-deliveries': 'expectedDeliveries',
                'bookings': 'bookings',
                'cancellations': 'cancellations',
                'did-not-buy': 'didNotBuy',
                'transfers': 'transfers',
                'follow-ups': 'followUps'
              };
              const raw = extData[keyMap[activeTab]];
              if (raw && raw._error) {
                return <div className="p-6 text-red-600">Failed to load: {raw._error}</div>;
              }
              const rows: any[] = Array.isArray(raw) ? raw : [];
              if (!rows.length) return <div className="p-6 text-center text-sm text-gray-500">No records found.</div>;

              const HIDDEN = new Set(['boutique_id', 'qr_code_data_url', 'message_template', 'ledger_entry_id']);
              const cols = Object.keys(rows[0]).filter(k => !HIDDEN.has(k) && !k.endsWith('_id') || k === 'id');

              const friendlyHeader = (k: string) => k
                .replace(/_cents$/, ' ($)')
                .replace(/_at$/, ' date')
                .replace(/_/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());

              const formatCell = (k: string, v: any) => {
                if (v == null) return '';
                if (k.endsWith('_cents') && typeof v === 'number') return `$${(v / 100).toFixed(2)}`;
                if ((k.endsWith('_at') || k.endsWith('_date')) && typeof v === 'string') {
                  const d = new Date(v);
                  return isNaN(d.getTime()) ? v : d.toLocaleDateString();
                }
                return String(v);
              };

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-100">
                        {cols.map(c => <th key={c} className="p-3 whitespace-nowrap">{friendlyHeader(c)}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          {cols.map(c => <td key={c} className="p-3">{formatCell(c, row[c])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
