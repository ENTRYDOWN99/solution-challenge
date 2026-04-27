const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { paginationParams } = require('../utils/helpers');

/**
 * Create or update volunteer profile
 */
async function createOrUpdateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      skills, home_lat, home_lng, max_radius_km,
      availability, languages
    } = req.body;

    // Check if profile exists
    const existing = await db.query(
      'SELECT id FROM volunteers WHERE user_id = $1',
      [userId]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update
      result = await db.query(
        `UPDATE volunteers SET
          skills = COALESCE($2, skills),
          home_lat = COALESCE($3, home_lat),
          home_lng = COALESCE($4, home_lng),
          max_radius_km = COALESCE($5, max_radius_km),
          availability = COALESCE($6, availability),
          languages = COALESCE($7, languages)
         WHERE user_id = $1
         RETURNING *`,
        [userId, skills ? JSON.stringify(skills) : null, home_lat, home_lng, max_radius_km, 
         availability ? JSON.stringify(availability) : null, 
         languages ? JSON.stringify(languages) : null]
      );
    } else {
      // Create
      result = await db.query(
        `INSERT INTO volunteers (id, user_id, skills, home_lat, home_lng, max_radius_km, availability, languages)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [uuidv4(), userId, JSON.stringify(skills || []), home_lat, home_lng,
         max_radius_km || 25, JSON.stringify(availability || {}), JSON.stringify(languages || ['English'])]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * List all volunteers with filters
 */
async function listVolunteers(req, res, next) {
  try {
    const { page, limit, offset } = paginationParams(req.query);
    const { skill, available, search, min_trust } = req.query;

    let conditions = [];
    let params = [];
    let paramIdx = 1;

    // SQLite: skills stored as JSON array string, use LIKE instead of ANY()
    if (skill) {
      conditions.push(`v.skills LIKE $${paramIdx++}`);
      params.push(`%"${skill}"%`);
    }
    if (min_trust) {
      conditions.push(`v.trust_score >= $${paramIdx++}`);
      params.push(parseFloat(min_trust));
    }
    if (search) {
      conditions.push(`(u.name LIKE $${paramIdx} OR u.email LIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM volunteers v JOIN users u ON v.user_id = u.id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count || countResult.rows[0]['COUNT(*)'] || 0);

    const result = await db.query(
      `SELECT v.*, u.name, u.email, u.phone
       FROM volunteers v
       JOIN users u ON v.user_id = u.id
       ${whereClause}
       ORDER BY v.trust_score DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single volunteer profile
 */
async function getVolunteer(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT v.*, u.name, u.email, u.phone
       FROM volunteers v
       JOIN users u ON v.user_id = u.id
       WHERE v.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * Update availability schedule
 */
async function updateAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const { availability } = req.body;

    if (!availability) {
      return res.status(400).json({ error: 'Availability data is required' });
    }

    const result = await db.query(
      `UPDATE volunteers SET availability = $2 WHERE id = $1 RETURNING *`,
      [id, JSON.stringify(availability)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * Get volunteer task history
 */
async function getTaskHistory(req, res, next) {
  try {
    const { id } = req.params;
    const { page, limit, offset } = paginationParams(req.query);

    const result = await db.query(
      `SELECT t.*, n.title as need_title, n.category, n.area_name, n.urgency_score
       FROM tasks t
       JOIN needs n ON t.need_id = n.id
       WHERE t.volunteer_id = $1
       ORDER BY t.assigned_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM tasks WHERE volunteer_id = $1',
      [id]
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total: parseInt(countResult.rows[0].count || 0) },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrUpdateProfile, listVolunteers, getVolunteer,
  updateAvailability, getTaskHistory,
};
