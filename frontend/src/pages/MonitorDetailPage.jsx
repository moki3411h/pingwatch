import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import LatencyChart from '../components/LatencyChart';
import { getById, getPings, remove } from '../api/monitors.api';
import { getStats } from '../api/stats.api';

export default function MonitorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState(null);
  const [pings, setPings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [mRes, pRes, sRes] = await Promise.all([
          getById(id),
          getPings(id, 50),
          getStats(id),
        ]);
        setMonitor(mRes.data.monitor);
        setPings(pRes.data.ping_logs);
        setStats(sRes.data.windows);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this monitor? This cannot be undone.')) return;
    await remove(id);
    navigate('/dashboard');
  };

  if (loading) return <><Navbar /><div className="page"><p style={{ color: '#64748b' }}>Loading…</p></div></>;
  if (!monitor) return <><Navbar /><div className="page"><p>Monitor not found.</p></div></>;

  const lastPing = pings[0];

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h1>{monitor.name}</h1>
              <StatusBadge up={lastPing?.is_success} />
            </div>
            <div style={{ color: '#64748b', fontSize: 14 }}>{monitor.url}</div>
          </div>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
            {[['Last 24h', stats.last_24h], ['Last 7 days', stats.last_7d], ['Last 30 days', stats.last_30d]].map(([label, w]) => (
              <div key={label} className="card">
                <div style={{ color: '#64748b', fontSize: 12, marginBottom: 12 }}>{label}</div>
                <StatRow label="Uptime"       value={w.uptime_percent != null ? `${w.uptime_percent}%` : '—'} />
                <StatRow label="Avg Latency"  value={w.avg_latency_ms != null ? `${w.avg_latency_ms}ms` : '—'} />
                <StatRow label="p95 Latency"  value={w.p95_latency_ms != null ? `${w.p95_latency_ms}ms` : '—'} />
                <StatRow label="Total Checks" value={w.total_checks} />
                <StatRow label="Failed"       value={w.failed_checks} />
              </div>
            ))}
          </div>
        )}

        {pings.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Latency — last 50 pings</h2>
            <LatencyChart pings={pings} />
          </div>
        )}

        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Recent Pings</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '8px 0' }}>Status</th>
                <th style={{ padding: '8px 0' }}>Code</th>
                <th style={{ padding: '8px 0' }}>Latency</th>
                <th style={{ padding: '8px 0' }}>Time</th>
                <th style={{ padding: '8px 0' }}>Error</th>
              </tr>
            </thead>
            <tbody>
              {pings.map((p, i) => (
                <tr key={i} style={{ borderTop: '1px solid #334155' }}>
                  <td style={{ padding: '8px 0' }}><StatusBadge up={p.is_success} /></td>
                  <td style={{ padding: '8px 0' }}>{p.status_code || '—'}</td>
                  <td style={{ padding: '8px 0' }}>{p.latency_ms}ms</td>
                  <td style={{ padding: '8px 0', color: '#64748b' }}>{new Date(p.checked_at).toLocaleString()}</td>
                  <td style={{ padding: '8px 0', color: '#ef4444', fontSize: 12 }}>{p.error_msg || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StatRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
