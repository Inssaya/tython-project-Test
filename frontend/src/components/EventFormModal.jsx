import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Modal from './Modal';

const emptyForm = { title: '', description: '', location: '', eventDate: '', maxParticipants: 20 };

function toDateTimeLocal(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventFormModal({ open, onClose, event, onSaved }) {
  const isEditing = Boolean(event);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        event
          ? {
              title: event.title,
              description: event.description || '',
              location: event.location || '',
              eventDate: toDateTimeLocal(event.eventDate),
              maxParticipants: event.maxParticipants,
            }
          : emptyForm
      );
    }
  }, [open, event]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        maxParticipants: Number(form.maxParticipants),
        eventDate: new Date(form.eventDate).toISOString(),
      };
      if (isEditing) {
        await apiClient.put(`/events/${event.id}`, payload);
      } else {
        await apiClient.post('/events', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Enregistrement impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Modifier l'evenement" : 'Nouvel evenement'}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Lieu</label>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date et heure</label>
            <input
              type="datetime-local"
              required
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Places maximum</label>
            <input
              type="number"
              min="1"
              required
              value={form.maxParticipants}
              onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Creer (brouillon)'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
