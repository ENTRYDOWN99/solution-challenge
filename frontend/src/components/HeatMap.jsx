import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import UrgencyBadge from './UrgencyBadge';

function getColor(urgency) {
  if (urgency >= 0.8) return '#ef4444';
  if (urgency >= 0.6) return '#f97316';
  if (urgency >= 0.4) return '#eab308';
  return '#22c55e';
}

export default function HeatMap({ data = [], center = [19.076, 72.877], zoom = 11 }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-surface-900 rounded-2xl flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full rounded-2xl"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {data.map((need) => (
        need.location_lat && need.location_lng && (
          <CircleMarker
            key={need.id}
            center={[need.location_lat, need.location_lng]}
            radius={Math.max(8, (need.urgency_score || 0.5) * 20)}
            pathOptions={{
              color: getColor(need.urgency_score),
              fillColor: getColor(need.urgency_score),
              fillOpacity: 0.4,
              weight: 2,
            }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <h4 className="font-semibold text-sm mb-1">{need.title}</h4>
                <p className="text-xs opacity-70 capitalize">{need.category}</p>
                <p className="text-xs opacity-70">{need.area_name}</p>
                <p className="text-xs mt-1">{need.num_people_affected} people affected</p>
                <p className="text-xs mt-1">Urgency: {Math.round(need.urgency_score * 100)}%</p>
              </div>
            </Popup>
          </CircleMarker>
        )
      ))}
    </MapContainer>
  );
}
