export default function VolunteerCard({ volunteer, onClick }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  return (
    <div onClick={() => onClick?.(volunteer)} className="glass-card-hover p-5 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {volunteer.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-sm group-hover:text-primary-400 transition-colors">
              {volunteer.name}
            </h3>
            <p className="text-xs text-surface-200/40">{volunteer.email}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-primary-400">{Math.round(volunteer.trust_score)}</div>
          <div className="text-[10px] text-surface-200/40">Trust Score</div>
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(volunteer.skills || []).map((skill) => (
          <span key={skill} className="px-2 py-0.5 bg-primary-500/10 text-primary-400 rounded-md text-[10px] font-medium border border-primary-500/20 capitalize">
            {skill}
          </span>
        ))}
      </div>

      {/* Availability mini grid */}
      <div className="flex gap-1 mb-3">
        {dayKeys.map((day, i) => {
          const available = volunteer.availability?.[day];
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-surface-200/30">{days[i]}</span>
              <div className={`w-full h-1.5 rounded-full ${available ? 'bg-success-500/60' : 'bg-surface-700/50'}`} />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-surface-200/40">
        <span>{volunteer.active_task_count || 0} active tasks</span>
        <span>{volunteer.languages?.join(', ')}</span>
      </div>
    </div>
  );
}
