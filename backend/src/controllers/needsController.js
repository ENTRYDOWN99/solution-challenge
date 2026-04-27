const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('../config/database');
const redis = require('../config/redis');
const { computeUrgencyScore, paginationParams } = require('../utils/helpers');
const axios = require('axios');
const config = require('../config');

/**
 * Create a new need with auto-computed urgency score
 */
async function createNeed(req, res, next) {
  try {
    const {
      title, description, category, location_lat, location_lng,
      area_name, severity, num_people_affected, time_sensitive,
      vulnerability_score, source_org
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }

    // Compute urgency score
    const urgency_score = computeUrgencyScore({
      severity: severity || 1,
      num_people_affected: num_people_affected || 1,
      time_sensitive: time_sensitive || false,
      vulnerability_score: vulnerability_score || 0,
    });

    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO needs (id, title, description, category, location_lat, location_lng,
        area_name, urgency_score, severity, num_people_affected, time_sensitive,
        vulnerability_score, status, source_org, reported_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'open',$13,$14)
       RETURNING *`,
      [id, title, description, category, location_lat, location_lng,
       area_name, urgency_score, severity || 1, num_people_affected || 1,
       time_sensitive || false, vulnerability_score || 0, source_org || null,
       req.user ? req.user.id : null]
    );

    // Invalidate cache
    await redis.del('needs:all');
    await redis.del('analytics:summary');

    const need = result.rows[0];

    // If urgency > 0.85, trigger real-time matching
    if (urgency_score > 0.85) {
      try {
        await axios.post(`http://localhost:${config.port}/api/matching/run`, 
          { need_id: id },
          { headers: { Authorization: req.headers.authorization } }
        );
      } catch (err) {
        console.warn('Auto-matching trigger failed:', err.message);
      }
    }

    res.status(201).json(need);
  } catch (err) {
    next(err);
  }
}

/**
 * List all needs with filters and pagination
 */
async function listNeeds(req, res, next) {
  try {
    const { page, limit, offset } = paginationParams(req.query);
    const { status, category, urgency_min, area, date_from, date_to, search } = req.query;

    let conditions = ['n.deleted_at IS NULL'];
    let params = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`n.status = $${paramIdx++}`);
      params.push(status);
    }
    if (category) {
      conditions.push(`n.category = $${paramIdx++}`);
      params.push(category);
    }
    if (urgency_min) {
      conditions.push(`n.urgency_score >= $${paramIdx++}`);
      params.push(parseFloat(urgency_min));
    }
    if (area) {
      conditions.push(`n.area_name LIKE $${paramIdx++}`);
      params.push(`%${area}%`);
    }
    if (date_from) {
      conditions.push(`n.created_at >= $${paramIdx++}`);
      params.push(new Date(date_from).toISOString());
    }
    if (date_to) {
      conditions.push(`n.created_at <= $${paramIdx++}`);
      params.push(new Date(date_to).toISOString());
    }
    if (search) {
      conditions.push(`(n.title LIKE $${paramIdx} OR n.description LIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM needs n ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count || countResult.rows[0]['COUNT(*)'] || 0);

    // Fetch with pagination
    const result = await db.query(
      `SELECT n.*, u.name as reporter_name
       FROM needs n
       LEFT JOIN users u ON n.reported_by = u.id
       ${whereClause}
       ORDER BY n.urgency_score DESC, n.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single need with assigned volunteer info
 * Uses separate queries instead of json_agg (not available in SQLite)
 */
async function getNeed(req, res, next) {
  try {
    const { id } = req.params;

    // Get the need
    const needResult = await db.query(
      `SELECT n.*, u.name as reporter_name
       FROM needs n
       LEFT JOIN users u ON n.reported_by = u.id
       WHERE n.id = $1 AND n.deleted_at IS NULL`,
      [id]
    );

    if (needResult.rows.length === 0) {
      return res.status(404).json({ error: 'Need not found' });
    }

    const need = needResult.rows[0];

    // Get assignments separately
    const assignmentsResult = await db.query(
      `SELECT t.id as task_id, vu.name as volunteer_name, v.id as volunteer_id,
              t.status as task_status, t.assigned_at, t.completed_at
       FROM tasks t
       JOIN volunteers v ON t.volunteer_id = v.id
       JOIN users vu ON v.user_id = vu.id
       WHERE t.need_id = $1`,
      [id]
    );

    need.assignments = assignmentsResult.rows.length > 0 ? assignmentsResult.rows : null;

    res.json(need);
  } catch (err) {
    next(err);
  }
}

/**
 * Update need
 */
async function updateNeed(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Recalculate urgency if relevant fields changed
    if (updates.severity || updates.num_people_affected || updates.time_sensitive !== undefined || updates.vulnerability_score) {
      const current = await db.query('SELECT * FROM needs WHERE id = $1', [id]);
      if (current.rows.length > 0) {
        const merged = { ...current.rows[0], ...updates };
        updates.urgency_score = computeUrgencyScore(merged);
      }
    }

    // Handle status = resolved
    if (updates.status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    const result = await db.query(
      `UPDATE needs SET ${setClause} WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Need not found' });
    }

    await redis.del('needs:all');
    await redis.del('analytics:summary');

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * Soft delete need
 */
async function deleteNeed(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE needs SET deleted_at = datetime('now') WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Need not found' });
    }

    await redis.del('needs:all');
    res.json({ message: 'Need deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * Bulk upload via OCR
 */
async function bulkUpload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imagePath = req.file.path;

    // Run Tesseract OCR
    let ocrText = '';
    try {
      const Tesseract = require('tesseract.js');
      const { data } = await Tesseract.recognize(imagePath, 'eng');
      ocrText = data.text;
    } catch (err) {
      console.error('OCR failed:', err.message);
      return res.status(500).json({ error: 'OCR processing failed' });
    }

    // Call NLP service for extraction
    let extracted = [];
    try {
      const nlpResponse = await axios.post(`${config.nlp.serviceUrl}/extract`, {
        text: ocrText,
      });
      extracted = Array.isArray(nlpResponse.data) ? nlpResponse.data : [nlpResponse.data];
    } catch (err) {
      console.warn('NLP service not available, using regex fallback');
      extracted = regexExtract(ocrText);
    }

    // Create need records from extracted data
    const created = [];
    for (const item of extracted) {
      const urgency_score = computeUrgencyScore({
        severity: item.severity || 3,
        num_people_affected: item.num_people || 10,
        time_sensitive: item.time_sensitive || false,
        vulnerability_score: 5,
      });

      const result = await db.query(
        `INSERT INTO needs (id, title, description, category, area_name, urgency_score,
          severity, num_people_affected, time_sensitive, status, reported_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10)
         RETURNING *`,
        [
          uuidv4(),
          item.title || `${item.category || 'other'} need in ${item.location || 'Unknown'}`,
          item.description || ocrText.substring(0, 500),
          item.category || 'other',
          item.location || 'Unknown',
          urgency_score,
          item.severity || 3,
          item.num_people || 10,
          item.time_sensitive || false,
          req.user ? req.user.id : null,
        ]
      );
      created.push(result.rows[0]);
    }

    await redis.del('needs:all');

    res.status(201).json({
      message: `${created.length} needs created from OCR`,
      ocr_text: ocrText,
      extracted,
      needs: created,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Regex fallback for text extraction when NLP service is unavailable
 */
function regexExtract(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const categories = ['education', 'medical', 'water', 'food', 'shelter', 'plumbing'];
  const results = [];

  // Try to extract structured data from text
  let current = { category: 'other', severity: 3, time_sensitive: false };

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detect category
    for (const cat of categories) {
      if (lower.includes(cat)) {
        current.category = cat;
        break;
      }
    }

    // Detect number of people
    const peopleMatch = lower.match(/(\d+)\s*(people|persons|families|individuals|affected)/);
    if (peopleMatch) {
      current.num_people = parseInt(peopleMatch[1]);
    }

    // Detect urgency
    if (lower.match(/(urgent|emergency|critical|immediate|asap|no water|no food)/)) {
      current.time_sensitive = true;
      current.severity = Math.max(current.severity, 4);
    }

    // Detect location
    const locationMatch = line.match(/(?:location|area|village|town|district)[\s:]+(.+)/i);
    if (locationMatch) {
      current.location = locationMatch[1].trim();
    }
  }

  current.title = `${current.category} need` + (current.location ? ` in ${current.location}` : '');
  current.description = text;
  results.push(current);

  return results;
}

/**
 * Get heatmap data
 */
async function getHeatmap(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, title, category, location_lat, location_lng, urgency_score, 
              num_people_affected, area_name, status
       FROM needs
       WHERE status IN ('open', 'assigned', 'in_progress')
         AND deleted_at IS NULL
         AND location_lat IS NOT NULL
         AND location_lng IS NOT NULL`
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createNeed, listNeeds, getNeed, updateNeed, deleteNeed,
  bulkUpload, getHeatmap,
};
