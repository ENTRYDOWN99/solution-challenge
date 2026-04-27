const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../config/database');

/**
 * Create NGO organization
 */
async function createOrg(req, res, next) {
  try {
    const { name, type, contact_email } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    const api_key = `cap_${crypto.randomBytes(32).toString('hex')}`;

    const result = await db.query(
      `INSERT INTO organizations (id, name, type, contact_email, api_key)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuidv4(), name, type || 'ngo', contact_email || null, api_key]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * Get all needs from an organization
 */
async function getOrgNeeds(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT n.* FROM needs n
       WHERE n.organization_id = $1 AND n.deleted_at IS NULL
       ORDER BY n.created_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Webhook to accept incoming need data from external NGO systems
 */
async function webhook(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required in x-api-key header' });
    }

    // Validate API key
    const orgResult = await db.query(
      'SELECT id, name FROM organizations WHERE api_key = $1',
      [apiKey]
    );

    if (orgResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const org = orgResult.rows[0];
    const needs = Array.isArray(req.body) ? req.body : [req.body];
    const created = [];

    for (const need of needs) {
      const { computeUrgencyScore } = require('../utils/helpers');
      const urgency_score = computeUrgencyScore({
        severity: need.severity || 3,
        num_people_affected: need.num_people_affected || 1,
        time_sensitive: need.time_sensitive || false,
        vulnerability_score: need.vulnerability_score || 0,
      });

      const result = await db.query(
        `INSERT INTO needs (id, title, description, category, location_lat, location_lng,
          area_name, urgency_score, severity, num_people_affected, time_sensitive,
          vulnerability_score, status, source_org, organization_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'open',$13,$14)
         RETURNING *`,
        [
          uuidv4(),
          need.title || 'External Need Report',
          need.description || '',
          need.category || 'other',
          need.location_lat || null,
          need.location_lng || null,
          need.area_name || null,
          urgency_score,
          need.severity || 3,
          need.num_people_affected || 1,
          need.time_sensitive || false,
          need.vulnerability_score || 0,
          org.name,
          org.id,
        ]
      );
      created.push(result.rows[0]);
    }

    res.status(201).json({
      message: `${created.length} needs created from webhook`,
      organization: org.name,
      needs: created,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get organization details
 */
async function getOrg(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM organizations WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * List organizations
 */
async function listOrgs(req, res, next) {
  try {
    const result = await db.query(
      'SELECT id, name, type, contact_email, created_at FROM organizations ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Regenerate API key
 */
async function regenerateApiKey(req, res, next) {
  try {
    const { id } = req.params;
    const newKey = `cap_${crypto.randomBytes(32).toString('hex')}`;

    const result = await db.query(
      'UPDATE organizations SET api_key = $2 WHERE id = $1 RETURNING *',
      [id, newKey]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrg, getOrgNeeds, webhook, getOrg, listOrgs, regenerateApiKey };
