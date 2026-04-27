const db = require('../config/database');
const redis = require('../config/redis');

/**
 * Dashboard summary statistics
 */
async function getSummary(req, res, next) {
  try {
    // Check cache
    const cached = await redis.get('analytics:summary');
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const [totalNeeds, resolvedNeeds, activeVolunteers, avgMatchTime] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM needs WHERE deleted_at IS NULL'),
      db.query("SELECT COUNT(*) as count FROM needs WHERE status = 'resolved' AND deleted_at IS NULL"),
      db.query('SELECT COUNT(*) as count FROM volunteers WHERE active_task_count > 0'),
      db.query(`
        SELECT AVG((julianday(t.accepted_at) - julianday(t.assigned_at)) * 24) as avg_hours
        FROM tasks t WHERE t.accepted_at IS NOT NULL
      `),
    ]);

    // Resolved this week
    const resolvedThisWeek = await db.query(
      `SELECT COUNT(*) as count FROM needs
       WHERE status = 'resolved' AND resolved_at >= datetime('now', '-7 days') AND deleted_at IS NULL`
    );

    // Total volunteers
    const totalVolunteers = await db.query('SELECT COUNT(*) as count FROM volunteers');

    // Open needs
    const openNeeds = await db.query(
      "SELECT COUNT(*) as count FROM needs WHERE status = 'open' AND deleted_at IS NULL"
    );

    // Volunteer utilization
    const totalVol = parseInt(totalVolunteers.rows[0].count) || 1;
    const activeVol = parseInt(activeVolunteers.rows[0].count);
    const utilization = Math.round((activeVol / totalVol) * 100);

    const summary = {
      totalNeeds: parseInt(totalNeeds.rows[0].count),
      openNeeds: parseInt(openNeeds.rows[0].count),
      resolvedNeeds: parseInt(resolvedNeeds.rows[0].count),
      resolvedThisWeek: parseInt(resolvedThisWeek.rows[0].count),
      resolvedPercentage: totalNeeds.rows[0].count > 0
        ? Math.round((parseInt(resolvedNeeds.rows[0].count) / parseInt(totalNeeds.rows[0].count)) * 100)
        : 0,
      totalVolunteers: totalVol,
      activeVolunteers: activeVol,
      volunteerUtilization: utilization,
      avgMatchTimeHours: avgMatchTime.rows[0].avg_hours
        ? Math.round(avgMatchTime.rows[0].avg_hours * 10) / 10
        : null,
    };

    // Cache for 5 min
    await redis.setex('analytics:summary', 300, JSON.stringify(summary));

    res.json(summary);
  } catch (err) {
    next(err);
  }
}

/**
 * Trends: needs created per day and resolution rate over last 30 days
 */
async function getTrends(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;

    const [created, resolved] = await Promise.all([
      db.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM needs
         WHERE created_at >= datetime('now', '-${days} days') AND deleted_at IS NULL
         GROUP BY DATE(created_at)
         ORDER BY date`
      ),
      db.query(
        `SELECT DATE(resolved_at) as date, COUNT(*) as count
         FROM needs
         WHERE resolved_at >= datetime('now', '-${days} days') AND deleted_at IS NULL
         GROUP BY DATE(resolved_at)
         ORDER BY date`
      ),
    ]);

    // Build a complete date range
    const dateMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dateMap[key] = { date: key, created: 0, resolved: 0 };
    }

    created.rows.forEach((r) => {
      const key = r.date ? r.date.split('T')[0] : null;
      if (key && dateMap[key]) dateMap[key].created = parseInt(r.count);
    });

    resolved.rows.forEach((r) => {
      const key = r.date ? r.date.split('T')[0] : null;
      if (key && dateMap[key]) dateMap[key].resolved = parseInt(r.count);
    });

    res.json(Object.values(dateMap));
  } catch (err) {
    next(err);
  }
}

/**
 * Coverage gaps: areas with high need density but low volunteer coverage
 */
async function getCoverageGaps(req, res, next) {
  try {
    // Get need density by area
    const needsByArea = await db.query(
      `SELECT area_name, COUNT(*) as need_count,
              AVG(urgency_score) as avg_urgency,
              AVG(location_lat) as center_lat,
              AVG(location_lng) as center_lng
       FROM needs
       WHERE status IN ('open', 'assigned') AND deleted_at IS NULL AND area_name IS NOT NULL
       GROUP BY area_name
       ORDER BY need_count DESC`
    );

    // Get all volunteers for distance calculation in JS
    const allVolunteers = await db.query(
      'SELECT home_lat, home_lng, max_radius_km FROM volunteers WHERE home_lat IS NOT NULL AND home_lng IS NOT NULL'
    );

    const { haversine } = require('../utils/helpers');

    const gaps = [];
    for (const area of needsByArea.rows) {
      if (!area.center_lat || !area.center_lng) continue;

      // Count volunteers within range using JS haversine
      let volCount = 0;
      for (const vol of allVolunteers.rows) {
        const dist = haversine(area.center_lat, area.center_lng, vol.home_lat, vol.home_lng);
        if (dist <= (vol.max_radius_km || 25)) {
          volCount++;
        }
      }

      const needCount = parseInt(area.need_count);
      const ratio = volCount > 0 ? needCount / volCount : needCount * 10;

      gaps.push({
        area_name: area.area_name,
        need_count: needCount,
        volunteer_count: volCount,
        avg_urgency: Math.round(parseFloat(area.avg_urgency) * 100) / 100,
        coverage_ratio: Math.round(ratio * 100) / 100,
        center_lat: parseFloat(area.center_lat),
        center_lng: parseFloat(area.center_lng),
        severity: ratio > 5 ? 'critical' : ratio > 2 ? 'high' : ratio > 1 ? 'medium' : 'low',
      });
    }

    // Sort by coverage ratio (worst gaps first)
    gaps.sort((a, b) => b.coverage_ratio - a.coverage_ratio);

    res.json(gaps);
  } catch (err) {
    next(err);
  }
}

/**
 * Top 5 most urgent open needs
 */
async function getTopNeeds(req, res, next) {
  try {
    const result = await db.query(
      `SELECT n.*, u.name as reporter_name
       FROM needs n
       LEFT JOIN users u ON n.reported_by = u.id
       WHERE n.status IN ('open', 'assigned') AND n.deleted_at IS NULL
       ORDER BY n.urgency_score DESC
       LIMIT 5`
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary, getTrends, getCoverageGaps, getTopNeeds };
