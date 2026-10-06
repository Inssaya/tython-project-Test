import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import StatusBadge from '../components/StatusBadge';
import EventFormModal from '../components/EventFormModal';
import EventViewModal from '../components/EventViewModal';

const STATUSES = ['draft', 'published', 'cancelled'];

export default function EventsList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewingEventId, setViewingEventId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const loadEvents = () => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    apiClient
      .get('/events', { params })
      .then(({ data }) => setEvents(data.events))
      .catch((err) => setError(err.response?.data?.error || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadEvents, [statusFilter]);

  // Allows other pages (e.g. the Dashboard) to deep-link into an event's popup.
  useEffect(() => {
    if (location.state?.openEventId) {
      setViewingEventId(location.state.openEventId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  const publishEvent = async (id) => {
    setActionError('');
    try {
      await apiClient.patch(`/events/${id}/status`, { status: 'published' });
      loadEvents();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Publication impossible.');
    }
  };

  const deleteEvent = async (id) => {
    setActionError('');
    setDeletingId(id);
    try {
      await apiClient.delete(`/events/${id}`);
      loadEvents();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Suppression impossible.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={openCreateModal}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Nouvel evenement
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Filtrer par statut :</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Tous</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {actionError && <p className="text-red-600">{actionError}</p>}

      {loading ? (
        <p className="text-slate-500">Chargement...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Lieu</th>
                <th className="px-4 py-3">Places</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setViewingEventId(event.id)}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {event.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{new Date(event.eventDate).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{event.location || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {event.registeredCount ?? 0} / {event.maxParticipants}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setViewingEventId(event.id)}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Ouvrir
                      </button>
                      <button
                        onClick={() => openEditModal(event)}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Modifier
                      </button>
                      {event.status === 'draft' && (
                        <button
                          onClick={() => publishEvent(event.id)}
                          className="rounded-md border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                        >
                          Publier
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`Supprimer l'evenement "${event.title}" ?`)) {
                            deleteEvent(event.id);
                          }
                        }}
                        disabled={deletingId === event.id}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingId === event.id ? '...' : 'Supprimer'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Aucun evenement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <EventFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        event={editingEvent}
        onSaved={loadEvents}
      />

      <EventViewModal
        eventId={viewingEventId}
        onClose={() => setViewingEventId(null)}
        onChanged={loadEvents}
      />
    </div>
  );
}
