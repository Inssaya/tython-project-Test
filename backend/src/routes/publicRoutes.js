const express = require('express');
const { getPublicEvent, registerForPublicEvent } = require('../controllers/publicController');
const validate = require('../middleware/validate');
const { publicRegisterSchema } = require('../validators/publicValidators');

const router = express.Router();

// Unauthenticated routes: the public-facing registration form for a single event.
router.get('/events/:id', getPublicEvent);
router.post('/events/:id/register', validate(publicRegisterSchema), registerForPublicEvent);

module.exports = router;
