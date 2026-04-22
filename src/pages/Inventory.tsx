import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatDate } from '../lib/dateUtils';
import { Search, Plus, Pencil, Trash2, ShoppingCart, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { Database } from '../lib/database.types';
import SidePanel from '../components/SidePanel';
import MakePurchasePanel from '../components/MakePurchasePanel';
import { api } from '../lib/api';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type DropdownValue = Database['public']['Tables']['dropdown_values']['Row'];

interface PurchaseItemHistory {
  id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  lead_time_days: number;
  vendor_item_code: string | null;
  created_at: string;
  po_reference: string | null;
  vendor_name: string | null;
}

interface AssemblyHistory {
  id: string;
  quantity: number;
  created_at: string;
  bom_name: string;
  created_by_name: string | null;
}

interface UsageHistory {
  id: string;
  quantity_used: number;
  created_at: string;
  bom_name: string;
  vendor_name: string | null;
  source_type: string | null;
}

interface SalesHistory {
  id: string;
  order_number: string;
  customer_name: string;
  serial_number: string;
  quantity_sold: number;
  sale_date: string;
  delivered: boolean;
  delivered_at: string | null;
}

export default function Inventory() {
  const { userProfile, hasWriteAccess } = useAuth();
  const { formatAmount, getCurrencySymbol, isViewOnly } = useCurrency();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [itemPurchases, setItemPurchases] = useState<Record<string, PurchaseItemHistory[]>>({});
  const [itemAssemblies, setItemAssemblies] = useState<Record<string, AssemblyHistory[]>>({});
  const [itemUsages, setItemUsages] = useState<Record<string, UsageHistory[]>>({});
  const [itemSales, setItemSales] = useState<Record<string, SalesHistory[]>>({});
  const [showMakePurchase, setShowMakePurchase] = useState(false);
  const [purchaseItemId, setPurchaseItemId] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    const handleInventoryChange = () => {
      loadData();
    };

    const handleStockMovement = () => {
      loadData();
      setItemPurchases({});
      setItemAssemblies({});
      setItemUsages({});
      setItemSales({});
    };

    const handleDeliveryUpdate = () => {
      loadData();
      setItemSales({});
    };

    return () => {
      // cleanup if needed
    };
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, filterGroup]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, groupsRes] = await Promise.all([
        api.inventory.getAll(),
        api.dropdowns.getValues('item_group'),
      ]);

      if (itemsRes.data) setItems(itemsRes.data);
      if (groupsRes.data) setGroups(groupsRes.data.map(g => g.value));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterGroup) {
      filtered = filtered.filter((item) => item.category === filterGroup);
    }

    setFilteredItems(filtered);
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete ${itemName}?`)) return;

    try {
      const { error } = await api.inventory.delete(id);

      if (error) throw error;

      await api.activityLogs.create('DELETE_ITEM', { itemName });

      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const toggleRowExpansion = async (itemId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);

      if (!itemPurchases[itemId]) {
        try {
          const { data: purchasesData } = await api.purchases.getAll();
          if (purchasesData) {
            const purchases: PurchaseItemHistory[] = [];
            for (const purchase of purchasesData) {
              for (const item of (purchase.purchase_items || [])) {
                if ((item as any).inventory_item_id === itemId) {
                  purchases.push({
                    id: item.id,
                    quantity_ordered: (item as any).quantity_ordered,
                    quantity_received: (item as any).quantity_received || 0,
                    unit_cost: (item as any).unit_cost,
                    lead_time_days: (item as any).lead_time_days,
                    vendor_item_code: (item as any).vendor_item_code,
                    created_at: (purchase as any).created_at,
                    po_reference: (purchase as any).po_reference,
                    vendor_name: (purchase as any).vendors?.name || null,
                  });
                }
              }
            }
            setItemPurchases(prev => ({ ...prev, [itemId]: purchases }));
          } else {
            setItemPurchases(prev => ({ ...prev, [itemId]: [] }));
          }
        } catch {
          setItemPurchases(prev => ({ ...prev, [itemId]: [] }));
        }
      }

      if (!itemAssemblies[itemId]) {
        try {
          const { data: assembliesAllData } = await api.assemblies.getAll();
          if (assembliesAllData) {
            const filtered = (assembliesAllData as any[]).filter(a => a.boms?.finished_product_id === itemId);
            const assemblies: AssemblyHistory[] = filtered.map((a: any) => ({
              id: a.id,
              quantity: a.quantity,
              created_at: a.created_at,
              bom_name: a.boms?.name || '',
              created_by_name: a.users?.name || null,
            }));
            setItemAssemblies(prev => ({ ...prev, [itemId]: assemblies }));
          } else {
            setItemAssemblies(prev => ({ ...prev, [itemId]: [] }));
          }
        } catch {
          setItemAssemblies(prev => ({ ...prev, [itemId]: [] }));
        }
      }

      if (!itemUsages[itemId]) {
        try {
          const { data: bomsData } = await api.boms.getAll();
          const { data: assembliesData } = await api.assemblies.getAll();

          if (bomsData && assembliesData) {
            const relevantBomComponents: { bom_id: string; quantity_required: number }[] = [];
            for (const bom of bomsData) {
              for (const comp of ((bom as any).bom_components || [])) {
                if (comp.inventory_item_id === itemId) {
                  relevantBomComponents.push({
                    bom_id: (bom as any).id,
                    quantity_required: comp.quantity_required,
                  });
                }
              }
            }

            if (relevantBomComponents.length > 0) {
              const usages: UsageHistory[] = [];
              for (const assembly of assembliesData) {
                const bomItem = relevantBomComponents.find(bi => bi.bom_id === (assembly as any).bom_id);
                if (!bomItem) continue;

                const quantityUsed = bomItem.quantity_required * assembly.quantity;
                usages.push({
                  id: assembly.id,
                  quantity_used: quantityUsed,
                  created_at: assembly.created_at,
                  bom_name: (assembly as any).boms?.name || '',
                  vendor_name: 'Cajo Technologies',
                  source_type: null,
                });
              }
              setItemUsages(prev => ({ ...prev, [itemId]: usages }));
            } else {
              setItemUsages(prev => ({ ...prev, [itemId]: [] }));
            }
          } else {
            setItemUsages(prev => ({ ...prev, [itemId]: [] }));
          }
        } catch {
          setItemUsages(prev => ({ ...prev, [itemId]: [] }));
        }
      }

      try {
        const { data: allSalesData } = await api.sales.getAll();
        if (allSalesData && allSalesData.length > 0) {
          const sales: SalesHistory[] = [];
          for (const sale of allSalesData) {
            for (const item of ((sale as any).sale_items || [])) {
              if (item.delivered) {
                sales.push({
                  id: sale.id,
                  order_number: (sale as any).order_number,
                  customer_name: (sale as any).customers?.customer_name || 'Unknown',
                  serial_number: item.serial_number,
                  quantity_sold: 1,
                  sale_date: (sale as any).sale_date,
                  delivered: item.delivered,
                  delivered_at: (sale as any).deliveries?.[0]?.delivered_at || null,
                });
              }
            }
          }
          setItemSales(prev => ({ ...prev, [itemId]: sales }));
        } else {
          setItemSales(prev => ({ ...prev, [itemId]: [] }));
        }
      } catch {
        setItemSales(prev => ({ ...prev, [itemId]: [] }));
      }
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inventory Items</h1>
        {hasWriteAccess && !isViewOnly && (
          <button
            onClick={() => {
              setEditingItem(null);
              setShowItemForm(true);
            }}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Item</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
          >
            <option value="">All Groups</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-8"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Sold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Unit Cost
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredItems.map((item) => (
                <>
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleRowExpansion(item.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {expandedRows.has(item.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {item.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-medium ${
                            item.quantity_in_stock < item.reorder_point
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.quantity_in_stock}
                        </span>
                        {item.quantity_in_stock < item.reorder_point && (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {item.sales_sold || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {getCurrencySymbol()}{formatAmount(item.unit_cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      {hasWriteAccess && !isViewOnly && (
                        <>
                          <button
                            onClick={() => {
                              setPurchaseItemId(item.id);
                              setShowMakePurchase(true);
                            }}
                            className="inline-flex items-center p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            title="Purchase"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setShowItemForm(true);
                            }}
                            className="inline-flex items-center p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="inline-flex items-center p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {expandedRows.has(item.id) && (
                    <tr key={`${item.id}-expanded`} className="bg-slate-50 dark:bg-slate-900">
                      <td colSpan={9} className="px-6 py-4 space-y-6">
                        <div>
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Purchase History</div>
                          {itemPurchases[item.id] && itemPurchases[item.id].length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Date</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Vendor</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Vendor Code</th>
                                  <th className="text-right py-2 text-slate-600 dark:text-slate-400">Ordered</th>
                                  <th className="text-right py-2 text-slate-600 dark:text-slate-400">Delivered</th>
                                  <th className="text-right py-2 text-slate-600 dark:text-slate-400">Undelivered</th>
                                  <th className="text-right py-2 text-slate-600 dark:text-slate-400">Unit Cost</th>
                                  <th className="text-right py-2 text-slate-600 dark:text-slate-400">Total</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Lead Time</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">PO #</th>
                                  <th className="text-center py-2 text-slate-600 dark:text-slate-400">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itemPurchases[item.id].map((purchase) => {
                                  const quantityDelivered = purchase.quantity_received || 0;
                                  const quantityUndelivered = purchase.quantity_ordered - quantityDelivered;
                                  return (
                                    <tr key={purchase.id} className="border-b border-slate-100 dark:border-slate-800">
                                      <td className="py-2 text-slate-700 dark:text-slate-300">
                                        {formatDate(purchase.created_at)}
                                      </td>
                                      <td className="py-2 text-slate-700 dark:text-slate-300">
                                        {purchase.vendor_name || '-'}
                                      </td>
                                      <td className="py-2 text-slate-700 dark:text-slate-300">
                                        {purchase.vendor_item_code || '-'}
                                      </td>
                                      <td className="py-2 text-right text-slate-700 dark:text-slate-300">
                                        {purchase.quantity_ordered}
                                      </td>
                                      <td className="py-2 text-right text-slate-700 dark:text-slate-300">
                                        <span className={quantityDelivered > 0 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                                          {quantityDelivered}
                                        </span>
                                      </td>
                                      <td className="py-2 text-right text-slate-700 dark:text-slate-300">
                                        <span className={quantityUndelivered > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                                          {quantityUndelivered}
                                        </span>
                                      </td>
                                      <td className="py-2 text-right text-slate-700 dark:text-slate-300">
                                        {getCurrencySymbol()}{formatAmount(purchase.unit_cost)}
                                      </td>
                                      <td className="py-2 text-right text-slate-700 dark:text-slate-300">
                                        {getCurrencySymbol()}{formatAmount(purchase.quantity_ordered * purchase.unit_cost)}
                                      </td>
                                      <td className="py-2 text-slate-700 dark:text-slate-300">
                                        {purchase.lead_time_days > 0 ? `${purchase.lead_time_days} days` : '-'}
                                      </td>
                                      <td className="py-2 text-slate-700 dark:text-slate-300">
                                        {purchase.po_reference || '-'}
                                      </td>
                                      <td className="py-2 text-center">
                                        {quantityDelivered >= purchase.quantity_ordered ? (
                                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded">
                                            Complete
                                          </span>
                                        ) : quantityDelivered > 0 ? (
                                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 rounded">
                                            {((quantityDelivered / purchase.quantity_ordered) * 100).toFixed(0)}%
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400 rounded">
                                            Pending
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-slate-500 dark:text-slate-400">No purchases yet</p>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Assembled History</div>
                          {itemAssemblies[item.id] && itemAssemblies[item.id].length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Date</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">BOM</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Quantity</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Created By</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itemAssemblies[item.id].map((assembly) => (
                                  <tr key={assembly.id} className="border-b border-slate-100 dark:border-slate-800">
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {formatDate(assembly.created_at)}
                                    </td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{assembly.bom_name}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">+{assembly.quantity}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{assembly.created_by_name || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-slate-500 dark:text-slate-400">No assembly history</p>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Used History</div>
                          {itemUsages[item.id] && itemUsages[item.id].length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Date</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">BOM</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Quantity Used</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Source</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itemUsages[item.id].map((usage, idx) => (
                                  <tr key={`${usage.id}-${idx}`} className="border-b border-slate-100 dark:border-slate-800">
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {formatDate(usage.created_at)}
                                    </td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{usage.bom_name}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">-{usage.quantity_used}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{usage.vendor_name}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-slate-500 dark:text-slate-400">No usage history</p>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Delivered History</div>
                          {itemSales[item.id] && itemSales[item.id].length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Delivery Date</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Order #</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Customer</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Serial Number</th>
                                  <th className="text-left py-2 text-slate-600 dark:text-slate-400">Quantity</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itemSales[item.id].map((sale, idx) => (
                                  <tr key={`${sale.id}-${idx}`} className="border-b border-slate-100 dark:border-slate-800">
                                    <td className="py-2 text-slate-700 dark:text-slate-300">
                                      {sale.delivered_at ? formatDate(sale.delivered_at) : '-'}
                                    </td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{sale.order_number}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{sale.customer_name}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">{sale.serial_number}</td>
                                    <td className="py-2 text-slate-700 dark:text-slate-300">-{sale.quantity_sold}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-slate-500 dark:text-slate-400">No delivery history</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No items found</p>
            </div>
          )}
        </div>
      </div>

      {showItemForm && (
        <ItemFormPanel
          item={editingItem}
          groups={groups}
          onClose={() => {
            setShowItemForm(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            setShowItemForm(false);
            setEditingItem(null);
            loadData();
          }}
        />
      )}

      {showMakePurchase && (
        <MakePurchasePanel
          initialItemId={purchaseItemId}
          onClose={() => {
            setShowMakePurchase(false);
            setPurchaseItemId(null);
          }}
          onSuccess={() => {
            setShowMakePurchase(false);
            setPurchaseItemId(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

interface ItemFormPanelProps {
  item: InventoryItem | null;
  groups: string[];
  onClose: () => void;
  onSuccess: () => void;
}

function ItemFormPanel({ item, groups, onClose, onSuccess }: ItemFormPanelProps) {
  const { userProfile } = useAuth();
  const [formData, setFormData] = useState({
    sku: item?.sku || '',
    name: item?.name || '',
    description: item?.description || '',
    unit: item?.unit || 'pcs',
    category: item?.category || '',
    reorder_point: item?.reorder_point || 0,
    is_finished_product: item?.is_finished_product || false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (item) {
        const { error } = await api.inventory.update(item.id, formData);

        if (error) throw error;

        await api.activityLogs.create('UPDATE_ITEM', { itemId: item.sku, itemName: formData.name });
      } else {
        const { error } = await api.inventory.create(formData);

        if (error) throw error;

        await api.activityLogs.create('CREATE_ITEM', { itemId: formData.sku, itemName: formData.name });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidePanel isOpen={true} onClose={onClose} title={item ? 'Edit Item' : 'Add Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              SKU *
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              required
              disabled={!!item}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Unit *
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="">Select Category</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reorder Point
            </label>
            <input
              type="number"
              value={formData.reorder_point}
              onChange={(e) => setFormData({ ...formData, reorder_point: parseFloat(e.target.value) })}
              onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_finished_product"
              checked={formData.is_finished_product}
              onChange={(e) => setFormData({ ...formData, is_finished_product: e.target.checked })}
              className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-2 focus:ring-green-500"
            />
            <label htmlFor="is_finished_product" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
              Finished Product
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : item ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
    </SidePanel>
  );
}
