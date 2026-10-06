const { z } = require('zod');

const createRegistrationSchema = z.object({
  eventId: z.string().uuid('eventId must be a valid UUID.'),
  participantId: z.string().uuid('participantId must be a valid UUID.'),
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
});

const updateRegistrationStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled'], {
    errorMap: () => ({ message: 'status must be one of pending, confirmed, cancelled.' }),
  }),
});

const listRegistrationsQuerySchema = z.object({
  eventId: z.string().uuid().optional(),
  participantId: z.string().uuid().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

module.exports = {
  createRegistrationSchema,
  updateRegistrationStatusSchema,
  listRegistrationsQuerySchema,
};
