import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { list, resolve } from '../api/incidents.api';

export default function IncidentsPage() {
  const [data, setData] = useState({ incidents: [], pagination: {} });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await list(page);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, [page]);

  const handleResolve = async (id) => {
    await resolve(id);
    fetchIncidents();
  };

  const typeColor = (type) => type === 'downtime' ? '#ef4444' : '#f59e0b';

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="page-header">
          <h1>Incidents</h1>
          <span style={{ color: '#64748b', fontSize: 14 }}>
            {data.pagination.total || 0} total
          </span>
        </div>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading…</p>
        ) : data.incidents.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: '#64748b' }}>No incidents — all systems operational.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.incidents.map((inc) => (
              <div key={inc.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 4, background: typeColor(inc.type) + '22',
                        color: typeColor(inc.type), textTransform: 'uppercase',
                      }}>{inc.type}</span>
                      <span style={{ fontWeight: 600 }}>{inc.monitor_name}</span>
                      {!inc.is_resolved && (
                        <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>● OPEN</span>
                      )}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 13 }}>{inc.description}</div>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                      Started: {new Date(inc.started_at).toLocaleString()}
                      {inc.resolved_at && ` · Resolved: ${new Date(inc.resolved_at).toLocaleString()}`}
                      {inc.duration_ms && ` · Duration: ${Math.round(inc.duration_ms / 1000)}s`}
                    </div>
                  </div>
                  {!inc.is_resolved && (
                    <button className="btn-ghost" onClick={() => handleResolve(inc.id)}
                      style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}>
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {data.pagination.pages > 1 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'center' }}>
            <button className="btn-ghost" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              Previous
            </button>
            <span style={{ lineHeight: '36px', color: '#64748b', fontSize: 14 }}>
              Page {page} of {data.pagination.pages}
            </span>
            <button className="btn-ghost" onClick={() => setPage(p => p + 1)} disabled={page === data.pagination.pages}>
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
