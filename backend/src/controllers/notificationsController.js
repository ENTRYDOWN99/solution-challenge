const db = require('../config/database');

/**
 * Get notifications for current user
 */
async function getNotifications(req, res, next) {
  try {
    const result = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    const unreadCount = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = 0',
      [req.user.id]
    );

    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCount.rows[0].count || 0),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark notification as read
 */
async function markRead(req, res, next) {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE notifications SET read = 1 WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark all notifications as read
 */
async function markAllRead(req, res, next) {
  try {
    await db.query(
      'UPDATE notifications SET read = 1 WHERE user_id = $1 AND read = 0',
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getNotifications, markRead, markAllRead };
