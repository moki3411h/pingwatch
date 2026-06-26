import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth.api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await login(form);
      localStorage.setItem('pingwatch_token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>PingWatch</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Sign in to your account</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email" placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password" placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {error && <div className="error-msg">{error}</div>}
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            No account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
