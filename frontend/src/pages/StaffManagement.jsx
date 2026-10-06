import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Modal from '../components/Modal';

const emptyCreateForm = { fullName: '', email: '', password: '' };

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = () => {
    setLoading(true);
    apiClient
      .get('/users', { params: { role: 'staff' } })
      .then(({ data }) => setStaff(data.users))
      .catch((err) => setError(err.response?.data?.error || 'Erreur de chargement.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setCreateForm(emptyCreateForm);
    setCreateError('');
    setCreateOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await apiClient.post('/users', { ...createForm, role: 'staff' });
      setCreateOpen(false);
      load();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Creation impossible.');
    } finally {
      setCreating(false);
    }
  };

  const openReset = (member) => {
    setResetTarget(member);
    setNewPassword('');
    setResetError('');
    setResetDone(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetting(true);
    try {
      await apiClient.patch(`/users/${resetTarget.id}/reset-password`, { newPassword });
      setResetDone(true);
    } catch (err) {
      setResetError(err.response?.data?.error || 'Reinitialisation impossible.');
    } finally {
      setResetting(false);
    }
  };

  const deleteStaff = async (member) => {
    if (
      !window.confirm(
        `Supprimer le compte de "${member.fullName}" ? Ses ${member.totalEvents} evenement(s) et leurs inscriptions seront egalement supprimes.`
      )
    ) {
      return;
    }
    setActionError('');
    setDeletingId(member.id);
    try {
      await apiClient.delete(`/users/${member.id}`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Suppression impossible.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Gestion du staff</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Nouveau staff
        </button>
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
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Date de creation</th>
                <th className="px-4 py-3">Total evenements</th>
                <th className="px-4 py-3">Total participants</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{member.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{member.email}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(member.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-600">{member.totalEvents}</td>
                  <td className="px-4 py-3 text-slate-600">{member.totalParticipants}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openReset(member)}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Reinitialiser mot de passe
                      </button>
                      <button
                        onClick={() => deleteStaff(member)}
                        disabled={deletingId === member.id}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingId === member.id ? '...' : 'Supprimer'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Aucun compte staff.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau compte staff">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom complet</label>
            <input
              required
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {createError && <p className="text-sm text-red-600">{createError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {creating ? 'Creation...' : 'Creer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title={`Reinitialiser le mot de passe${resetTarget ? ` - ${resetTarget.fullName}` : ''}`}
      >
        {resetDone ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-600">Mot de passe mis a jour.</p>
            <button
              onClick={() => setResetTarget(null)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nouveau mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {resetError && <p className="text-sm text-red-600">{resetError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={resetting}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {resetting ? 'Enregistrement...' : 'Reinitialiser'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
