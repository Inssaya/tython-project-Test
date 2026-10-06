const express = require('express');
const { createUser, getUsers, resetPassword, deleteUser } = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserSchema, resetPasswordSchema, listUsersQuerySchema } = require('../validators/userValidators');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.post('/', validate(createUserSchema), createUser);
router.get('/', validate(listUsersQuerySchema, 'query'), getUsers);
router.patch('/:id/reset-password', validate(resetPasswordSchema), resetPassword);
router.delete('/:id', deleteUser);

module.exports = router;
