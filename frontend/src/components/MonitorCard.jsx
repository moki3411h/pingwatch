import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function MonitorCard({ monitor }) {
  const navigate = useNavigate();

  return (
    <div
      className="card"
      onClick={() => navigate(`/monitors/${monitor.id}`)}
      style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6366f1'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#334155'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{monitor.name}</div>
          <div style={{ color: '#64748b', fontSize: 13 }}>{monitor.url}</div>
        </div>
        <StatusBadge up={monitor.last_status !== false} />
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
        <Stat label="Uptime" value={monitor.uptime_percent ? `${monitor.uptime_percent}%` : '—'} />
        <Stat label="Last Latency" value={monitor.last_latency_ms ? `${monitor.last_latency_ms}ms` : '—'} />
        <Stat label="Interval" value={`${monitor.interval_seconds}s`} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
    </div>
  );
}
