const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

export default function AvailabilityGrid({ availability = {}, editable = false, onChange }) {
  const isAvailable = (day, hour) => {
    const slots = availability[day];
    if (!slots || slots.length < 2) return false;
    return hour >= slots[0] && hour <= slots[1];
  };

  const toggleHour = (day, hour) => {
    if (!editable || !onChange) return;
    const slots = availability[day] || [];
    let newSlots;

    if (slots.length < 2) {
      newSlots = [hour, hour];
    } else if (hour >= slots[0] && hour <= slots[1]) {
      // Remove: shrink range
      if (hour === slots[0]) newSlots = [slots[0] + 1, slots[1]];
      else if (hour === slots[1]) newSlots = [slots[0], slots[1] - 1];
      else newSlots = slots; // can't split
      if (newSlots[0] > newSlots[1]) newSlots = [];
    } else {
      // Expand range
      newSlots = [Math.min(slots[0] || hour, hour), Math.max(slots[1] || hour, hour)];
    }

    onChange({ ...availability, [day]: newSlots.length > 0 ? newSlots : undefined });
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Header */}
        <div className="flex gap-0.5 mb-1">
          <div className="w-10 flex-shrink-0" />
          {hours.map((h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-surface-200/30">
              {h % 3 === 0 ? `${h}:00` : ''}
            </div>
          ))}
        </div>

        {/* Rows */}
        {dayKeys.map((day, i) => (
          <div key={day} className="flex gap-0.5 mb-0.5">
            <div className="w-10 flex-shrink-0 text-[10px] text-surface-200/50 flex items-center">
              {days[i]}
            </div>
            {hours.map((h) => (
              <div
                key={h}
                onClick={() => toggleHour(day, h)}
                className={`flex-1 h-5 rounded-sm transition-all duration-150 ${
                  isAvailable(day, h)
                    ? 'bg-primary-500/50 hover:bg-primary-500/70'
                    : 'bg-surface-800/50 hover:bg-surface-700/50'
                } ${editable ? 'cursor-pointer' : ''}`}
              />
            ))}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 text-[10px] text-surface-200/40">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-primary-500/50" /> Available
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-surface-800/50" /> Unavailable
          </span>
        </div>
      </div>
    </div>
  );
}
