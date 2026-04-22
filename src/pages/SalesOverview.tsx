import { useState, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { Target, UserPlus, Users, TrendingUp, DollarSign, Tag, User } from 'lucide-react';
import { azureAuth } from '../lib/azureAuth';
import { api } from '../lib/api';

interface Lead {
  id: string;
  company_name: string;
  status: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  assigned_to: string | null;
}

interface Prospect {
  id: string;
  company_name: string;
  status: string;
  email: string | null;
  phone: string | null;
  assigned_to: string | null;
  original_lead_id?: string | null;
}

interface Customer {
  id: string;
  contact_name: string;
  customer_company: string | null;
  email: string | null;
  phone: string | null;
  original_prospect_id?: string | null;
}

interface UserProfile {
  id: string;
  name: string;
}

const leadStatuses = [
  { value: 'new', label: 'New', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  { value: 'contacted', label: 'Contacted', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
  { value: 'qualified', label: 'Qualified', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
];

const prospectStatuses = [
  { value: 'qualified', label: 'Qualified', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' },
  { value: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  { value: 'demo_completed', label: 'Demo Completed', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' },
  { value: 'won', label: 'Won', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
];

export default function SalesOverview() {
  const { formatAmount, getCurrencySymbol } = useCurrency();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leads' | 'prospects' | 'customers'>('leads');
  const [draggedItem, setDraggedItem] = useState<{ type: 'lead' | 'prospect' | 'customer', id: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [leadsData, prospectsData, customersData, usersData] = await Promise.all([
      api.leads.getAll(),
      api.prospects.getAll(),
      api.customers.getAll(),
      api.users.getAll(),
    ]);

    if (leadsData.data) setLeads(leadsData.data);
    if (prospectsData.data) setProspects(prospectsData.data);
    if (customersData.data) setCustomers(customersData.data);
    if (usersData.data) setUsers(usersData.data);

    setLoading(false);
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown';
  };

  const getLeadsByStatus = (status: string) => leads.filter(l => l.status === status);
  const getProspectsByStatus = (status: string) => prospects.filter(p => p.status === status);

  const handleDragStart = (e: React.DragEvent, type: 'lead' | 'prospect' | 'customer', id: string) => {
    setDraggedItem({ type, id });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();

    if (!draggedItem) return;

    const _azureSession = azureAuth.getSession(); const user = _azureSession?.user;
    if (!user) return;

    if (draggedItem.type === 'lead') {
      const lead = leads.find(l => l.id === draggedItem.id);
      if (!lead) return;

      if (targetStatus === 'qualified') {
        await convertLeadToProspect(lead, user.id);
      } else {
        await api.leads.update(draggedItem.id, { status: targetStatus });
      }
    } else if (draggedItem.type === 'prospect') {
      const prospect = prospects.find(p => p.id === draggedItem.id);
      if (!prospect) return;

      if (targetStatus === 'won') {
        await convertProspectToCustomer(prospect, user.id);
      } else {
        await api.prospects.update(draggedItem.id, { status: targetStatus });
      }
    }

    setDraggedItem(null);
    await loadData();
  };

  const convertLeadToProspect = async (lead: Lead, userId: string) => {
    const { data: newProspect, error: insertError } = await api.prospects.create({
      company_name: lead.company_name,
      email: lead.email,
      phone: lead.phone,
      status: 'qualified',
      assigned_to: lead.assigned_to,
    });
    if (!insertError && newProspect) {
      await api.leads.delete(lead.id);
    }
  };

  const convertProspectToCustomer = async (prospect: Prospect, userId: string) => {
    const { data: newCustomer, error: insertError } = await api.customers.create({
      contact_name: prospect.company_name,
      email: prospect.email,
      phone: prospect.phone,
      assigned_to: prospect.assigned_to,
    });
    if (!insertError && newCustomer) {
      await api.prospects.delete(prospect.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-slate-600 dark:text-slate-400">Loading CRM data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">CRM Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Visualize your sales pipeline</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Leads</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{leads.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Target className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Prospects</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{prospects.length}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <UserPlus className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Customers</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{customers.length}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'leads'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Leads ({leads.length})
            </button>
            <button
              onClick={() => setActiveTab('prospects')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'prospects'
                  ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Prospects ({prospects.length})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'customers'
                  ? 'border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Customers ({customers.length})
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <div className="inline-flex space-x-4 min-w-full">
              {activeTab === 'leads' && leadStatuses.map(status => {
                const statusLeads = getLeadsByStatus(status.value);
                return (
                  <div
                    key={status.value}
                    className="flex-shrink-0 w-72"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status.value)}
                  >
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{status.label}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {statusLeads.length}
                        </span>
                      </div>
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {statusLeads.map(lead => (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'lead', lead.id)}
                            className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-move border border-slate-200 dark:border-slate-700"
                          >
                            <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                              {lead.company_name}
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {lead.source && (
                                <div className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                                  <Tag className="w-3 h-3" />
                                  {lead.source}
                                </div>
                              )}
                              {lead.assigned_to && (
                                <div className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                  <User className="w-3 h-3" />
                                  {getUserName(lead.assigned_to)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {statusLeads.length === 0 && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                            No leads
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {activeTab === 'prospects' && prospectStatuses.map(status => {
                const statusProspects = getProspectsByStatus(status.value);
                return (
                  <div
                    key={status.value}
                    className="flex-shrink-0 w-72"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status.value)}
                  >
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{status.label}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {statusProspects.length}
                        </span>
                      </div>
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {statusProspects.map(prospect => (
                          <div
                            key={prospect.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'prospect', prospect.id)}
                            className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-move border border-slate-200 dark:border-slate-700"
                          >
                            <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                              {prospect.company_name}
                            </h4>
                          </div>
                        ))}
                        {statusProspects.length === 0 && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                            No prospects
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {activeTab === 'customers' && (
                <div className="flex-shrink-0 w-full">
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900 dark:text-white">Customers</h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        {customers.length}
                      </span>
                    </div>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {customers.map(customer => (
                        <div
                          key={customer.id}
                          className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                            {customer.contact_name}
                          </h4>
                          {customer.customer_company && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              {customer.customer_company}
                            </p>
                          )}
                        </div>
                      ))}
                      {customers.length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                          No customers
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
