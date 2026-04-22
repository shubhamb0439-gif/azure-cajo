import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import SidePanel from '../components/SidePanel';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { api } from '../lib/api';

interface Prospect {
  id: string;
  company_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  lead_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  assigned_user?: {
    name: string;
  };
}

interface ProspectFormData {
  company_name: string;
  email: string;
  phone: string;
  status: string;
  notes: string;
  assigned_to: string;
}

interface ProspectFormProps {
  formData: ProspectFormData;
  setFormData: (data: ProspectFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEdit: boolean;
  prospectStatuses: string[];
  users: any[];
}

function ProspectForm({ formData, setFormData, onSubmit, onCancel, isEdit, prospectStatuses, users }: ProspectFormProps) {
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');

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
          {prospectStatuses.map(status => (
            <option key={status} value={status}>
              {capitalize(status)}
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
          {isEdit ? 'Update Prospect' : 'Create Prospect'}
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

export default function Prospects() {
  const { user, hasWriteAccess } = useAuth();
  const { isViewOnly } = useCurrency();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [prospectStatuses, setProspectStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [formData, setFormData] = useState<ProspectFormData>({
    company_name: '',
    email: '',
    phone: '',
    status: '',
    notes: '',
    assigned_to: '',
  });

  useEffect(() => {
    loadProspects();
    loadUsers();
    loadDropdowns();
  }, []);

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');

  const loadProspects = async () => {
    setLoading(true);
    const { data, error } = await api.prospects.getAll();

    if (error) {
      console.error('Error loading prospects:', error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(p => p.assigned_to).filter(Boolean))];

      if (userIds.length > 0) {
        const { data: usersData } = await api.users.getAll();

        const userMap = new Map(usersData?.map(u => [u.auth_user_id, u.name]));

        const prospectsWithUsers = data.map(prospect => ({
          ...prospect,
          assigned_user: prospect.assigned_to ? { name: userMap.get(prospect.assigned_to) || 'Unknown' } : null
        }));

        setProspects(prospectsWithUsers);
      } else {
        setProspects(data);
      }
    } else {
      setProspects([]);
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
    const [statusRes] = await Promise.all([
      api.dropdowns.getValues('lead_status'),
    ]);

    if (statusRes.data) setProspectStatuses(statusRes.data.map(d => d.value));
  };

  const logActivity = async (action: string, details: string) => {
    await api.activityLogs.create(action, { message: details });
  };

  const moveToCustomers = async (prospect: Prospect) => {
    const { data: customerData, error: insertError } = await api.customers.create({
      contact_name: prospect.company_name,
      email: prospect.email,
      phone: prospect.phone,
      customer_company: prospect.company_name,
      notes: prospect.notes,
      assigned_to: prospect.assigned_to,
      created_by: user?.id,
      updated_by: user?.id,
    });

    if (insertError) {
      alert('Error moving to customers: ' + insertError.message);
      return false;
    }

    const { error: deleteError } = await api.prospects.delete(prospect.id);

    if (deleteError) {
      alert('Error removing prospect: ' + deleteError.message);
      return false;
    }

    await logActivity('Convert Prospect to Customer', `Moved prospect "${prospect.company_name}" to customers`);
    return true;
  };

  const handleAdd = () => {
    setFormData({
      company_name: '',
      email: '',
      phone: '',
      status: prospectStatuses[0] || '',
      notes: '',
      assigned_to: '',
    });
    setShowAddPanel(true);
  };

  const handleEdit = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setFormData({
      company_name: prospect.company_name,
      email: prospect.email || '',
      phone: prospect.phone || '',
      status: prospect.status,
      notes: prospect.notes || '',
      assigned_to: prospect.assigned_to || '',
    });
    setShowEditPanel(true);
  };

  const handleDelete = async (prospect: Prospect) => {
    if (!confirm(`Are you sure you want to delete prospect "${prospect.company_name}"?`)) {
      return;
    }

    const { error } = await api.prospects.delete(prospect.id);

    if (error) {
      alert('Error deleting prospect: ' + error.message);
    } else {
      await logActivity('Delete Prospect', `Deleted prospect: ${prospect.company_name}`);
      loadProspects();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_name.trim()) {
      alert('Please enter a company name');
      return;
    }

    const prospectData = {
      company_name: formData.company_name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      status: formData.status,
      notes: formData.notes.trim() || null,
      assigned_to: formData.assigned_to && formData.assigned_to.trim() !== '' ? formData.assigned_to : null,
    };

    if (showEditPanel && selectedProspect) {
      if (formData.status === 'won') {
        const moved = await moveToCustomers({ ...selectedProspect, status: formData.status });
        if (moved) {
          setShowEditPanel(false);
          loadProspects();
        }
        return;
      }

      const { error } = await api.prospects.update(selectedProspect.id, prospectData);

      if (error) {
        alert('Error updating prospect: ' + error.message);
      } else {
        await logActivity('Update Prospect', `Updated prospect: ${formData.company_name} (Status: ${formData.status})`);
        setShowEditPanel(false);
        loadProspects();
      }
    } else {
      const { error } = await api.prospects.create(prospectData);

      if (error) {
        alert('Error creating prospect: ' + error.message);
      } else {
        await logActivity('Create Prospect', `Created new prospect: ${formData.company_name}`);
        setShowAddPanel(false);
        loadProspects();
      }
    }
  };

  const filteredProspects = prospects.filter(prospect => {
    const matchesSearch =
      prospect.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.phone?.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || prospect.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      qualified: 'bg-blue-100 text-blue-800',
      contacted: 'bg-indigo-100 text-indigo-800',
      demo_scheduled: 'bg-purple-100 text-purple-800',
      demo_completed: 'bg-cyan-100 text-cyan-800',
      proposal_sent: 'bg-yellow-100 text-yellow-800',
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
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Prospects</h1>
        {hasWriteAccess && !isViewOnly && (
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Prospect</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search prospects..."
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
              {prospectStatuses.map(status => (
                <option key={status} value={status}>
                  {capitalize(status)}
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
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredProspects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No prospects found
                    </td>
                  </tr>
                ) : (
                  filteredProspects.map((prospect) => (
                    <tr key={prospect.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{prospect.company_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900 dark:text-white">{prospect.email || '-'}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{prospect.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(prospect.status)}`}>
                          {capitalize(prospect.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {prospect.assigned_user?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {hasWriteAccess && !isViewOnly && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(prospect)}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                              title="Edit prospect"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(prospect)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              title="Delete prospect"
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
        title="New Prospect"
      >
        <ProspectForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEdit={false}
          prospectStatuses={prospectStatuses}
          users={users}
        />
      </SidePanel>

      <SidePanel
        isOpen={showEditPanel}
        onClose={() => setShowEditPanel(false)}
        title="Edit Prospect"
      >
        <ProspectForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEdit={true}
          prospectStatuses={prospectStatuses}
          users={users}
        />
      </SidePanel>
    </div>
  );
}
