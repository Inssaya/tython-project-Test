const bcrypt = require('bcrypt');
const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { mapUser } = require('../utils/mappers');

const createUser = asyncHandler(async (req, res, next) => {
  const { fullName, email, password, role } = req.body;

  const { rows: existing } = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
  if (existing.length) {
    return next(ApiError.conflict('A user with this email already exists.'));
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *`,
    [fullName, email, passwordHash, role]
  );

  res.status(201).json({ user: mapUser({ ...rows[0], total_events: 0, total_participants: 0 }) });
});

const getUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;

  const conditions = [];
  const params = [];
  if (role) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT u.*,
            (SELECT COUNT(*) FROM events e WHERE e.created_by = u.id) AS total_events,
            (SELECT COUNT(DISTINCT r.participant_id)
               FROM registrations r
               JOIN events e ON e.id = r.event_id
              WHERE e.created_by = u.id) AS total_participants
     FROM users u
     ${whereClause}
     ORDER BY u.created_at DESC`,
    params
  );

  res.json({ users: rows.map(mapUser) });
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  const { rows: existing } = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
  if (!existing[0]) {
    return next(ApiError.notFound('User not found.'));
  }
  if (existing[0].role !== 'staff') {
    return next(ApiError.forbidden('Only staff accounts can be managed from this endpoint.'));
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);

  res.json({ success: true });
});

const deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const { rows: existing } = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
  if (!existing[0]) {
    return next(ApiError.notFound('User not found.'));
  }
  if (existing[0].role !== 'staff') {
    return next(ApiError.forbidden('Only staff accounts can be managed from this endpoint.'));
  }

  // The events.created_by FK cascades: deleting the user deletes their events,
  // which in turn cascades to delete those events' registrations.
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
  res.status(204).send();
});

module.exports = { createUser, getUsers, resetPassword, deleteUser };
