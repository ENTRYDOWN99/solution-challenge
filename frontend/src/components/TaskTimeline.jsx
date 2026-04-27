const steps = [
  { key: 'assigned', label: 'Assigned', icon: '📋' },
  { key: 'accepted', label: 'Accepted', icon: '✅' },
  { key: 'in_progress', label: 'In Progress', icon: '🔄' },
  { key: 'completed', label: 'Completed', icon: '🎉' },
];

const statusOrder = { assigned: 0, accepted: 1, in_progress: 2, completed: 3, cancelled: -1 };

export default function TaskTimeline({ status }) {
  const currentIdx = statusOrder[status] ?? 0;

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-danger-400 text-sm">
        <span>❌</span>
        <span className="font-medium">Task Cancelled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => {
        const isCompleted = i <= currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-all duration-300 ${
                isCompleted
                  ? isCurrent
                    ? 'bg-primary-500 shadow-lg shadow-primary-500/30 scale-110'
                    : 'bg-success-600'
                  : 'bg-surface-800 border border-white/10'
              }`}>
                {step.icon}
              </div>
              <span className={`text-[10px] mt-1.5 font-medium ${
                isCompleted ? 'text-surface-200' : 'text-surface-200/30'
              }`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-300 ${
                i < currentIdx ? 'bg-success-500' : 'bg-surface-800'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
