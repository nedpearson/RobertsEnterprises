import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card, CardBody } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { Button } from '../../design-system/Button';
import { PageHeader } from '../../design-system/PageHeader';
import { Modal } from '../../design-system/Modal';
import { useToast } from '../../design-system/ToastContext';

export default function InventoryPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/api/inventory');
      setInventory(res.items || res || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Global Designer Catalog"
        subtitle="Manage designer supply chain, inventory stock, and vaults"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventory.map((item) => (
          <Card
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="hover:shadow-lg transition-all cursor-pointer border border-gray-200"
          >
            <CardBody className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                  {item.vendor_name}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mt-1">
                  {item.style_number}
                </h3>
                <span className="text-sm text-gray-500 block mt-1">{item.category}</span>
                <span className="text-base font-bold text-rose-600 block mt-2">
                  ${((item.base_price_cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-4">
                <span className="text-xs font-semibold text-gray-700 block mb-2">
                  In-Stock Variants ({item.variants?.length || 0})
                </span>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {item.variants?.map((v: any) => (
                    <div
                      key={v.id}
                      className="flex justify-between items-center text-xs text-gray-600 py-1 border-b border-gray-50/50"
                    >
                      <span>Sz {v.size} — {v.color}</span>
                      <span
                        className={`font-semibold ${
                          v.stock_quantity > 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {v.stock_quantity > 0 ? `${v.stock_quantity} in Vault` : 'Out of Stock'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Inspect Item Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Stock Verification"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 font-semibold uppercase">{selectedItem.vendor_name}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{selectedItem.style_number}</div>
              <div className="text-sm text-gray-500">{selectedItem.category}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border border-gray-100 rounded-lg">
                <span className="text-xs text-gray-400 block">Base Price</span>
                <span className="text-lg font-bold text-rose-600">
                  ${((selectedItem.base_price_cents || 0) / 100).toLocaleString()}
                </span>
              </div>
              <div className="p-3 border border-gray-100 rounded-lg">
                <span className="text-xs text-gray-400 block">Total Stock</span>
                <span className="text-lg font-bold text-gray-900">
                  {selectedItem.variants?.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0) || 0} Units
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Dismiss
              </Button>
              <Button onClick={() => addToast('Drafting PO restock order...', 'info')}>
                Draft Restock PO
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
