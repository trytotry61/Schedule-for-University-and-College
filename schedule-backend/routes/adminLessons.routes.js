const express = require('express');
const router = express.Router();

const { getAdminLessons } = require('../controllers/adminLessons.controllers');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/lessons', authMiddleware, getAdminLessons);

module.exports = router;
