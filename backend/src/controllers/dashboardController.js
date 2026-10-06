const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalEvents, publishedEvents, registrationsToday, topEvents] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM events'),
    pool.query(`SELECT COUNT(*)::int AS count FROM events WHERE status = 'published'`),
    pool.query(`SELECT COUNT(*)::int AS count FROM registrations WHERE created_at::date = CURRENT_DATE`),
    pool.query(`
      SELECT e.id, e.title, e.max_participants,
             COUNT(r.id) FILTER (WHERE r.status <> 'cancelled') AS registered_count
      FROM events e
      LEFT JOIN registrations r ON r.event_id = e.id
      GROUP BY e.id, e.title, e.max_participants
      ORDER BY registered_count DESC, e.event_date ASC
      LIMIT 5
    `),
  ]);

  res.json({
    totalEvents: totalEvents.rows[0].count,
    publishedEvents: publishedEvents.rows[0].count,
    registrationsToday: registrationsToday.rows[0].count,
    topEvents: topEvents.rows.map((row) => ({
      id: row.id,
      title: row.title,
      maxParticipants: row.max_participants,
      registeredCount: Number(row.registered_count),
      fillRate: row.max_participants > 0 ? Number(row.registered_count) / row.max_participants : 0,
    })),
  });
});

module.exports = { getDashboardStats };
