const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { mapParticipant } = require('../utils/mappers');

const createParticipant = asyncHandler(async (req, res, next) => {
  const { fullName, email, phone } = req.body;

  const { rows: existing } = await pool.query('SELECT id FROM participants WHERE lower(email) = lower($1)', [email]);
  if (existing.length) {
    return next(ApiError.conflict('A participant with this email already exists.'));
  }

  const { rows } = await pool.query(
    `INSERT INTO participants (full_name, email, phone) VALUES ($1, $2, $3) RETURNING *`,
    [fullName, email, phone || null]
  );

  res.status(201).json({ participant: mapParticipant(rows[0]) });
});

const getParticipants = asyncHandler(async (req, res) => {
  const { search, page, pageSize } = req.query;

  const conditions = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM participants ${whereClause}`, params);

  params.push(pageSize, offset);
  const { rows } = await pool.query(
    `SELECT * FROM participants ${whereClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({
    participants: rows.map(mapParticipant),
    pagination: { page, pageSize, total: countResult.rows[0].count },
  });
});

const getParticipantById = asyncHandler(async (req, res, next) => {
  const { rows } = await pool.query('SELECT * FROM participants WHERE id = $1', [req.params.id]);
  if (!rows[0]) {
    return next(ApiError.notFound('Participant not found.'));
  }
  res.json({ participant: mapParticipant(rows[0]) });
});

const updateParticipant = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { fullName, email, phone } = req.body;

  if (email) {
    const { rows: existing } = await pool.query(
      'SELECT id FROM participants WHERE lower(email) = lower($1) AND id <> $2',
      [email, id]
    );
    if (existing.length) {
      return next(ApiError.conflict('A participant with this email already exists.'));
    }
  }

  const columnMap = { fullName: 'full_name', email: 'email', phone: 'phone' };
  const setClauses = [];
  const params = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (req.body[key] !== undefined) {
      params.push(req.body[key]);
      setClauses.push(`${column} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    return next(ApiError.badRequest('No fields provided to update.'));
  }

  params.push(id);
  const { rows } = await pool.query(
    `UPDATE participants SET ${setClauses.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  if (!rows[0]) {
    return next(ApiError.notFound('Participant not found.'));
  }

  res.json({ participant: mapParticipant(rows[0]) });
});

module.exports = { createParticipant, getParticipants, getParticipantById, updateParticipant };
