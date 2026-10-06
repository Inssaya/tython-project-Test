const express = require('express');
const {
  createRegistration,
  getRegistrations,
  updateRegistrationStatus,
} = require('../controllers/registrationController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createRegistrationSchema,
  updateRegistrationStatusSchema,
  listRegistrationsQuerySchema,
} = require('../validators/registrationValidators');

const router = express.Router();

router.use(authenticate);

router.post('/', requireRole('admin', 'staff'), validate(createRegistrationSchema), createRegistration);
router.get('/', validate(listRegistrationsQuerySchema, 'query'), getRegistrations);
router.patch(
  '/:id/status',
  requireRole('admin', 'staff'),
  validate(updateRegistrationStatusSchema),
  updateRegistrationStatus
);

module.exports = router;
