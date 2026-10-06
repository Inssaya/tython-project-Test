const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const { rows } = await pool.query(
    'SELECT id, full_name, email, password_hash, role FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];

  if (!user) {
    return next(ApiError.unauthorized('Invalid email or password.'));
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return next(ApiError.unauthorized('Invalid email or password.'));
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, email: user.email, fullName: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({
    token,
    user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role },
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = { login, me };
