import { useState, useEffect, useCallback } from 'react';
import { matchingAPI, needsAPI } from '../services/api';
import MatchScoreBar from '../components/MatchScoreBar';
import UrgencyBadge from '../components/UrgencyBadge';
import TaskTimeline from '../components/TaskTimeline';

export default function MatchingPage() {
  const [needs, setNeeds] = useState([]);
  const [selectedNeed, setSelectedNeed] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [recentAssignments, setRecentAssignments] = useState([]);

  useEffect(() => {
    fetchOpenNeeds();
    // Poll for recent assignments every 30s
    const interval = setInterval(fetchOpenNeeds, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchOpenNeeds() {
    try {
      const { data } = await needsAPI.list({ status: 'open', limit: 50 });
      setNeeds(data.data || []);
    } catch (err) {
      console.error('Failed to fetch needs:', err);
    }
  }

  async function handleRunMatching() {
    setRunning(true);
    try {
      const { data } = await matchingAPI.run({});
      setRunResult(data);
      fetchOpenNeeds();
    } catch (err) {
      console.error('Matching failed:', err);
    } finally {
      setRunning(false);
    }
  }

  async function fetchSuggestions(needId) {
    setLoadingSuggestions(true);
    try {
      const { data } = await matchingAPI.suggestions(needId);
      setSuggestions(Array.isArray(data) ? data : []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  const handleSelectNeed = (need) => {
    setSelectedNeed(need);
    fetchSuggestions(need.id);
  };

  const handleAssign = async (volunteerId) => {
    if (!selectedNeed) return;
    setAssigning(volunteerId);
    try {
      const { data } = await matchingAPI.assign({
        need_id: selectedNeed.id,
        volunteer_id: volunteerId,
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      setRecentAssignments(prev => [
        { ...data.task, need: selectedNeed, volunteer: suggestions.find(s => s.id === volunteerId || s.volunteer_id === volunteerId) },
        ...prev,
      ]);
      setSelectedNeed(null);
      setSuggestions([]);
      fetchOpenNeeds();
    } catch (err) {
      console.error('Assignment failed:', err);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Matching Center</h1>
          <p className="text-sm text-surface-200/50 mt-1">Match volunteers to community needs</p>
        </div>
        <button
          onClick={handleRunMatching}
          disabled={running}
          className="btn-primary flex items-center gap-2"
        >
          {running ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>🔄 Run Matching Engine</>
          )}
        </button>
      </div>

      {/* Run result */}
      {runResult && (
        <div className="glass-card p-4 border-success-500/20 bg-success-500/5 animate-slide-up">
          <p className="text-success-400 text-sm font-medium">✅ Matching Complete</p>
          <p className="text-xs text-surface-200/50 mt-1">
            Processed {runResult.needsProcessed} needs • Generated {runResult.matchesGenerated} matches
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Needs List */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4">Open Needs ({needs.length})</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {needs.length === 0 ? (
              <p className="text-surface-200/40 text-sm py-8 text-center">No open needs</p>
            ) : (
              needs.map((need) => (
                <div
                  key={need.id}
                  onClick={() => handleSelectNeed(need)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    selectedNeed?.id === need.id
                      ? 'bg-primary-500/10 border border-primary-500/30'
                      : 'bg-white/[0.02] hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{need.title}</p>
                      <p className="text-xs text-surface-200/40 mt-0.5">{need.area_name} • {need.num_people_affected} people</p>
                    </div>
                    <UrgencyBadge score={need.urgency_score} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Suggestions Panel */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4">
            {selectedNeed ? `Top Matches for: ${selectedNeed.title}` : 'Select a need to see matches'}
          </h3>

          {!selectedNeed ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🔗</p>
              <p className="text-surface-200/40 text-sm">Click a need on the left to see matched volunteers</p>
            </div>
          ) : loadingSuggestions ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">😔</p>
              <p className="text-surface-200/40 text-sm">No matching volunteers found</p>
              <p className="text-xs text-surface-200/30 mt-1">Try running the matching engine first</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((vol, i) => (
                <div key={vol.id || i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold">
                        {vol.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{vol.name}</p>
                        <p className="text-xs text-surface-200/40">{vol.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssign(vol.volunteer_id || vol.id)}
                      disabled={assigning === (vol.volunteer_id || vol.id)}
                      className="btn-success text-xs py-1.5 px-3"
                    >
                      {assigning === (vol.volunteer_id || vol.id) ? 'Assigning...' : 'Assign'}
                    </button>
                  </div>
                  <MatchScoreBar score={vol.match_score} label="Match Score" />
                  <div className="flex gap-3 mt-2 text-xs text-surface-200/40">
                    <span>📏 {vol.distance_km?.toFixed(1) || '?'} km</span>
                    <span>⭐ Trust: {Math.round(vol.trust_score)}</span>
                    <span>📋 {vol.active_task_count || 0} tasks</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(vol.skills || []).map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-primary-500/10 text-primary-400 rounded text-[10px] capitalize">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Assignments Feed */}
      {recentAssignments.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4">🕐 Recent Assignments</h3>
          <div className="space-y-3">
            {recentAssignments.slice(0, 5).map((a, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/[0.02] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{a.need?.title}</p>
                  <p className="text-xs text-surface-200/40">→ {a.volunteer?.name || 'Volunteer'}</p>
                </div>
                <TaskTimeline status={a.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
