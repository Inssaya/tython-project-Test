const { z } = require('zod');

const createUserSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required.').max(200),
  email: z.string().trim().email('A valid email is required.'),
  password: z.string().min(6, 'password must be at least 6 characters long.'),
  role: z.enum(['admin', 'staff']).optional().default('staff'),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'newPassword must be at least 6 characters long.'),
});

const listUsersQuerySchema = z.object({
  role: z.enum(['admin', 'staff']).optional(),
});

module.exports = { createUserSchema, resetPasswordSchema, listUsersQuerySchema };
