const { z } = require('zod');

const createEventSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  location: z.string().trim().max(300).optional().nullable(),
  eventDate: z.coerce.date({ errorMap: () => ({ message: 'A valid eventDate is required.' }) }),
  maxParticipants: z.coerce.number().int().positive('maxParticipants must be a positive integer.'),
  status: z.enum(['draft', 'published', 'cancelled']).optional(),
});

const updateEventSchema = createEventSchema.partial();

const updateStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'cancelled'], {
    errorMap: () => ({ message: 'status must be one of draft, published, cancelled.' }),
  }),
});

const listEventsQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'cancelled']).optional(),
  date: z.coerce.date().optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

module.exports = { createEventSchema, updateEventSchema, updateStatusSchema, listEventsQuerySchema };
