import { useState, useEffect } from 'react';
import { volunteersAPI, matchingAPI } from '../services/api';
import VolunteerCard from '../components/VolunteerCard';
import AvailabilityGrid from '../components/AvailabilityGrid';
import MatchScoreBar from '../components/MatchScoreBar';

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVol, setSelectedVol] = useState(null);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchVolunteers();
  }, [page]);

  async function fetchVolunteers() {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (search) params.search = search;
      const { data } = await volunteersAPI.list(params);
      setVolunteers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch volunteers:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchVolunteers();
  };

  const handleVolClick = async (vol) => {
    try {
      const { data } = await volunteersAPI.get(vol.id);
      setSelectedVol(data);
    } catch {
      setSelectedVol(vol);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">Volunteer Management</h1>
        <p className="text-sm text-surface-200/50 mt-1">View and manage volunteer profiles</p>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1 text-sm py-2"
            placeholder="Search volunteers by name or email..."
          />
          <button type="submit" className="btn-primary text-sm">Search</button>
        </form>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : volunteers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🙋</p>
          <p className="text-surface-200/40">No volunteers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {volunteers.map((vol) => (
            <VolunteerCard key={vol.id} volunteer={vol} onClick={handleVolClick} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                page === i + 1 ? 'bg-primary-500 text-white' : 'bg-surface-800/50 text-surface-200/50 hover:text-white'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedVol && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedVol(null)}>
          <div className="glass-card max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-lg font-bold">
                  {selectedVol.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{selectedVol.name}</h2>
                  <p className="text-xs text-surface-200/40">{selectedVol.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedVol(null)} className="text-surface-200/40 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-surface-800/50 rounded-xl text-center">
                  <p className="text-xl font-bold text-primary-400">{Math.round(selectedVol.trust_score)}</p>
                  <p className="text-[10px] text-surface-200/40">Trust Score</p>
                </div>
                <div className="p-3 bg-surface-800/50 rounded-xl text-center">
                  <p className="text-xl font-bold">{selectedVol.active_task_count || 0}</p>
                  <p className="text-[10px] text-surface-200/40">Active Tasks</p>
                </div>
                <div className="p-3 bg-surface-800/50 rounded-xl text-center">
                  <p className="text-xl font-bold">{selectedVol.max_radius_km || 25}</p>
                  <p className="text-[10px] text-surface-200/40">Radius (km)</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs text-surface-200/40 uppercase tracking-wider mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedVol.skills || []).map((s) => (
                    <span key={s} className="px-3 py-1 bg-primary-500/10 text-primary-400 rounded-lg text-xs border border-primary-500/20 capitalize">{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs text-surface-200/40 uppercase tracking-wider mb-2">Languages</h4>
                <p className="text-sm">{(selectedVol.languages || ['English']).join(', ')}</p>
              </div>

              <div>
                <h4 className="text-xs text-surface-200/40 uppercase tracking-wider mb-2">Availability</h4>
                <AvailabilityGrid availability={selectedVol.availability || {}} />
              </div>

              <MatchScoreBar score={selectedVol.trust_score / 100} label="Trust Score" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
