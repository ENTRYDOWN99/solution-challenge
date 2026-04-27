export default function UrgencyBadge({ score, size = 'sm' }) {
  let level, className;

  if (score >= 0.8) {
    level = 'Critical';
    className = 'badge-critical';
  } else if (score >= 0.6) {
    level = 'High';
    className = 'badge-high';
  } else if (score >= 0.4) {
    level = 'Medium';
    className = 'badge-medium';
  } else {
    level = 'Low';
    className = 'badge-low';
  }

  const sizeClasses = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`${className} ${sizeClasses}`}>
      {score >= 0.8 && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse-soft" />}
      {level} ({Math.round(score * 100)}%)
    </span>
  );
}
