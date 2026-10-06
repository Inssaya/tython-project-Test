const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { mapRegistration } = require('../utils/mappers');
const { registerParticipant } = require('../services/registrationService');

const createRegistration = asyncHandler(async (req, res, next) => {
  const { eventId, participantId, status } = req.body;

  const { rows: eventRows } = await pool.query('SELECT created_by FROM events WHERE id = $1', [eventId]);
  if (!eventRows[0]) {
    return next(ApiError.notFound('Event not found.'));
  }
  if (req.user.role !== 'admin' && eventRows[0].created_by !== req.user.id) {
    return next(ApiError.forbidden('You do not have access to this event.'));
  }

  const { rows: participantRows } = await pool.query('SELECT id FROM participants WHERE id = $1', [participantId]);
  if (!participantRows[0]) {
    return next(ApiError.notFound('Participant not found.'));
  }

  const registration = await registerParticipant(eventId, participantId, status || 'pending');
  res.status(201).json({ registration: mapRegistration(registration) });
});

const getRegistrations = asyncHandler(async (req, res) => {
  const { eventId, participantId, status, page, pageSize } = req.query;

  const conditions = [];
  const params = [];
  if (eventId) {
    params.push(eventId);
    conditions.push(`r.event_id = $${params.length}`);
  }
  if (participantId) {
    params.push(participantId);
    conditions.push(`r.participant_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }
  if (req.user.role !== 'admin') {
    params.push(req.user.id);
    conditions.push(`e.created_by = $${params.length}`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM registrations r JOIN events e ON e.id = r.event_id ${whereClause}`,
    params
  );

  params.push(pageSize, offset);
  const { rows } = await pool.query(
    `SELECT r.*, e.title AS event_title, p.full_name AS participant_full_name, p.email AS participant_email
     FROM registrations r
     JOIN events e ON e.id = r.event_id
     JOIN participants p ON p.id = r.participant_id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({
    registrations: rows.map(mapRegistration),
    pagination: { page, pageSize, total: countResult.rows[0].count },
  });
});

const updateRegistrationStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: regRows } = await client.query('SELECT * FROM registrations WHERE id = $1 FOR UPDATE', [id]);
    const registration = regRows[0];
    if (!registration) {
      await client.query('ROLLBACK');
      return next(ApiError.notFound('Registration not found.'));
    }

    const { rows: ownerRows } = await client.query('SELECT created_by FROM events WHERE id = $1', [
      registration.event_id,
    ]);
    if (req.user.role !== 'admin' && ownerRows[0]?.created_by !== req.user.id) {
      await client.query('ROLLBACK');
      return next(ApiError.forbidden('You do not have access to this event.'));
    }

    const isReactivation = registration.status === 'cancelled' && status !== 'cancelled';
    if (isReactivation || (status === 'confirmed' && registration.status !== 'confirmed')) {
      const { rows: eventRows } = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [
        registration.event_id,
      ]);
      const event = eventRows[0];

      if (event.status !== 'published') {
        await client.query('ROLLBACK');
        return next(ApiError.badRequest('Cannot confirm a registration for an event that is not published.'));
      }

      const { rows: countRows } = await client.query(
        `SELECT COUNT(*)::int AS count FROM registrations WHERE event_id = $1 AND status <> 'cancelled' AND id <> $2`,
        [registration.event_id, id]
      );
      if (countRows[0].count >= event.max_participants) {
        await client.query('ROLLBACK');
        return next(ApiError.conflict('This event is full.'));
      }
    }

    const { rows } = await client.query('UPDATE registrations SET status = $1 WHERE id = $2 RETURNING *', [
      status,
      id,
    ]);

    await client.query('COMMIT');
    res.json({ registration: mapRegistration(rows[0]) });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = { createRegistration, getRegistrations, updateRegistrationStatus };
