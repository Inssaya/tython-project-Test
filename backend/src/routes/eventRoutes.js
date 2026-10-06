const express = require('express');
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  updateEventStatus,
  deleteEvent,
} = require('../controllers/eventController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createEventSchema,
  updateEventSchema,
  updateStatusSchema,
  listEventsQuerySchema,
} = require('../validators/eventValidators');

const router = express.Router();

router.use(authenticate);

router.post('/', requireRole('admin', 'staff'), validate(createEventSchema), createEvent);
router.get('/', validate(listEventsQuerySchema, 'query'), getEvents);
router.get('/:id', getEventById);
router.put('/:id', requireRole('admin', 'staff'), validate(updateEventSchema), updateEvent);
router.patch('/:id/status', requireRole('admin', 'staff'), validate(updateStatusSchema), updateEventStatus);
router.delete('/:id', requireRole('admin', 'staff'), deleteEvent);

module.exports = router;
