const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { mapEvent } = require('../utils/mappers');
const { registerParticipant } = require('../services/registrationService');

const getPublicEvent = asyncHandler(async (req, res, next) => {
  const { rows } = await pool.query(
    `SELECT e.id, e.title, e.description, e.location, e.event_date, e.max_participants, e.status,
            (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status <> 'cancelled') AS registered_count
     FROM events e WHERE e.id = $1`,
    [req.params.id]
  );
  const event = rows[0];
  if (!event) {
    return next(ApiError.notFound('Event not found.'));
  }
  res.json({ event: mapEvent(event) });
});

const registerForPublicEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { fullName, email, phone } = req.body;

  const { rows: eventRows } = await pool.query('SELECT id FROM events WHERE id = $1', [id]);
  if (!eventRows[0]) {
    return next(ApiError.notFound('Event not found.'));
  }

  const { rows: existingParticipant } = await pool.query(
    'SELECT id FROM participants WHERE lower(email) = lower($1)',
    [email]
  );

  let participantId;
  if (existingParticipant[0]) {
    participantId = existingParticipant[0].id;
  } else {
    const { rows } = await pool.query(
      'INSERT INTO participants (full_name, email, phone) VALUES ($1, $2, $3) RETURNING id',
      [fullName, email, phone || null]
    );
    participantId = rows[0].id;
  }

  const registration = await registerParticipant(id, participantId, 'pending');
  res.status(201).json({ registration: { id: registration.id, status: registration.status } });
});

module.exports = { getPublicEvent, registerForPublicEvent };
