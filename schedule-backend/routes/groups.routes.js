const express = require('express');
const router = express.Router();

const { getGroups } = require('../controllers/groups.controllers');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, getGroups);

module.exports = router;
