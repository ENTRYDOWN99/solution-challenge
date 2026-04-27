const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const redis = require('../config/redis');
const axios = require('axios');
const config = require('../config');
const { computeMatchScore } = require('../utils/helpers');
const { sendTaskAssignmentEmail, sendTaskCompletionEmail } = require('../services/emailService');
const { sendTaskAssignmentSMS } = require('../services/smsService');

/**
 * Run matching engine for all open needs
 */
async function runMatching(req, res, next) {
  try {
    const { need_id } = req.body || {};

    // Get open needs
    let needsQuery = `SELECT * FROM needs WHERE status = 'open' AND deleted_at IS NULL`;
    const needsParams = [];
    if (need_id) {
      needsQuery += ' AND id = $1';
      needsParams.push(need_id);
    }
    needsQuery += ' ORDER BY urgency_score DESC';

    const needsResult = await db.query(needsQuery, needsParams);
    const needs = needsResult.rows;

    // Get all active volunteers
    const volunteersResult = await db.query(
      `SELECT v.*, u.name, u.email, u.phone
       FROM volunteers v
       JOIN users u ON v.user_id = u.id
       WHERE v.active_task_count < 5`
    );
    const volunteers = volunteersResult.rows;

    let totalMatches = 0;

    for (const need of needs) {
      // Try NLP service first, fall back to local computation
      let matches = [];
      try {
        const nlpMatches = await Promise.all(
          volunteers.map(async (vol) => {
            try {
              const response = await axios.post(`${config.nlp.serviceUrl}/match-score`, {
                need: {
                  category: need.category,
                  location_lat: need.location_lat,
                  location_lng: need.location_lng,
                  created_at: need.created_at,
                },
                volunteer: {
                  skills: typeof vol.skills === 'string' ? JSON.parse(vol.skills) : (vol.skills || []),
                  home_lat: vol.home_lat,
                  home_lng: vol.home_lng,
                  max_radius_km: vol.max_radius_km,
                  availability: typeof vol.availability === 'string' ? JSON.parse(vol.availability) : (vol.availability || {}),
                  trust_score: vol.trust_score,
                },
              }, { timeout: 2000 });
              return {
                volunteer: vol,
                score: response.data.match_score,
                distance_km: response.data.distance_km,
              };
            } catch {
              // Fallback to local computation
              const result = computeMatchScore(need, vol);
              return { volunteer: vol, score: result.score, distance_km: result.distance_km };
            }
          })
        );
        matches = nlpMatches;
      } catch {
        // Full fallback to local computation
        matches = volunteers.map((vol) => {
          const result = computeMatchScore(need, vol);
          return { volunteer: vol, score: result.score, distance_km: result.distance_km };
        });
      }

      // Filter and sort
      matches = matches
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // Store matches in DB (use INSERT OR IGNORE for SQLite)
      for (const match of matches) {
        try {
          await db.query(
            `INSERT OR IGNORE INTO matches (id, need_id, volunteer_id, match_score, distance_km, accepted)
             VALUES ($1, $2, $3, $4, $5, 0)`,
            [uuidv4(), need.id, match.volunteer.id, match.score, match.distance_km]
          );
          totalMatches++;
        } catch (err) {
          // Skip duplicates
          if (!err.message?.includes('UNIQUE')) {
            console.warn('Match insert error:', err.message);
          }
        }
      }
    }

    // Cache results
    await redis.setex('matching:lastRun', 300, JSON.stringify({
      timestamp: new Date(),
      needsProcessed: needs.length,
      matchesGenerated: totalMatches,
    }));

    res.json({
      message: 'Matching completed',
      needsProcessed: needs.length,
      matchesGenerated: totalMatches,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get top 5 volunteer matches for a need
 */
async function getSuggestions(req, res, next) {
  try {
    const { need_id } = req.params;

    // First check if we have stored matches
    let result = await db.query(
      `SELECT m.*, v.skills, v.trust_score, v.active_task_count,
              v.home_lat, v.home_lng, v.availability, v.languages,
              u.name, u.email, u.phone
       FROM matches m
       JOIN volunteers v ON m.volunteer_id = v.id
       JOIN users u ON v.user_id = u.id
       WHERE m.need_id = $1
       ORDER BY m.match_score DESC
       LIMIT 5`,
      [need_id]
    );

    // If no stored matches, compute on the fly
    if (result.rows.length === 0) {
      const needResult = await db.query('SELECT * FROM needs WHERE id = $1', [need_id]);
      if (needResult.rows.length === 0) {
        return res.status(404).json({ error: 'Need not found' });
      }
      const need = needResult.rows[0];

      const volunteersResult = await db.query(
        `SELECT v.*, u.name, u.email, u.phone
         FROM volunteers v JOIN users u ON v.user_id = u.id
         WHERE v.active_task_count < 5`
      );

      const matches = volunteersResult.rows
        .map((vol) => {
          const { score, distance_km } = computeMatchScore(need, vol);
          return { ...vol, match_score: score, distance_km };
        })
        .filter((m) => m.match_score > 0)
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 5);

      return res.json(matches);
    }

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Assign volunteer to need
 */
async function assignVolunteer(req, res, next) {
  try {
    const { need_id, volunteer_id, deadline, notes } = req.body;

    if (!need_id || !volunteer_id) {
      return res.status(400).json({ error: 'need_id and volunteer_id are required' });
    }

    // Verify need exists and is open
    const needResult = await db.query(
      "SELECT * FROM needs WHERE id = $1 AND status = 'open' AND deleted_at IS NULL",
      [need_id]
    );
    if (needResult.rows.length === 0) {
      return res.status(404).json({ error: 'Need not found or not open' });
    }

    // Verify volunteer exists
    const volResult = await db.query(
      `SELECT v.*, u.name, u.email, u.phone
       FROM volunteers v JOIN users u ON v.user_id = u.id
       WHERE v.id = $1`,
      [volunteer_id]
    );
    if (volResult.rows.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    const need = needResult.rows[0];
    const volunteer = volResult.rows[0];

    // Create task
    const taskId = uuidv4();
    const taskResult = await db.query(
      `INSERT INTO tasks (id, need_id, volunteer_id, status, deadline, notes)
       VALUES ($1, $2, $3, 'assigned', $4, $5)
       RETURNING *`,
      [taskId, need_id, volunteer_id, deadline || null, notes || null]
    );

    // Update need status
    await db.query("UPDATE needs SET status = 'assigned' WHERE id = $1", [need_id]);

    // Update volunteer active task count
    await db.query(
      'UPDATE volunteers SET active_task_count = active_task_count + 1 WHERE id = $1',
      [volunteer_id]
    );

    // Update match as accepted
    await db.query(
      'UPDATE matches SET accepted = 1 WHERE need_id = $1 AND volunteer_id = $2',
      [need_id, volunteer_id]
    );

    // Create notification
    await db.query(
      `INSERT INTO notifications (id, user_id, type, title, message, metadata)
       VALUES ($1, $2, 'task_assigned', $3, $4, $5)`,
      [
        uuidv4(), volunteer.user_id,
        `New Assignment: ${need.category} in ${need.area_name}`,
        `You have been assigned to help with a ${need.category} need affecting ${need.num_people_affected} people.`,
        JSON.stringify({ task_id: taskId, need_id }),
      ]
    );

    // Send notifications (non-blocking)
    sendTaskAssignmentEmail(volunteer, need, taskResult.rows[0]).catch(console.error);
    sendTaskAssignmentSMS(volunteer, need, taskResult.rows[0]).catch(console.error);

    await redis.del('analytics:summary');

    res.status(201).json({
      message: 'Volunteer assigned successfully',
      task: taskResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Volunteer accepts task
 */
async function acceptTask(req, res, next) {
  try {
    const { task_id } = req.params;

    const result = await db.query(
      `UPDATE tasks SET status = 'accepted', accepted_at = datetime('now')
       WHERE id = $1 AND status = 'assigned'
       RETURNING *`,
      [task_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or not in assigned status' });
    }

    // Update need status
    await db.query("UPDATE needs SET status = 'in_progress' WHERE id = $1", [result.rows[0].need_id]);

    res.json({ message: 'Task accepted', task: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * Complete task
 */
async function completeTask(req, res, next) {
  try {
    const { task_id } = req.params;

    const taskResult = await db.query(
      `UPDATE tasks SET status = 'completed', completed_at = datetime('now')
       WHERE id = $1 AND status IN ('accepted', 'in_progress')
       RETURNING *`,
      [task_id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or not in acceptable status' });
    }

    const task = taskResult.rows[0];

    // Update need status
    await db.query(
      "UPDATE needs SET status = 'resolved', resolved_at = datetime('now') WHERE id = $1",
      [task.need_id]
    );

    // Update volunteer: decrease active tasks, increase trust score
    await db.query(
      `UPDATE volunteers SET
        active_task_count = MAX(0, active_task_count - 1),
        trust_score = MIN(100, trust_score + 2)
       WHERE id = $1`,
      [task.volunteer_id]
    );

    // Notify NGO admin
    const needResult = await db.query(
      `SELECT n.*, u.email as admin_email FROM needs n
       LEFT JOIN users u ON n.reported_by = u.id
       WHERE n.id = $1`,
      [task.need_id]
    );

    const volResult = await db.query(
      `SELECT u.name, u.email FROM volunteers v
       JOIN users u ON v.user_id = u.id WHERE v.id = $1`,
      [task.volunteer_id]
    );

    if (needResult.rows[0]?.admin_email && volResult.rows[0]) {
      sendTaskCompletionEmail(
        needResult.rows[0].admin_email,
        volResult.rows[0],
        needResult.rows[0]
      ).catch(console.error);
    }

    await redis.del('analytics:summary');

    res.json({ message: 'Task completed', task: taskResult.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  runMatching, getSuggestions, assignVolunteer,
  acceptTask, completeTask,
};
