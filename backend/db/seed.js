/**
 * Seeds the database with demo data:
 * 1 admin + 1 staff user, 5 events (draft/published/cancelled),
 * 10 participants, 20 registrations across various statuses.
 *
 * Usage: node db/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Reset tables (idempotent re-seed for local/dev use only)
    await client.query('TRUNCATE registrations, events, participants, users RESTART IDENTITY CASCADE');

    const adminHash = await bcrypt.hash('admin123', 10);
    const staffHash = await bcrypt.hash('staff123', 10);

    const { rows: users } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES
         ('Alice Admin', 'admin@eventhub.com', $1, 'admin'),
         ('Sami Staff', 'staff@eventhub.com', $2, 'staff')
       RETURNING id, role`,
      [adminHash, staffHash]
    );
    const adminId = users.find((u) => u.role === 'admin').id;
    const staffId = users.find((u) => u.role === 'staff').id;

    const now = new Date();
    const inDays = (n) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

    // Mix of events owned by the admin and by the staff user, to demo the
    // "staff only sees their own events" access rule.
    const eventsData = [
      ['Conference Tech 2026', 'Grande conference annuelle sur les technologies web.', 'Casablanca, Technopark', inDays(30), 50, 'published', adminId],
      ['Atelier UX Design', 'Atelier pratique de design d\'interface utilisateur.', 'Rabat, Agdal', inDays(15), 20, 'published', adminId],
      ['Hackathon IA', 'Hackathon de 48h autour de l\'intelligence artificielle.', 'Marrakech, Campus Numerique', inDays(45), 100, 'draft', staffId],
      ['Salon de l\'Emploi', 'Salon de recrutement multisectoriel.', 'Fes, Palais des Congres', inDays(-5), 200, 'cancelled', adminId],
      ['Workshop DevOps', 'Workshop intensif sur Docker, CI/CD et Kubernetes.', 'Casablanca, CFC', inDays(7), 10, 'published', staffId],
    ];

    const events = [];
    for (const [title, description, location, eventDate, maxParticipants, status, createdBy] of eventsData) {
      const { rows } = await client.query(
        `INSERT INTO events (title, description, location, event_date, max_participants, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [title, description, location, eventDate, maxParticipants, status, createdBy]
      );
      events.push(rows[0].id);
    }

    const participantsData = [
      ['Youssef Alaoui', 'youssef.alaoui@example.com', '0600000001'],
      ['Fatima Zahra Idrissi', 'fz.idrissi@example.com', '0600000002'],
      ['Omar Benali', 'omar.benali@example.com', '0600000003'],
      ['Nadia El Amrani', 'nadia.elamrani@example.com', '0600000004'],
      ['Karim Tazi', 'karim.tazi@example.com', null],
      ['Salma Bouzidi', 'salma.bouzidi@example.com', '0600000006'],
      ['Mehdi Chraibi', 'mehdi.chraibi@example.com', '0600000007'],
      ['Imane Lahlou', 'imane.lahlou@example.com', null],
      ['Rachid Ouazzani', 'rachid.ouazzani@example.com', '0600000009'],
      ['Hanane Sabri', 'hanane.sabri@example.com', '0600000010'],
    ];

    const participants = [];
    for (const [fullName, email, phone] of participantsData) {
      const { rows } = await client.query(
        `INSERT INTO participants (full_name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
        [fullName, email, phone]
      );
      participants.push(rows[0].id);
    }

    // event index -> [[participantIndex, status], ...]
    // event 0 = published (6 regs), 1 = published (4 regs),
    // 3 = cancelled (3 regs, all cancelled), 4 = published (7 regs, near full of 10)
    const registrationPlan = [
      [0, [[0, 'confirmed'], [1, 'pending'], [2, 'confirmed'], [3, 'pending'], [4, 'confirmed'], [5, 'pending']]],
      [1, [[3, 'confirmed'], [6, 'pending'], [7, 'confirmed'], [8, 'pending']]],
      [3, [[5, 'cancelled'], [6, 'cancelled'], [9, 'cancelled']]],
      [4, [[0, 'confirmed'], [2, 'confirmed'], [3, 'confirmed'], [4, 'pending'], [7, 'confirmed'], [8, 'pending'], [9, 'confirmed']]],
    ];

    let total = 0;
    for (const [eventIdx, regs] of registrationPlan) {
      for (const [participantIdx, status] of regs) {
        await client.query(
          `INSERT INTO registrations (event_id, participant_id, status) VALUES ($1, $2, $3)`,
          [events[eventIdx], participants[participantIdx], status]
        );
        total += 1;
      }
    }

    await client.query('COMMIT');
    console.log(`Seed complete: 2 users, ${events.length} events, ${participants.length} participants, ${total} registrations.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
