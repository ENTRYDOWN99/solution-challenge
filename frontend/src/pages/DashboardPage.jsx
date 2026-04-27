import { useState, useEffect } from 'react';
import { analyticsAPI, needsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';
import UrgencyBadge from '../components/UrgencyBadge';
import HeatMap from '../components/HeatMap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [topNeeds, setTopNeeds] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [coverageGaps, setCoverageGaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [summaryRes, trendsRes, topNeedsRes, heatmapRes, gapsRes] = await Promise.allSettled([
        analyticsAPI.summary(),
        analyticsAPI.trends(),
        analyticsAPI.topNeeds(),
        needsAPI.heatmap(),
        analyticsAPI.coverageGaps(),
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (trendsRes.status === 'fulfilled') setTrends(trendsRes.value.data);
      if (topNeedsRes.status === 'fulfilled') setTopNeeds(topNeedsRes.value.data);
      if (heatmapRes.status === 'fulfilled') setHeatmapData(heatmapRes.value.data);
      if (gapsRes.status === 'fulfilled') setCoverageGaps(gapsRes.value.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-sm text-surface-200/50 mt-1">Overview of community needs and volunteer activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon="🆘" label="Total Needs" value={summary?.totalNeeds} color="danger" />
        <StatsCard icon="✅" label="Resolved This Week" value={summary?.resolvedThisWeek} color="success" />
        <StatsCard icon="🙋" label="Active Volunteers" value={summary?.activeVolunteers} color="primary" />
        <StatsCard icon="⏱️" label="Avg Match Time" value={summary?.avgMatchTimeHours ? `${summary.avgMatchTimeHours}h` : 'N/A'} color="accent" />
      </div>

      {/* Charts + Map row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends Chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4">Needs vs Resolutions (30 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(241,245,249,0.3)', fontSize: 10 }} tickFormatter={(v) => v?.slice(5)} />
                <YAxis tick={{ fill: 'rgba(241,245,249,0.3)', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: 'rgba(241,245,249,0.7)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} dot={false} name="Created" />
                <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} dot={false} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heat Map */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4">Needs Heatmap</h3>
          <div className="h-64 rounded-xl overflow-hidden">
            <HeatMap data={heatmapData} />
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Urgent Needs */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4">🔥 Top Urgent Needs</h3>
          <div className="space-y-3">
            {topNeeds.length === 0 ? (
              <p className="text-surface-200/40 text-sm py-4 text-center">No open needs</p>
            ) : (
              topNeeds.map((need, i) => (
                <div key={need.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <span className="text-lg font-bold text-surface-200/20 w-6 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{need.title}</p>
                    <p className="text-xs text-surface-200/40">{need.area_name} • {need.num_people_affected} people</p>
                  </div>
                  <UrgencyBadge score={need.urgency_score} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coverage Gaps */}
        {isAdmin && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold mb-4">📍 Coverage Gaps</h3>
            <div className="space-y-3">
              {coverageGaps.length === 0 ? (
                <p className="text-surface-200/40 text-sm py-4 text-center">Good coverage everywhere!</p>
              ) : (
                coverageGaps.slice(0, 5).map((gap, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                    <div>
                      <p className="text-sm font-medium">{gap.area_name}</p>
                      <p className="text-xs text-surface-200/40">
                        {gap.need_count} needs • {gap.volunteer_count} volunteers
                      </p>
                    </div>
                    <span className={`badge border ${
                      gap.severity === 'critical' ? 'badge-critical' :
                      gap.severity === 'high' ? 'badge-high' :
                      gap.severity === 'medium' ? 'badge-medium' : 'badge-low'
                    }`}>
                      {gap.severity}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
