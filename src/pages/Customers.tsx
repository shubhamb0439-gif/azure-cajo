import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import SidePanel from '../components/SidePanel';
import SalesPanel from '../components/SalesPanel';
import PurchaseOrderForm from '../components/PurchaseOrderForm';
import { Pencil, Trash2, Plus, Search, IndianRupee, ChevronDown, ChevronRight, ShoppingCart } from 'lucide-react';
import { api } from '../lib/api';

interface Customer {
  id: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  customer_company: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  assigned_user?: {
    name: string;
  };
}

interface SaleHistory {
  id: string;
  sale_number: string;
  sale_date: string;
  sale_notes: string | null;
  is_delivered: boolean;
  sale_items: {
    id: string;
    serial_number: string;
    delivered: boolean;
  }[];
}

interface DeliveryHistory {
  id: string;
  delivery_address: string | null;
  delivery_location: string | null;
  delivery_date: string;
  delivery_notes: string | null;
  delivered: boolean;
  delivered_at: string | null;
  delivery_items: {
    id: string;
    sale_item: {
      serial_number: string;
    };
  }[];
}

interface CustomerFormData {
  contact_name: string;
  email: string;
  phone: string;
  customer_company: string;
  notes: string;
  assigned_to: string;
}

interface CustomerFormProps {
  formData: CustomerFormData;
  setFormData: (data: CustomerFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEdit: boolean;
  users: any[];
}

function CustomerForm({ formData, setFormData, onSubmit, onCancel, isEdit, users }: CustomerFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Contact Name *
        </label>
        <input
          type="text"
          value={formData.contact_name}
          onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Email
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Phone
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Company
        </label>
        <input
          type="text"
          value={formData.customer_company}
          onChange={(e) => setFormData({ ...formData, customer_company: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Assigned To
        </label>
        <select
          value={formData.assigned_to}
          onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        >
          <option value="">Unassigned</option>
          {users.map(u => (
            <option key={u.id} value={u.auth_user_id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          {isEdit ? 'Update Customer' : 'Create Customer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Customers() {
  const { user, hasWriteAccess } = useAuth();
  const { getCurrencySymbol, isViewOnly } = useCurrency();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showSalesPanel, setShowSalesPanel] = useState(false);
  const [showPOForm, setShowPOForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [salesCustomer, setSalesCustomer] = useState<Customer | null>(null);
  const [poCustomer, setPOCustomer] = useState<Customer | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [salesHistory, setSalesHistory] = useState<Record<string, SaleHistory[]>>({});
  const [deliveryHistory, setDeliveryHistory] = useState<Record<string, DeliveryHistory[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<CustomerFormData>({
    contact_name: '',
    email: '',
    phone: '',
    customer_company: '',
    notes: '',
    assigned_to: '',
  });

  useEffect(() => {
    loadCustomers();
    loadUsers();
  }, []);

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');

  const loadCustomers = async () => {
    setLoading(true);
    const { data, error } = await api.customers.getAll();

    if (error) {
      console.error('Error loading customers:', error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(c => c.assigned_to).filter(Boolean))];

      if (userIds.length > 0) {
        const { data: usersData } = await api.users.getAll();

        const userMap = new Map(usersData?.map(u => [u.auth_user_id, u.name]));

        const customersWithUsers = data.map(customer => ({
          ...customer,
          assigned_user: customer.assigned_to ? { name: userMap.get(customer.assigned_to) || 'Unknown' } : null
        }));

        setCustomers(customersWithUsers);
      } else {
        setCustomers(data);
      }
    } else {
      setCustomers([]);
    }

    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await api.users.getAll();

    if (data) {
      setUsers(data);
    }
  };

  const logActivity = async (action: string, details: string) => {
    await api.activityLogs.create(action, { message: details });
  };

  const handleAdd = () => {
    setFormData({
      contact_name: '',
      email: '',
      phone: '',
      customer_company: '',
      notes: '',
      assigned_to: '',
    });
    setShowAddPanel(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      contact_name: customer.contact_name,
      email: customer.email || '',
      phone: customer.phone || '',
      customer_company: customer.customer_company || '',
      notes: customer.notes || '',
      assigned_to: customer.assigned_to || '',
    });
    setShowEditPanel(true);
  };

  const handleSales = (customer: Customer) => {
    setSalesCustomer(customer);
    setShowSalesPanel(true);
  };

  const handlePurchaseOrder = (customer: Customer) => {
    setPOCustomer(customer);
    setShowPOForm(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete customer "${customer.contact_name}"?`)) {
      return;
    }

    const { error } = await api.customers.delete(customer.id);

    if (error) {
      alert('Error deleting customer: ' + error.message);
    } else {
      await logActivity('Delete Customer', `Deleted customer: ${customer.contact_name} (${customer.customer_company || 'No company'})`);
      loadCustomers();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contact_name.trim()) {
      alert('Please enter a contact name');
      return;
    }

    const customerData = {
      contact_name: formData.contact_name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      customer_company: formData.customer_company.trim() || null,
      notes: formData.notes.trim() || null,
      assigned_to: formData.assigned_to && formData.assigned_to.trim() !== '' ? formData.assigned_to : null,
    };

    if (showEditPanel && selectedCustomer) {
      const { error } = await api.customers.update(selectedCustomer.id, customerData);

      if (error) {
        alert('Error updating customer: ' + error.message);
      } else {
        await logActivity('Update Customer', `Updated customer: ${formData.contact_name}`);
        setShowEditPanel(false);
        loadCustomers();
      }
    } else {
      const { error } = await api.customers.create(customerData);

      if (error) {
        alert('Error creating customer: ' + error.message);
      } else {
        await logActivity('Create Customer', `Created new customer: ${formData.contact_name} (${formData.customer_company || 'No company'})`);
        setShowAddPanel(false);
        loadCustomers();
      }
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch =
      customer.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customer_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm);

    return matchesSearch;
  });

  const handleCancel = () => {
    setShowAddPanel(false);
    setShowEditPanel(false);
  };

  const loadCustomerHistory = async (customerId: string) => {
    if (salesHistory[customerId] && deliveryHistory[customerId]) {
      return;
    }

    setLoadingHistory(prev => ({ ...prev, [customerId]: true }));

    const [salesRes, deliveriesRes] = await Promise.all([
      api.sales.getByCustomer(customerId),
      api.deliveries.getAll(),
    ]);

    if (salesRes.data) {
      setSalesHistory(prev => ({ ...prev, [customerId]: salesRes.data as unknown as SaleHistory[] }));
    }

    if (deliveriesRes.data && salesRes.data) {
      const saleIds = salesRes.data.map(s => s.id);
      const customerDeliveries = (deliveriesRes.data as any[]).filter(delivery => {
        return saleIds.includes(delivery.sale_id);
      });
      setDeliveryHistory(prev => ({ ...prev, [customerId]: customerDeliveries as DeliveryHistory[] }));
    }

    setLoadingHistory(prev => ({ ...prev, [customerId]: false }));
  };

  const handleToggleExpand = async (customerId: string) => {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null);
    } else {
      setExpandedCustomer(customerId);
      await loadCustomerHistory(customerId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Customers</h1>
        {hasWriteAccess && !isViewOnly && (
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10">
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Contact Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <>
                      <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleExpand(customer.id)}
                            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                            title={expandedCustomer === customer.id ? "Collapse" : "Expand history"}
                          >
                            {expandedCustomer === customer.id ? (
                              <ChevronDown size={18} />
                            ) : (
                              <ChevronRight size={18} />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{customer.contact_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {customer.customer_company || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 dark:text-white">{customer.email || '-'}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{customer.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                          {customer.assigned_user?.name || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {hasWriteAccess && !isViewOnly && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handlePurchaseOrder(customer)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                title="Create purchase order"
                              >
                                <ShoppingCart size={18} />
                              </button>
                              <button
                                onClick={() => handleSales(customer)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                title="New sale"
                              >
                                <IndianRupee size={18} />
                              </button>
                              <button
                                onClick={() => handleEdit(customer)}
                                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                                title="Edit customer"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(customer)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                title="Delete customer"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandedCustomer === customer.id && (
                        <tr key={`${customer.id}-expanded`} className="bg-slate-50 dark:bg-slate-900">
                          <td colSpan={6} className="px-6 py-4 space-y-6">
                            {loadingHistory[customer.id] ? (
                              <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                              </div>
                            ) : (
                              <>
                                <div>
                                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Sales History</div>
                                  {!salesHistory[customer.id] || salesHistory[customer.id].length === 0 ? (
                                    <p className="text-slate-500 dark:text-slate-400">No sales found</p>
                                  ) : (
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                          <th className="text-left py-2 text-slate-600 dark:text-slate-400">Sale Number</th>
                                          <th className="text-left py-2 text-slate-600 dark:text-slate-400">Date</th>
                                          <th className="text-left py-2 text-slate-600 dark:text-slate-400">Items</th>
                                          <th className="text-left py-2 text-slate-600 dark:text-slate-400">Serial Numbers</th>
                                          <th className="text-left py-2 text-slate-600 dark:text-slate-400">Notes</th>
                                          <th className="text-center py-2 text-slate-600 dark:text-slate-400">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {salesHistory[customer.id].map((sale) => (
                                          <tr key={sale.id} className="border-b border-slate-100 dark:border-slate-800">
                                            <td className="py-2 text-slate-700 dark:text-slate-300">{sale.sale_number}</td>
                                            <td className="py-2 text-slate-700 dark:text-slate-300">
                                              {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                                            </td>
                                            <td className="py-2 text-slate-700 dark:text-slate-300">{sale.sale_items.length}</td>
                                            <td className="py-2 text-slate-700 dark:text-slate-300">
                                              <div className="space-y-0.5">
                                                {sale.sale_items.map((item) => (
                                                  <div key={item.id} className="flex items-center gap-2">
                                                    <span>{item.serial_number}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-xs ${item.delivered ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                      {item.delivered ? '✓' : '○'}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            </td>
                                            <td className="py-2 text-slate-700 dark:text-slate-300">{sale.sale_notes || '-'}</td>
                                            <td className="py-2 text-center">
                                              <span className={`px-2 py-1 text-xs rounded-full ${sale.is_delivered ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                                                {sale.is_delivered ? 'Delivered' : 'Pending'}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>

                                <div>
                                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Delivery History</div>
                                  {!deliveryHistory[customer.id] || deliveryHistory[customer.id].length === 0 ? (
                                    <p className="text-slate-500 dark:text-slate-400">No deliveries found</p>
                                  ) : (
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                          <th className="text-left py-2 text-slate-600 dark:text-slate-400">Delivery Date</th>
                                          <th className="text-left py-2 text-slate-600 dark:text-slate-400">Address</th>
                                          <th className="text-left py-2 text-slate-600 dark:text-slate-400">Location</th>
                                          <th className="text-left py-2 text-slate-600 dark:text-slate-400">Items</th>
                                          <th className="text-left py-2 text-slate-600 dark:text-slate-400">Serial Numbers</th>
                                          <th className="text-left py-2 text-slate-600 dark:text-slate-400">Notes</th>
                                          <th className="text-center py-2 text-slate-600 dark:text-slate-400">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {deliveryHistory[customer.id].map((delivery) => (
                                          <tr key={delivery.id} className="border-b border-slate-100 dark:border-slate-800">
                                            <td className="py-2 text-slate-700 dark:text-slate-300">
                                              {new Date(delivery.delivery_date).toLocaleDateString('en-IN')}
                                            </td>
                                            <td className="py-2 text-slate-700 dark:text-slate-300">
                                              {delivery.delivery_address || '-'}
                                            </td>
                                            <td className="py-2 text-slate-700 dark:text-slate-300">
                                              {delivery.delivery_location || '-'}
                                            </td>
                                            <td className="py-2 text-slate-700 dark:text-slate-300">
                                              {delivery.delivery_items.length}
                                            </td>
                                            <td className="py-2 text-slate-700 dark:text-slate-300">
                                              <div className="space-y-0.5">
                                                {delivery.delivery_items.map((item) => (
                                                  <div key={item.id}>
                                                    {item.sale_item.serial_number}
                                                  </div>
                                                ))}
                                              </div>
                                            </td>
                                            <td className="py-2 text-slate-700 dark:text-slate-300">
                                              {delivery.delivery_notes || '-'}
                                            </td>
                                            <td className="py-2 text-center">
                                              <span className={`px-2 py-1 text-xs rounded-full ${delivery.delivered ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                                                {delivery.delivered ? 'Completed' : 'Pending'}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SidePanel
        isOpen={showAddPanel}
        onClose={() => setShowAddPanel(false)}
        title="New Customer"
      >
        <CustomerForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEdit={false}
          users={users}
        />
      </SidePanel>

      <SidePanel
        isOpen={showEditPanel}
        onClose={() => setShowEditPanel(false)}
        title="Edit Customer"
      >
        <CustomerForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEdit={true}
          users={users}
        />
      </SidePanel>

      {showSalesPanel && salesCustomer && (
        <SalesPanel
          customerId={salesCustomer.id}
          customerName={salesCustomer.contact_name}
          onClose={() => {
            setShowSalesPanel(false);
            setSalesCustomer(null);
          }}
          onSuccess={() => {
            setShowSalesPanel(false);
            setSalesCustomer(null);
            loadCustomers();
          }}
        />
      )}

      <PurchaseOrderForm
        isOpen={showPOForm}
        customer={poCustomer ? {
          id: poCustomer.id,
          customer_name: poCustomer.contact_name,
          customer_email: poCustomer.email || '',
          customer_phone: poCustomer.phone || '',
          customer_address: ''
        } : {
          id: '',
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          customer_address: ''
        }}
        onClose={() => {
          setShowPOForm(false);
          setPOCustomer(null);
        }}
        onSuccess={() => {
          setShowPOForm(false);
          setPOCustomer(null);
          loadCustomers();
        }}
      />
    </div>
  );
}
