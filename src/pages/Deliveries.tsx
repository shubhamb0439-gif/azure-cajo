import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import DeliveryPanel from '../components/DeliveryPanel';
import { Pencil, Trash2, Search } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';
import { api } from '../lib/api';

interface Delivery {
  id: string;
  sale_id: string;
  delivery_date: string;
  notes: string | null;
  status: string;
  created_at: string;
  delivery_items: Array<{
    sale_item_id: string;
    sale_items: {
      id: string;
      assembly_unit_id: string;
      assembly_units: {
        assemblies: {
          assembly_name: string;
        };
      };
    };
  }>;
  sales: {
    order_number: string;
    created_at: string;
    customers: {
      contact_name: string;
      customer_company: string | null;
    };
  };
}

export default function Deliveries() {
  const { userProfile, hasWriteAccess } = useAuth();
  const { isViewOnly } = useCurrency();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [showEditPanel, setShowEditPanel] = useState(false);

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    setLoading(true);
    const { data } = await api.deliveries.getAll();

    if (data) {
      setDeliveries(data as any);
    }
    setLoading(false);
  };

  const handleEdit = (delivery: Delivery) => {
    setSelectedDelivery({
      ...delivery,
      order_number: delivery.sales.order_number,
      customer_name: delivery.sales.customers.contact_name,
    });
    setShowEditPanel(true);
  };

  const handleDelete = async (delivery: Delivery) => {
    if (!confirm(`Are you sure you want to delete this delivery for ${delivery.sales.order_number}?`)) {
      return;
    }

    const { error: deliveryError } = await api.deliveries.delete(delivery.id);

    if (deliveryError) {
      alert('Error deleting delivery: ' + deliveryError.message);
      return;
    }

    await api.activityLogs.create('DELETE_DELIVERY', {
      saleNumber: delivery.sales.order_number,
      customerName: delivery.sales.customers.contact_name,
    });

    loadDeliveries();
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch =
      delivery.sales.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.sales.customers.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.sales.customers.customer_company?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-slate-600 dark:text-slate-400">Loading deliveries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Deliveries</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Track and manage all deliveries</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by sale number, customer, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Sale #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-slate-500 dark:text-slate-400">
                      {searchTerm ? 'No deliveries found matching your search.' : 'No deliveries yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-slate-900 dark:text-white">{delivery.sales.order_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {delivery.sales.customers.contact_name}
                        </div>
                        {delivery.sales.customers.customer_company && (
                          <div className="text-slate-500 dark:text-slate-400">
                            {delivery.sales.customers.customer_company}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 dark:text-white">
                        {delivery.delivery_items && delivery.delivery_items.length > 0 ? (
                          delivery.delivery_items.map((deliveryItem) => (
                            <div key={deliveryItem.sale_items.id} className="mb-1">
                              <span className="font-medium">
                                {(deliveryItem.sale_items.assembly_units as any)?.assemblies?.assembly_name || 'Unknown'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">No items selected</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {formatDate(delivery.delivery_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        delivery.status === 'delivered'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {delivery.status === 'delivered' ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {hasWriteAccess && !isViewOnly && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(delivery)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                            title="Edit delivery"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(delivery)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title="Delete delivery"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEditPanel && selectedDelivery && (
        <DeliveryPanel
          delivery={selectedDelivery}
          saleNumber={selectedDelivery.order_number}
          customerName={selectedDelivery.customer_name}
          onClose={() => {
            setShowEditPanel(false);
            setSelectedDelivery(null);
          }}
          onSuccess={() => {
            setShowEditPanel(false);
            setSelectedDelivery(null);
            loadDeliveries();
          }}
        />
      )}
    </div>
  );
}
