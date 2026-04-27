export default function MatchScoreBar({ score, label, showPercentage = true }) {
  const percentage = Math.round((score || 0) * 100);

  let barColor = 'from-danger-500 to-danger-400';
  if (percentage >= 80) barColor = 'from-success-500 to-success-400';
  else if (percentage >= 60) barColor = 'from-primary-500 to-primary-400';
  else if (percentage >= 40) barColor = 'from-warning-500 to-warning-400';
  else if (percentage >= 20) barColor = 'from-orange-500 to-orange-400';

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-surface-200/60">{label}</span>
          {showPercentage && <span className="text-xs font-semibold">{percentage}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
