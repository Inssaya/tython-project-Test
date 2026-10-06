const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { mapEvent, mapRegistration } = require('../utils/mappers');

// Staff can only see/manage events they created; admins see and manage everything.
function assertCanAccessEvent(event, user) {
  if (user.role !== 'admin' && event.created_by !== user.id) {
    throw ApiError.forbidden('You do not have access to this event.');
  }
}

const createEvent = asyncHandler(async (req, res) => {
  const { title, description, location, eventDate, maxParticipants, status } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO events (title, description, location, event_date, max_participants, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [title, description || null, location || null, eventDate, maxParticipants, status || 'draft', req.user.id]
  );

  res.status(201).json({ event: mapEvent(rows[0]) });
});

const getEvents = asyncHandler(async (req, res) => {
  const { status, date, search, page, pageSize } = req.query;

  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`e.status = $${params.length}`);
  }
  if (date) {
    params.push(date);
    conditions.push(`e.event_date::date = $${params.length}::date`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`e.title ILIKE $${params.length}`);
  }
  if (req.user.role !== 'admin') {
    params.push(req.user.id);
    conditions.push(`e.created_by = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM events e ${whereClause}`, params);

  params.push(pageSize, offset);
  const { rows } = await pool.query(
    `SELECT e.*, u.full_name AS created_by_name,
            (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status <> 'cancelled') AS registered_count
     FROM events e
     JOIN users u ON u.id = e.created_by
     ${whereClause}
     ORDER BY e.event_date ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({
    events: rows.map(mapEvent),
    pagination: { page, pageSize, total: countResult.rows[0].count },
  });
});

const getEventById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const { rows } = await pool.query(
    `SELECT e.*, u.full_name AS created_by_name,
            (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status <> 'cancelled') AS registered_count
     FROM events e
     JOIN users u ON u.id = e.created_by
     WHERE e.id = $1`,
    [id]
  );
  const event = rows[0];
  if (!event) {
    return next(ApiError.notFound('Event not found.'));
  }
  assertCanAccessEvent(event, req.user);

  const { rows: registrations } = await pool.query(
    `SELECT r.*, p.full_name AS participant_full_name, p.email AS participant_email
     FROM registrations r
     JOIN participants p ON p.id = r.participant_id
     WHERE r.event_id = $1
     ORDER BY r.created_at DESC`,
    [id]
  );

  res.json({
    event: mapEvent(event),
    registrations: registrations.map(mapRegistration),
  });
});

const updateEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const fields = req.body;

  const { rows: existingRows } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  if (!existingRows[0]) {
    return next(ApiError.notFound('Event not found.'));
  }
  assertCanAccessEvent(existingRows[0], req.user);

  const columnMap = {
    title: 'title',
    description: 'description',
    location: 'location',
    eventDate: 'event_date',
    maxParticipants: 'max_participants',
    status: 'status',
  };

  const setClauses = [];
  const params = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (fields[key] !== undefined) {
      params.push(fields[key]);
      setClauses.push(`${column} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    return next(ApiError.badRequest('No fields provided to update.'));
  }

  params.push(id);
  const { rows } = await pool.query(
    `UPDATE events SET ${setClauses.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  res.json({ event: mapEvent(rows[0]) });
});

const updateEventStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existingRows } = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [id]);
    const existingEvent = existingRows[0];
    if (!existingEvent) {
      await client.query('ROLLBACK');
      return next(ApiError.notFound('Event not found.'));
    }
    assertCanAccessEvent(existingEvent, req.user);

    const { rows } = await client.query('UPDATE events SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    const event = rows[0];

    // Business rule: cancelling an event cancels all of its registrations.
    if (status === 'cancelled') {
      await client.query(
        `UPDATE registrations SET status = 'cancelled' WHERE event_id = $1 AND status <> 'cancelled'`,
        [id]
      );
    }

    await client.query('COMMIT');
    res.json({ event: mapEvent(event) });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const deleteEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const { rows: existingRows } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  if (!existingRows[0]) {
    return next(ApiError.notFound('Event not found.'));
  }
  assertCanAccessEvent(existingRows[0], req.user);

  await pool.query('DELETE FROM events WHERE id = $1', [id]);
  res.status(204).send();
});

module.exports = { createEvent, getEvents, getEventById, updateEvent, updateEventStatus, deleteEvent };
