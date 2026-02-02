const express = require('express');
const router = express.Router();

router.get('/week', authMiddleware, getScheduleByWeek);
module.exports = router;