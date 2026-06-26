import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth.api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await register(form);
      localStorage.setItem('pingwatch_token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      const detail = err.response?.data?.details?.[0] || err.response?.data?.error || 'Registration failed';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Create account</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Start monitoring your APIs</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="text" placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="email" placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password" placeholder="Password (min 8 chars, upper + lower + number)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {error && <div className="error-msg">{error}</div>}
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
