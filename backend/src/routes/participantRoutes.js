const express = require('express');
const {
  createParticipant,
  getParticipants,
  getParticipantById,
  updateParticipant,
} = require('../controllers/participantController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createParticipantSchema,
  updateParticipantSchema,
  listParticipantsQuerySchema,
} = require('../validators/participantValidators');

const router = express.Router();

router.use(authenticate);

router.post('/', requireRole('admin', 'staff'), validate(createParticipantSchema), createParticipant);
router.get('/', validate(listParticipantsQuerySchema, 'query'), getParticipants);
router.get('/:id', getParticipantById);
router.put('/:id', requireRole('admin', 'staff'), validate(updateParticipantSchema), updateParticipant);

module.exports = router;
