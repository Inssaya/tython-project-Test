import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/dashboard/stats')
      .then(({ data }) => setStats(data))
      .catch((err) => setError(err.response?.data?.error || 'Erreur de chargement.'));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stats) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total evenements" value={stats.totalEvents} />
        <StatCard label="Evenements publies" value={stats.publishedEvents} />
        <StatCard label="Inscriptions aujourd'hui" value={stats.registrationsToday} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Top 5 evenements les plus remplis</h2>
        <div className="space-y-3">
          {stats.topEvents.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="block rounded-lg border border-slate-100 p-3 hover:border-indigo-200 hover:bg-indigo-50"
            >
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">{event.title}</span>
                <span className="text-slate-500">
                  {event.registeredCount} / {event.maxParticipants}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-indigo-500"
                  style={{ width: `${Math.min(event.fillRate * 100, 100)}%` }}
                />
              </div>
            </Link>
          ))}
          {stats.topEvents.length === 0 && <p className="text-sm text-slate-500">Aucun evenement.</p>}
        </div>
      </div>
    </div>
  );
}
