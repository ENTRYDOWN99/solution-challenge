export default function StatsCard({ icon, label, value, trend, trendUp, color = 'primary' }) {
  const colorMap = {
    primary: 'from-primary-500/20 to-primary-600/10 border-primary-500/20',
    success: 'from-success-500/20 to-success-600/10 border-success-500/20',
    warning: 'from-warning-500/20 to-warning-600/10 border-warning-500/20',
    danger: 'from-danger-500/20 to-danger-600/10 border-danger-500/20',
    accent: 'from-accent-500/20 to-accent-600/10 border-accent-500/20',
  };

  const iconColorMap = {
    primary: 'from-primary-500 to-primary-600',
    success: 'from-success-500 to-success-600',
    warning: 'from-warning-500 to-warning-600',
    danger: 'from-danger-500 to-danger-600',
    accent: 'from-accent-500 to-accent-600',
  };

  return (
    <div className={`glass-card-hover p-5 bg-gradient-to-br ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${iconColorMap[color]} flex items-center justify-center text-xl shadow-lg`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${trendUp ? 'text-success-400' : 'text-danger-400'}`}>
            {trendUp ? '↑' : '↓'} {trend}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-display font-bold">{value ?? '—'}</p>
        <p className="text-xs text-surface-200/50 mt-1">{label}</p>
      </div>
    </div>
  );
}
