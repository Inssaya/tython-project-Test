const express = require('express');
const { login, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginSchema } = require('../validators/authValidators');

const router = express.Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, me);

module.exports = router;
