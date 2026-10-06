/**
 * Applies db/schema.sql to the database at DATABASE_URL.
 * Usage: node db/migrate.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
