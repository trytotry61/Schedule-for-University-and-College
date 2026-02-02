const express = require('express');
const router = express.Router();

const { getTeacherSchedule } = require('../controllers/teacherSchedule.controllers');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/schedule', authMiddleware, getTeacherSchedule);

module.exports = router;
