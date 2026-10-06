function mapEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    eventDate: row.event_date,
    maxParticipants: row.max_participants,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.registered_count !== undefined ? { registeredCount: Number(row.registered_count) } : {}),
    ...(row.created_by_name !== undefined ? { createdByName: row.created_by_name } : {}),
  };
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    ...(row.total_events !== undefined ? { totalEvents: Number(row.total_events) } : {}),
    ...(row.total_participants !== undefined ? { totalParticipants: Number(row.total_participants) } : {}),
  };
}

function mapParticipant(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    createdAt: row.created_at,
  };
}

function mapRegistration(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    participantId: row.participant_id,
    status: row.status,
    createdAt: row.created_at,
    ...(row.event_title !== undefined ? { eventTitle: row.event_title } : {}),
    ...(row.participant_full_name !== undefined
      ? { participant: { fullName: row.participant_full_name, email: row.participant_email } }
      : {}),
  };
}

module.exports = { mapEvent, mapParticipant, mapRegistration, mapUser };
