import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { volunteersAPI, matchingAPI } from '../services/api';
import TaskTimeline from '../components/TaskTimeline';

export default function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [volProfile, setVolProfile] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Get volunteer profile
      const { data: meData } = await volunteersAPI.list({ search: user?.email });
      if (meData.data?.[0]) {
        setVolProfile(meData.data[0]);
        // Get tasks
        const { data: taskData } = await volunteersAPI.getTasks(meData.data[0].id);
        setTasks(taskData.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(taskId) {
    setActionLoading(taskId);
    try {
      await matchingAPI.accept(taskId);
      fetchData();
    } catch (err) {
      console.error('Accept failed:', err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleComplete(taskId) {
    setActionLoading(taskId);
    try {
      await matchingAPI.complete(taskId);
      fetchData();
    } catch (err) {
      console.error('Complete failed:', err);
    } finally {
      setActionLoading(null);
    }
  }

  // Calculate streak (consecutive completed tasks)
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const activeTasks = tasks.filter(t => !['completed', 'cancelled'].includes(t.status));

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
        <h1 className="text-2xl font-display font-bold">My Tasks</h1>
        <p className="text-sm text-surface-200/50 mt-1">View and manage your assigned tasks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-display font-bold gradient-text">{completedTasks}</p>
          <p className="text-xs text-surface-200/40 mt-1">Tasks Completed</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-display font-bold text-warning-400">{activeTasks.length}</p>
          <p className="text-xs text-surface-200/40 mt-1">Active Tasks</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-display font-bold text-primary-400">{Math.round(volProfile?.trust_score || 50)}</p>
          <p className="text-xs text-surface-200/40 mt-1">Trust Score</p>
          <div className="w-full h-1.5 bg-surface-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full" style={{ width: `${volProfile?.trust_score || 50}%` }} />
          </div>
        </div>
      </div>

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Active Tasks</h2>
          <div className="space-y-4">
            {activeTasks.map((task) => (
              <div key={task.id} className="glass-card p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{task.need_title || task.title}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-surface-200/50">
                      <span className="capitalize">📂 {task.category}</span>
                      <span>📍 {task.area_name}</span>
                      <span>🔥 Urgency: {Math.round((task.urgency_score || 0) * 100)}%</span>
                    </div>
                    {task.deadline && (
                      <p className="text-xs text-warning-400 mt-2">
                        ⏰ Deadline: {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    )}
                    {task.notes && (
                      <p className="text-xs text-surface-200/40 mt-2 italic">{task.notes}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {task.status === 'assigned' && (
                      <button
                        onClick={() => handleAccept(task.id)}
                        disabled={actionLoading === task.id}
                        className="btn-success text-sm"
                      >
                        {actionLoading === task.id ? 'Accepting...' : '✅ Accept'}
                      </button>
                    )}
                    {(task.status === 'accepted' || task.status === 'in_progress') && (
                      <button
                        onClick={() => handleComplete(task.id)}
                        disabled={actionLoading === task.id}
                        className="btn-primary text-sm"
                      >
                        {actionLoading === task.id ? 'Completing...' : '🎉 Mark Complete'}
                      </button>
                    )}
                    {task.location_lat && task.location_lng && (
                      <a
                        href={`https://www.google.com/maps?q=${task.location_lat},${task.location_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm"
                      >
                        📍 Map
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <TaskTimeline status={task.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Completed Tasks</h2>
          <div className="space-y-2">
            {tasks.filter(t => t.status === 'completed').map((task) => (
              <div key={task.id} className="glass-card p-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{task.need_title}</p>
                    <p className="text-xs text-surface-200/40">
                      {task.area_name} • Completed {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span className="badge-low">✅ Done</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🌟</p>
          <h3 className="text-lg font-semibold text-surface-200/70">No tasks yet</h3>
          <p className="text-sm text-surface-200/40 mt-1">You'll be notified when you're matched to a community need</p>
        </div>
      )}
    </div>
  );
}
