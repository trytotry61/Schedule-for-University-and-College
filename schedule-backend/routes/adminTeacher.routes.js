const express = require('express');
const router = express.Router();

const { createTeacher,getTeachers } = require('../controllers/adminTeacher.controllers');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/teachers', authMiddleware, createTeacher);
router.get('/teachers', authMiddleware, getTeachers);


module.exports = router;
