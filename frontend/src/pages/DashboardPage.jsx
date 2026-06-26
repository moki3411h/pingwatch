import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import MonitorCard from '../components/MonitorCard';
import { list, create } from '../api/monitors.api';

export default function DashboardPage() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', interval_seconds: 60 });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchMonitors = async () => {
    try {
      const res = await list();
      setMonitors(res.data.monitors);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMonitors(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      await create({ ...form, interval_seconds: parseInt(form.interval_seconds) });
      setShowForm(false);
      setForm({ name: '', url: '', interval_seconds: 60 });
      fetchMonitors();
    } catch (err) {
      setError(err.response?.data?.details?.[0] || err.response?.data?.error || 'Failed to create monitor');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="page-header">
          <h1>Monitors</h1>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Monitor'}
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>New Monitor</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                placeholder="Name (e.g. GitHub API)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                placeholder="URL (e.g. https://api.github.com)"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
              <input
                type="number" placeholder="Interval (seconds, min 30)"
                value={form.interval_seconds}
                onChange={(e) => setForm({ ...form, interval_seconds: e.target.value })}
              />
              {error && <div className="error-msg">{error}</div>}
              <button className="btn-primary" onClick={handleCreate} disabled={creating} style={{ width: 'fit-content' }}>
                {creating ? 'Creating…' : 'Create Monitor'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading monitors…</p>
        ) : monitors.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: '#64748b' }}>No monitors yet. Add one above to start monitoring.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {monitors.map((m) => <MonitorCard key={m.id} monitor={m} />)}
          </div>
        )}
      </div>
    </>
  );
}
