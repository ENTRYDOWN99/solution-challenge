/**
 * Haversine formula to calculate distance between two lat/lng points
 * @returns distance in kilometers
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Compute urgency score for a need
 * Formula: severity×0.4 + num_people_norm×0.3 + time_sensitive×0.2 + vulnerability×0.1
 */
function computeUrgencyScore({ severity, num_people_affected, time_sensitive, vulnerability_score }) {
  const severityNorm = (severity || 1) / 5;
  const peopleFactor = Math.min((num_people_affected || 1) / 100, 1);
  const timeFactor = time_sensitive ? 1 : 0;
  const vulnFactor = Math.min((vulnerability_score || 0) / 10, 1);

  return severityNorm * 0.4 + peopleFactor * 0.3 + timeFactor * 0.2 + vulnFactor * 0.1;
}

/**
 * Parse a value that may be a JSON string or already an object/array
 */
function ensureParsed(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
}

/**
 * Compute match score between a need and volunteer
 */
function computeMatchScore(need, volunteer) {
  // Parse skills if they're a JSON string (SQLite stores arrays as strings)
  const skills = ensureParsed(volunteer.skills, []);

  // Skill match
  const skillMatch = skills.some(
    s => String(s).toLowerCase() === (need.category || '').toLowerCase()
  ) ? 1.0 : 0.0;

  // Distance score
  const distance = haversine(
    need.location_lat, need.location_lng,
    volunteer.home_lat, volunteer.home_lng
  );
  const maxRadius = volunteer.max_radius_km || 25;
  const distanceScore = Math.max(0, 1 - distance / maxRadius);

  // Hard filters
  if (skillMatch === 0 || distance > maxRadius) {
    return { score: 0, distance_km: distance };
  }

  // Availability overlap
  const availabilityScore = checkAvailabilityOverlap(need, volunteer);

  // Trust score normalized
  const trustScore = (volunteer.trust_score || 50) / 100;

  const score = skillMatch * 0.4 + distanceScore * 0.3 + availabilityScore * 0.2 + trustScore * 0.1;

  return { score: Math.round(score * 1000) / 1000, distance_km: Math.round(distance * 100) / 100 };
}

/**
 * Check availability overlap between need creation time and volunteer schedule
 */
function checkAvailabilityOverlap(need, volunteer) {
  const availability = ensureParsed(volunteer.availability, {});

  if (!availability || Object.keys(availability).length === 0) {
    return 0.5; // Default if no availability set
  }

  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const needDate = new Date(need.created_at || Date.now());
  const dayName = days[needDate.getDay()];
  const currentHour = needDate.getHours();

  const daySlots = availability[dayName];
  if (!daySlots || !Array.isArray(daySlots) || daySlots.length < 2) {
    return 0;
  }

  // Check if current hour falls within volunteer's available hours
  if (currentHour >= daySlots[0] && currentHour <= daySlots[1]) {
    return 1.0;
  }

  return 0.0;
}

/**
 * Paginate query results
 */
function paginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = {
  haversine,
  computeUrgencyScore,
  computeMatchScore,
  checkAvailabilityOverlap,
  paginationParams,
};
