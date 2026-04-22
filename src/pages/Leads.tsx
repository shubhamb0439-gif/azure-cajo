import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SidePanel from '../components/SidePanel';
import { Pencil, Trash2, Plus, Search, Filter } from 'lucide-react';
import { api } from '../lib/api';

interface Lead {
  id: string;
  company_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  assigned_user?: {
    name: string;
  };
}

interface LeadFormData {
  company_name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  notes: string;
  assigned_to: string;
}

interface LeadFormProps {
  formData: LeadFormData;
  setFormData: (data: LeadFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEdit: boolean;
  leadStatuses: string[];
  leadSources: string[];
  users: any[];
}

function LeadForm({ formData, setFormData, onSubmit, onCancel, isEdit, leadStatuses, leadSources, users }: LeadFormProps) {
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Company Name *
        </label>
        <input
          type="text"
          value={formData.company_name}
          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
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
          Status *
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
          required
        >
          {leadStatuses.map(status => (
            <option key={status} value={status}>
              {capitalize(status)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Source
        </label>
        <select
          value={formData.source}
          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
        >
          <option value="">Select source...</option>
          {leadSources.map(source => (
            <option key={source} value={source}>
              {capitalize(source)}
            </option>
          ))}
        </select>
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
          {isEdit ? 'Update Lead' : 'Create Lead'}
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

export default function Leads() {
  const { user, hasWriteAccess } = useAuth();
  const { isViewOnly } = useCurrency();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<string[]>([]);
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<LeadFormData>({
    company_name: '',
    email: '',
    phone: '',
    status: '',
    source: '',
    notes: '',
    assigned_to: '',
  });

  useEffect(() => {
    loadLeads();
    loadUsers();
    loadDropdowns();
  }, []);

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await api.leads.getAll();

    if (error) {
      console.error('Error loading leads:', error);
      setLoading(false);
      return;
    }

    // Fetch user names for assigned leads
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(l => l.assigned_to).filter(Boolean))];

      if (userIds.length > 0) {
        const { data: usersData } = await api.users.getAll();

        const userMap = new Map(usersData?.map(u => [u.auth_user_id, u.name]));

        const leadsWithUsers = data.map(lead => ({
          ...lead,
          assigned_user: lead.assigned_to ? { name: userMap.get(lead.assigned_to) || 'Unknown' } : null
        }));

        setLeads(leadsWithUsers);
      } else {
        setLeads(data);
      }
    } else {
      setLeads([]);
    }

    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await api.users.getAll();

    if (data) {
      setUsers(data);
    }
  };

  const loadDropdowns = async () => {
    const [statusRes, sourceRes] = await Promise.all([
      api.dropdowns.getValues('lead_status'),
      api.dropdowns.getValues('lead_source'),
    ]);

    if (statusRes.data) setLeadStatuses(statusRes.data.map(d => d.value));
    if (sourceRes.data) setLeadSources(sourceRes.data.map(d => d.value));
  };

  const logActivity = async (action: string, details: string) => {
    await api.activityLogs.create(action, { message: details });
  };

  const moveToProspects = async (lead: Lead) => {
    const { data: prospectData, error: insertError } = await api.prospects.create({
      company_name: lead.company_name,
      email: lead.email,
      phone: lead.phone,
      status: 'qualified',
      notes: lead.notes,
      assigned_to: lead.assigned_to,
      created_by: user?.id,
      updated_by: user?.id,
      lead_id: lead.id,
    });

    if (insertError) {
      alert('Error moving to prospects: ' + insertError.message);
      return false;
    }

    const { error: deleteError } = await api.leads.delete(lead.id);

    if (deleteError) {
      alert('Error removing lead: ' + deleteError.message);
      return false;
    }

    await logActivity('Convert Lead to Prospect', `Moved lead "${lead.company_name}" to prospects`);
    return true;
  };

  const handleAdd = () => {
    setFormData({
      company_name: '',
      email: '',
      phone: '',
      status: leadStatuses[0] || '',
      source: '',
      notes: '',
      assigned_to: '',
    });
    setShowAddPanel(true);
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      company_name: lead.company_name,
      email: lead.email || '',
      phone: lead.phone || '',
      status: lead.status,
      source: lead.source || '',
      notes: lead.notes || '',
      assigned_to: lead.assigned_to || '',
    });
    setShowEditPanel(true);
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Are you sure you want to delete lead "${lead.company_name}"?`)) {
      return;
    }

    const { error } = await api.leads.delete(lead.id);

    if (error) {
      alert('Error deleting lead: ' + error.message);
    } else {
      await logActivity('Delete Lead', `Deleted lead: ${lead.company_name}`);
      loadLeads();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_name.trim()) {
      alert('Please enter a company name');
      return;
    }

    const leadData = {
      company_name: formData.company_name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      status: formData.status,
      source: formData.source || null,
      notes: formData.notes.trim() || null,
      assigned_to: formData.assigned_to && formData.assigned_to.trim() !== '' ? formData.assigned_to : null,
    };

    if (showEditPanel && selectedLead) {
      if (formData.status === 'qualified') {
        const moved = await moveToProspects({ ...selectedLead, status: formData.status });
        if (moved) {
          setShowEditPanel(false);
          loadLeads();
        }
        return;
      }

      const { error } = await api.leads.update(selectedLead.id, leadData);

      if (error) {
        alert('Error updating lead: ' + error.message);
      } else {
        await logActivity('Update Lead', `Updated lead: ${formData.company_name} (Status: ${formData.status})`);
        setShowEditPanel(false);
        loadLeads();
      }
    } else {
      const { error } = await api.leads.create(leadData);

      if (error) {
        alert('Error creating lead: ' + error.message);
      } else {
        await logActivity('Create Lead', `Created new lead: ${formData.company_name}`);
        setShowAddPanel(false);
        loadLeads();
      }
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-indigo-100 text-indigo-800',
      qualified: 'bg-green-100 text-green-800',
      proposal: 'bg-yellow-100 text-yellow-800',
      negotiation: 'bg-orange-100 text-orange-800',
      won: 'bg-emerald-100 text-emerald-800',
      lost: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleCancel = () => {
    setShowAddPanel(false);
    setShowEditPanel(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sales Leads</h1>
        {hasWriteAccess && !isViewOnly && (
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Lead</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              {leadStatuses.map(status => (
                <option key={status} value={status}>
                  {capitalize(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="all">All Sources</option>
              {leadSources.map(source => (
                <option key={source} value={source}>
                  {capitalize(source)}
                </option>
              ))}
            </select>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Company Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Source
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
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No leads found
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{lead.company_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900 dark:text-white">{lead.email || '-'}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{lead.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                          {capitalize(lead.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {lead.source ? capitalize(lead.source) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {lead.assigned_user?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {hasWriteAccess && !isViewOnly && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(lead)}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                              title="Edit lead"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(lead)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              title="Delete lead"
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
      )}

      <SidePanel
        isOpen={showAddPanel}
        onClose={() => setShowAddPanel(false)}
        title="New Lead"
      >
        <LeadForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEdit={false}
          leadStatuses={leadStatuses}
          leadSources={leadSources}
          users={users}
        />
      </SidePanel>

      <SidePanel
        isOpen={showEditPanel}
        onClose={() => setShowEditPanel(false)}
        title="Edit Lead"
      >
        <LeadForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEdit={true}
          leadStatuses={leadStatuses}
          leadSources={leadSources}
          users={users}
        />
      </SidePanel>
    </div>
  );
}
