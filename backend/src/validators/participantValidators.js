const { z } = require('zod');

const createParticipantSchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required.').max(200),
  email: z.string().trim().email('A valid email is required.'),
  phone: z.string().trim().max(30).optional().nullable(),
});

const updateParticipantSchema = createParticipantSchema.partial();

const listParticipantsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

module.exports = { createParticipantSchema, updateParticipantSchema, listParticipantsQuerySchema };
