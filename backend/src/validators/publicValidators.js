const { z } = require('zod');

const publicRegisterSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required.').max(200),
  email: z.string().trim().email('A valid email is required.'),
  phone: z.string().trim().max(30).optional().nullable(),
});

module.exports = { publicRegisterSchema };
