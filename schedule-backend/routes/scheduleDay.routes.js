const express = require('express');
const router = express.Router();

const {
  getScheduleByDay,
  updateScheduleByDay
} = require('../controllers/scheduleDay.controllers');

const authMiddleware = require('../middleware/auth.middleware');

router.get('/day', authMiddleware, getScheduleByDay);
router.put('/day', authMiddleware, updateScheduleByDay);

module.exports = router;
