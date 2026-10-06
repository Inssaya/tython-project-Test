const pool = require('../config/db');
const ApiError = require('../utils/ApiError');

/**
 * Registers a participant on an event, enforcing the three business rules:
 * event must be published, no duplicate active registration, capacity respected.
 * Shared by the authenticated registrations endpoint and the public registration form
 * so both paths apply exactly the same rules.
 */
async function registerParticipant(eventId, participantId, status = 'pending') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the event row to make the capacity check race-safe under concurrent registrations.
    const { rows: eventRows } = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    const event = eventRows[0];
    if (!event) {
      throw ApiError.notFound('Event not found.');
    }

    if (event.status !== 'published') {
      throw ApiError.badRequest('Cannot register for an event that is not published.');
    }

    const { rows: existingRows } = await client.query(
      'SELECT id, status FROM registrations WHERE event_id = $1 AND participant_id = $2',
      [eventId, participantId]
    );
    if (existingRows[0] && existingRows[0].status !== 'cancelled') {
      throw ApiError.conflict('This participant is already registered for this event.');
    }

    const { rows: countRows } = await client.query(
      `SELECT COUNT(*)::int AS count FROM registrations WHERE event_id = $1 AND status <> 'cancelled'`,
      [eventId]
    );
    if (countRows[0].count >= event.max_participants) {
      throw ApiError.conflict('This event is full.');
    }

    let registration;
    if (existingRows[0]) {
      // Re-registering after a previous cancellation: reuse the row.
      const { rows } = await client.query(`UPDATE registrations SET status = $1 WHERE id = $2 RETURNING *`, [
        status,
        existingRows[0].id,
      ]);
      registration = rows[0];
    } else {
      const { rows } = await client.query(
        `INSERT INTO registrations (event_id, participant_id, status) VALUES ($1, $2, $3) RETURNING *`,
        [eventId, participantId, status]
      );
      registration = rows[0];
    }

    await client.query('COMMIT');
    return registration;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { registerParticipant };
