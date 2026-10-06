import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Modal from './Modal';
import StatusBadge from './StatusBadge';

export default function EventViewModal({ eventId, onClose, onChanged }) {
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [regError, setRegError] = useState('');
  const [regMessage, setRegMessage] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const load = () => {
    if (!eventId) return;
    apiClient
      .get(`/events/${eventId}`)
      .then(({ data }) => {
        setEvent(data.event);
        setRegistrations(data.registrations);
      })
      .catch((err) => setError(err.response?.data?.error || 'Erreur de chargement.'));
  };

  useEffect(() => {
    setEvent(null);
    setError('');
    setSearch('');
    setResults([]);
    setRegMessage('');
    setRegError('');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const changeStatus = async (status) => {
    await apiClient.patch(`/events/${eventId}/status`, { status });
    load();
    onChanged?.();
  };

  const searchParticipants = async (value) => {
    setSearch(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    const { data } = await apiClient.get('/participants', { params: { search: value } });
    setResults(data.participants);
  };

  const registerParticipant = async (participantId) => {
    setRegError('');
    setRegMessage('');
    try {
      await apiClient.post('/registrations', { eventId, participantId });
      setRegMessage('Inscription effectuee.');
      setSearch('');
      setResults([]);
      load();
      onChanged?.();
    } catch (err) {
      setRegError(err.response?.data?.error || 'Inscription impossible.');
    }
  };

  const updateRegistrationStatus = async (registrationId, status) => {
    await apiClient.patch(`/registrations/${registrationId}/status`, { status });
    load();
  };

  const publicLink = eventId ? `${window.location.origin}/register/${eventId}` : '';

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the input stays selectable for manual copy.
    }
  };

  return (
    <Modal open={Boolean(eventId)} onClose={onClose} title="Details de l'evenement" size="lg">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !event && <p className="text-sm text-slate-500">Chargement...</p>}

      {event && (
        <div className="max-h-[75vh] space-y-6 overflow-y-auto pr-1">
          <div>
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">{event.title}</h3>
              <StatusBadge status={event.status} />
            </div>
            <p className="text-sm text-slate-500">
              {new Date(event.eventDate).toLocaleString()} - {event.location || 'Lieu non precise'}
            </p>
            {event.description && <p className="mt-3 text-sm text-slate-700">{event.description}</p>}
            <div className="mt-3 text-sm text-slate-600">
              Inscrits : {event.registeredCount ?? 0} / {event.maxParticipants}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Statut :</label>
              <select
                value={event.status}
                onChange={(e) => changeStatus(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="cancelled">cancelled</option>
              </select>
              {event.status === 'cancelled' && (
                <span className="text-xs text-slate-400">
                  Annuler repasse automatiquement toutes les inscriptions en "cancelled".
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Lien public du formulaire d'inscription</h4>
            <p className="mb-2 text-sm text-slate-500">
              Partagez ce lien avec un invite pour qu'il s'inscrive lui-meme a cet evenement.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={publicLink}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              />
              <button
                onClick={copyPublicLink}
                className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {linkCopied ? 'Copie !' : 'Copier'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Inscrire un participant existant</h4>
            {event.status !== 'published' && (
              <p className="mb-2 text-sm text-amber-600">
                L'evenement doit etre publie pour pouvoir inscrire des participants.
              </p>
            )}
            <div className="relative">
              <input
                placeholder="Rechercher un participant par nom ou email..."
                value={search}
                onChange={(e) => searchParticipants(e.target.value)}
                disabled={event.status !== 'published'}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
              {results.length > 0 && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => registerParticipant(p.id)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50"
                    >
                      {p.fullName} <span className="text-slate-400">({p.email})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {regError && <p className="mt-2 text-sm text-red-600">{regError}</p>}
            {regMessage && <p className="mt-2 text-sm text-emerald-600">{regMessage}</p>}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Inscriptions ({registrations.length})</h4>
            <div className="overflow-hidden rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Participant</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrations.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2">{r.participant?.fullName}</td>
                      <td className="px-3 py-2 text-slate-500">{r.participant?.email}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <select
                          value={r.status}
                          onChange={(e) => updateRegistrationStatus(r.id, e.target.value)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="pending">pending</option>
                          <option value="confirmed">confirmed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {registrations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                        Aucune inscription.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
