/**
 * Integration tests for the core business rules.
 * Requires a running PostgreSQL database with the schema applied and seed data loaded
 * (see README): npm run db:migrate && npm run db:seed && npm test
 */
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

let token;
let draftEventId;
let publishedEventId;
let participantId;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@eventhub.com', password: 'admin123' });
  token = loginRes.body.token;

  const draftRes = await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Test Draft Event',
      eventDate: new Date(Date.now() + 86400000).toISOString(),
      maxParticipants: 1,
      status: 'draft',
    });
  draftEventId = draftRes.body.event.id;

  const publishedRes = await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Test Published Event',
      eventDate: new Date(Date.now() + 86400000).toISOString(),
      maxParticipants: 1,
      status: 'published',
    });
  publishedEventId = publishedRes.body.event.id;

  const participantRes = await request(app)
    .post('/api/participants')
    .set('Authorization', `Bearer ${token}`)
    .send({ fullName: 'Jest Tester', email: `jest.tester.${Date.now()}@example.com` });
  participantId = participantRes.body.participant.id;
});

afterAll(async () => {
  await pool.end();
});

describe('Business rules', () => {
  it('rejects registration on a non-published event', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: draftEventId, participantId });
    expect(res.status).toBe(400);
  });

  it('allows registration on a published event', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: publishedEventId, participantId });
    expect(res.status).toBe(201);
  });

  it('rejects a duplicate registration for the same event', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: publishedEventId, participantId });
    expect(res.status).toBe(409);
  });

  it('rejects registration once the event is full', async () => {
    const otherParticipantRes = await request(app)
      .post('/api/participants')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Second Tester', email: `jest.tester2.${Date.now()}@example.com` });

    const res = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: publishedEventId, participantId: otherParticipantRes.body.participant.id });
    expect(res.status).toBe(409);
  });

  it('cancels all registrations when the event is cancelled', async () => {
    await request(app)
      .patch(`/api/events/${publishedEventId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' });

    const res = await request(app)
      .get(`/api/registrations?eventId=${publishedEventId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.registrations.every((r) => r.status === 'cancelled')).toBe(true);
  });
});
