const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/audit', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ запрещён' });
  }

  const result = await pool.query(`
    SELECT
      sc.id,
      sc.changed_at,
      sc.action_type,
      sc.target_type,
      sc.target_id,
      sc.old_value,
      sc.new_value,
      u.email AS admin_email
    FROM schedule_changes sc
    JOIN users u ON u.id = sc.admin_id
    ORDER BY sc.changed_at DESC
    LIMIT 100
  `);

  res.json(result.rows);
});

module.exports = router;
