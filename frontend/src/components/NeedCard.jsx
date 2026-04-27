import UrgencyBadge from './UrgencyBadge';

const categoryIcons = {
  education: '📚',
  medical: '🏥',
  water: '💧',
  food: '🍚',
  shelter: '🏠',
  plumbing: '🔧',
  other: '📋',
};

const statusColors = {
  open: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
  assigned: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
  in_progress: 'bg-accent-500/20 text-accent-400 border-accent-500/30',
  resolved: 'bg-success-500/20 text-success-400 border-success-500/30',
};

export default function NeedCard({ need, onClick }) {
  return (
    <div
      onClick={() => onClick?.(need)}
      className="glass-card-hover p-5 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{categoryIcons[need.category] || '📋'}</span>
          <span className={`badge border ${statusColors[need.status]}`}>
            {need.status?.replace('_', ' ')}
          </span>
        </div>
        <UrgencyBadge score={need.urgency_score} />
      </div>

      <h3 className="font-semibold text-sm mb-1 group-hover:text-primary-400 transition-colors line-clamp-2">
        {need.title}
      </h3>

      <p className="text-xs text-surface-200/40 mb-3 line-clamp-2">{need.description}</p>

      <div className="flex flex-wrap items-center gap-3 text-xs text-surface-200/50">
        {need.area_name && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {need.area_name}
          </span>
        )}
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {need.num_people_affected} affected
        </span>
        {need.created_at && (
          <span className="ml-auto text-surface-200/30">
            {new Date(need.created_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
