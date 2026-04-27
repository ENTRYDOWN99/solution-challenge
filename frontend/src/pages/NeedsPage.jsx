import { useState, useEffect } from 'react';
import { needsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import NeedCard from '../components/NeedCard';
import UrgencyBadge from '../components/UrgencyBadge';

const categories = ['all', 'education', 'medical', 'water', 'food', 'shelter', 'plumbing', 'other'];
const statuses = ['all', 'open', 'assigned', 'in_progress', 'resolved'];

export default function NeedsPage() {
  const { isAdmin } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'all', category: 'all', search: '', page: 1 });
  const [pagination, setPagination] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState(null);
  const [formData, setFormData] = useState({
    title: '', description: '', category: 'other', area_name: '',
    location_lat: '', location_lng: '', severity: 3,
    num_people_affected: 10, time_sensitive: false, vulnerability_score: 5,
  });

  useEffect(() => {
    fetchNeeds();
  }, [filters.status, filters.category, filters.page]);

  async function fetchNeeds() {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: 12 };
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.search) params.search = filters.search;

      const { data } = await needsAPI.list(params);
      setNeeds(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch needs:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({ ...filters, page: 1 });
    fetchNeeds();
  };

  const handleCreateNeed = async (e) => {
    e.preventDefault();
    try {
      await needsAPI.create({
        ...formData,
        location_lat: formData.location_lat ? parseFloat(formData.location_lat) : null,
        location_lng: formData.location_lng ? parseFloat(formData.location_lng) : null,
        severity: parseInt(formData.severity),
        num_people_affected: parseInt(formData.num_people_affected),
        vulnerability_score: parseFloat(formData.vulnerability_score),
      });
      setShowForm(false);
      setFormData({ title: '', description: '', category: 'other', area_name: '', location_lat: '', location_lng: '', severity: 3, num_people_affected: 10, time_sensitive: false, vulnerability_score: 5 });
      fetchNeeds();
    } catch (err) {
      console.error('Create need failed:', err);
    }
  };

  const handleNeedClick = async (need) => {
    try {
      const { data } = await needsAPI.get(need.id);
      setSelectedNeed(data);
    } catch (err) {
      setSelectedNeed(need);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Needs Management</h1>
          <p className="text-sm text-surface-200/50 mt-1">Browse and manage community needs</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? '✕ Cancel' : '+ Add Need'}
          </button>
        )}
      </div>

      {/* Add Need Form */}
      {showForm && (
        <div className="glass-card p-6 animate-slide-up">
          <h3 className="text-sm font-semibold mb-4">Create New Need</h3>
          <form onSubmit={handleCreateNeed} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-surface-200/50 mb-1">Title *</label>
              <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-surface-200/50 mb-1">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field h-24 resize-none" />
            </div>
            <div>
              <label className="block text-xs text-surface-200/50 mb-1">Category *</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input-field">
                {categories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-surface-200/50 mb-1">Area Name</label>
              <input value={formData.area_name} onChange={(e) => setFormData({ ...formData, area_name: e.target.value })} className="input-field" placeholder="e.g. Dharavi, Mumbai" />
            </div>
            <div>
              <label className="block text-xs text-surface-200/50 mb-1">Latitude</label>
              <input type="number" step="any" value={formData.location_lat} onChange={(e) => setFormData({ ...formData, location_lat: e.target.value })} className="input-field" placeholder="19.076" />
            </div>
            <div>
              <label className="block text-xs text-surface-200/50 mb-1">Longitude</label>
              <input type="number" step="any" value={formData.location_lng} onChange={(e) => setFormData({ ...formData, location_lng: e.target.value })} className="input-field" placeholder="72.877" />
            </div>
            <div>
              <label className="block text-xs text-surface-200/50 mb-1">Severity (1-5)</label>
              <input type="range" min="1" max="5" value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} className="w-full accent-primary-500" />
              <span className="text-xs text-surface-200/50">{formData.severity} / 5</span>
            </div>
            <div>
              <label className="block text-xs text-surface-200/50 mb-1">People Affected</label>
              <input type="number" value={formData.num_people_affected} onChange={(e) => setFormData({ ...formData, num_people_affected: e.target.value })} className="input-field" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="time-sensitive" checked={formData.time_sensitive} onChange={(e) => setFormData({ ...formData, time_sensitive: e.target.checked })} className="w-4 h-4 accent-primary-500" />
              <label htmlFor="time-sensitive" className="text-sm text-surface-200/70">Time Sensitive</label>
            </div>
            <div>
              <label className="block text-xs text-surface-200/50 mb-1">Vulnerability Score (0-10)</label>
              <input type="number" min="0" max="10" value={formData.vulnerability_score} onChange={(e) => setFormData({ ...formData, vulnerability_score: e.target.value })} className="input-field" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary">Create Need</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input-field text-sm py-2"
            placeholder="Search needs..."
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilters({ ...filters, status: s, page: 1 })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filters.status === s ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-surface-800/50 text-surface-200/50 hover:text-white border border-transparent'
              }`}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilters({ ...filters, category: c, page: 1 })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                filters.category === c ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'bg-surface-800/50 text-surface-200/50 hover:text-white border border-transparent'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Needs Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : needs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-surface-200/40">No needs found matching your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {needs.map((need) => (
            <NeedCard key={need.id} need={need} onClick={handleNeedClick} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setFilters({ ...filters, page: i + 1 })}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                filters.page === i + 1 ? 'bg-primary-500 text-white' : 'bg-surface-800/50 text-surface-200/50 hover:text-white'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Need Detail Modal */}
      {selectedNeed && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedNeed(null)}>
          <div className="glass-card max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold">{selectedNeed.title}</h2>
              <button onClick={() => setSelectedNeed(null)} className="text-surface-200/40 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <UrgencyBadge score={selectedNeed.urgency_score} size="lg" />
                <span className="badge bg-primary-500/20 text-primary-400 border border-primary-500/30 capitalize">{selectedNeed.category}</span>
                <span className="badge bg-surface-700 text-surface-200/70 capitalize">{selectedNeed.status?.replace('_', ' ')}</span>
              </div>
              <p className="text-sm text-surface-200/60">{selectedNeed.description}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-surface-800/50 rounded-xl">
                  <p className="text-xs text-surface-200/40">Location</p>
                  <p className="font-medium mt-0.5">{selectedNeed.area_name || 'Unknown'}</p>
                </div>
                <div className="p-3 bg-surface-800/50 rounded-xl">
                  <p className="text-xs text-surface-200/40">People Affected</p>
                  <p className="font-medium mt-0.5">{selectedNeed.num_people_affected}</p>
                </div>
                <div className="p-3 bg-surface-800/50 rounded-xl">
                  <p className="text-xs text-surface-200/40">Severity</p>
                  <p className="font-medium mt-0.5">{selectedNeed.severity} / 5</p>
                </div>
                <div className="p-3 bg-surface-800/50 rounded-xl">
                  <p className="text-xs text-surface-200/40">Time Sensitive</p>
                  <p className="font-medium mt-0.5">{selectedNeed.time_sensitive ? '🔴 Yes' : 'No'}</p>
                </div>
              </div>
              {selectedNeed.assignments?.length > 0 && (
                <div>
                  <h4 className="text-xs text-surface-200/40 uppercase tracking-wider mb-2">Assigned Volunteers</h4>
                  {selectedNeed.assignments.map((a, i) => (
                    <div key={i} className="p-3 bg-surface-800/30 rounded-xl mb-2">
                      <p className="text-sm font-medium">{a.volunteer_name}</p>
                      <p className="text-xs text-surface-200/40 capitalize">{a.task_status?.replace('_', ' ')}</p>
                    </div>
                  ))}
                </div>
              )}
              {selectedNeed.location_lat && selectedNeed.location_lng && (
                <a
                  href={`https://www.google.com/maps?q=${selectedNeed.location_lat},${selectedNeed.location_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm inline-flex items-center gap-2"
                >
                  📍 View on Google Maps
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
