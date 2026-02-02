const pool = require('../db');

const getGroups = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name
      FROM groups
      ORDER BY name
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('GET GROUPS ERROR:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

module.exports = { getGroups };
