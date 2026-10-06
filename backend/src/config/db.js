require('dotenv').config();
const { Pool } = require('pg');

// Managed providers (Supabase, Render, etc.) require SSL; local/Docker Postgres doesn't.
const isLocal = /localhost|127\.0\.0\.1|postgres:5432/.test(process.env.DATABASE_URL || '');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

module.exports = pool;
