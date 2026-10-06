import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/client';
import StatusBadge from '../components/StatusBadge';

const emptyForm = { fullName: '', email: '', phone: '' };

export default function PublicEventRegister() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiClient
      .get(`/public/events/${id}`)
      .then(({ data }) => setEvent(data.event))
      .catch((err) => setLoadError(err.response?.data?.error || "Cet evenement n'existe pas."));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      await apiClient.post(`/public/events/${id}/register`, form);
      setDone(true);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Inscription impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-indigo-600">EventHub</h1>

        {loadError && <p className="mt-4 text-sm text-red-600">{loadError}</p>}

        {!loadError && !event && <p className="mt-4 text-sm text-slate-500">Chargement...</p>}

        {event && (
          <>
            <div className="mt-4 mb-6 border-b border-slate-100 pb-4">
              <div className="mb-1 flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{event.title}</h2>
                <StatusBadge status={event.status} />
              </div>
              <p className="text-sm text-slate-500">
                {new Date(event.eventDate).toLocaleString()} - {event.location || 'Lieu non precise'}
              </p>
              {event.description && <p className="mt-2 text-sm text-slate-700">{event.description}</p>}
              <p className="mt-2 text-sm text-slate-600">
                Places : {event.registeredCount ?? 0} / {event.maxParticipants}
              </p>
            </div>

            {event.status !== 'published' && (
              <p className="text-sm text-amber-600">
                Les inscriptions ne sont pas ouvertes pour cet evenement pour le moment.
              </p>
            )}

            {event.status === 'published' && done && (
              <p className="text-sm text-emerald-600">
                Merci ! Votre inscription a bien ete enregistree.
              </p>
            )}

            {event.status === 'published' && !done && (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Nom complet</label>
                  <input
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Telephone (optionnel)</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                {submitError && <p className="text-sm text-red-600">{submitError}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? 'Envoi...' : "S'inscrire"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
