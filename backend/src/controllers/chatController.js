const axios = require('axios');
const db = require('../config/database');
const config = require('../config');

/**
 * POST /api/chat
 * Proxies the authenticated user's message to the NLP service Gemini chatbot.
 * Enriches the request with live platform context (open needs count, user role).
 */
async function chatWithGemini(req, res, next) {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Fetch live open-needs count for context (best-effort — defaults to 0 on error)
    let openNeedsCount = 0;
    try {
      const result = await db.query(
        "SELECT COUNT(*) as count FROM needs WHERE status = 'open' AND deleted_at IS NULL"
      );
      openNeedsCount = parseInt(result.rows[0].count) || 0;
    } catch (_dbErr) {
      // Non-fatal — continue without the count
    }

    const nlpUrl = `${config.nlp.serviceUrl}/chat`;

    const nlpResponse = await axios.post(
      nlpUrl,
      {
        user_id: req.user.userId,
        message: message.trim(),
        context: {
          open_needs_count: openNeedsCount,
          role: req.user.role || 'volunteer',
        },
      },
      { timeout: 15000 }
    );

    return res.json(nlpResponse.data);
  } catch (err) {
    // Surface NLP-service error messages cleanly; fall through for unexpected errors
    if (err.response) {
      const status = err.response.status || 502;
      const body = err.response.data || {};
      return res.status(status).json(body);
    }
    next(err);
  }
}

module.exports = { chatWithGemini };
