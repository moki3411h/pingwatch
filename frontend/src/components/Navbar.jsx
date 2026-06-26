import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('pingwatch_token');
    navigate('/login');
  };

  return (
    <nav style={{
      background: '#1e293b',
      borderBottom: '1px solid #334155',
      padding: '0 24px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Link to="/dashboard" style={{ color: '#6366f1', fontWeight: 700, fontSize: '18px' }}>
        PingWatch
      </Link>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link to="/dashboard" style={{ color: '#94a3b8', fontSize: '14px' }}>Dashboard</Link>
        <Link to="/incidents" style={{ color: '#94a3b8', fontSize: '14px' }}>Incidents</Link>
        <button className="btn-ghost" onClick={logout} style={{ padding: '6px 14px', fontSize: '13px' }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
