import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const S = {
  page: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f8fafc',
    padding: '1.5rem 1rem',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  containerLogin: { width: '100%', maxWidth: 480 },
  containerRegister: { width: '100%', maxWidth: 560 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' },
  brand: { display: 'flex', alignItems: 'center', gap: '0.65rem', justifyContent: 'center', marginBottom: '1.25rem' },
  logoWrap: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoChar: { color: '#fff', fontSize: 15, fontWeight: 800 },
  brandText: { display: 'flex', flexDirection: 'column' },
  brandName: { fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.2, margin: 0 },
  brandSub: { fontSize: '0.7rem', color: '#94a3b8', margin: 0 },
  card: {
    background: '#fff',
    borderRadius: 18,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    padding: '1.5rem',
  },
  tabs: {
    display: 'flex', background: '#f1f5f9', borderRadius: 10,
    padding: 3, marginBottom: '1.25rem',
  },
  tab: {
    flex: 1, padding: '0.45rem', border: 'none', borderRadius: 8,
    background: 'none', cursor: 'pointer', fontWeight: 600,
    fontSize: '0.825rem', color: '#64748b',
  },
  tabActive: { background: '#fff', color: '#6366f1', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  fields: { display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '0.75rem' },
  label: { display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: {
    width: '100%', padding: '0.55rem 0.8rem', borderRadius: 9,
    border: '1.5px solid #e2e8f0', fontSize: '0.875rem', color: '#1e293b',
    background: '#fafafa', outline: 'none', boxSizing: 'border-box',
  },
  select: {
    width: '100%', padding: '0.55rem 0.8rem', borderRadius: 9,
    border: '1.5px solid #e2e8f0', fontSize: '0.875rem', color: '#1e293b',
    background: '#fafafa', outline: 'none', boxSizing: 'border-box',
  },
  hint: { fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.2rem' },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
    padding: '0.5rem 0.7rem', marginBottom: '0.6rem',
    fontSize: '0.8rem', color: '#dc2626',
  },
  btn: {
    width: '100%', padding: '0.65rem', borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', fontWeight: 700, fontSize: '0.875rem',
    cursor: 'pointer', boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
  },
};

export default function AuthPage({ defaultTab = 'login' }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(defaultTab);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'Member', companyName: '', companyId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchTab = (t) => { setTab(t); setError(''); };
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
      let payload;
      if (tab === 'login') {
        payload = { email: form.email, password: form.password };
      } else if (form.role === 'Admin') {
        payload = { name: form.name, email: form.email, password: form.password, role: 'Admin', companyName: form.companyName };
      } else {
        payload = { name: form.name, email: form.email, password: form.password, role: 'Member', companyId: form.companyId };
      }
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate(data.user.role === 'Admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isRegister = tab === 'register';

  return (
    <div style={S.page}>
      <div style={isRegister ? S.containerRegister : S.containerLogin}>
        {/* Brand */}
        <div style={S.brand}>
          <div style={S.logoWrap}><span style={S.logoChar}>W</span></div>
          <div style={S.brandText}>
            <p style={S.brandName}>WealthPulse</p>
            <p style={S.brandSub}>Smart expense management</p>
          </div>
        </div>

        <div style={S.card}>
          {/* Tab toggle */}
          <div style={S.tabs}>
            <button style={{ ...S.tab, ...(tab === 'login' ? S.tabActive : {}) }} onClick={() => switchTab('login')}>
              Sign In
            </button>
            <button style={{ ...S.tab, ...(tab === 'register' ? S.tabActive : {}) }} onClick={() => switchTab('register')}>
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={S.fields}>
              {/* ── Register-only: Name + Email in 2-column grid ── */}
              {isRegister ? (
                <>
                  <div style={S.twoCol}>
                    <div>
                      <label style={S.label}>Full Name</label>
                      <input style={S.input} name="name" placeholder="Anan Sharma" value={form.name} onChange={handleChange} required />
                    </div>
                    <div>
                      <label style={S.label}>Email Address</label>
                      <input style={S.input} name="email" type="email" placeholder="you@company.com" value={form.email} onChange={handleChange} required />
                    </div>
                  </div>

                  <div>
                    <label style={S.label}>Password</label>
                    <input style={S.input} name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
                  </div>

                  <div>
                    <label style={S.label}>Role</label>
                    <select style={S.select} name="role" value={form.role} onChange={handleChange}>
                      <option value="Member">Member — join an existing company</option>
                      <option value="Admin">Admin — create a new company</option>
                    </select>
                  </div>

                  {form.role === 'Admin' && (
                    <div>
                      <label style={S.label}>Company Name</label>
                      <input style={S.input} name="companyName" placeholder="e.g. Acme Technologies" value={form.companyName} onChange={handleChange} required />
                      <span style={S.hint}>A Company ID will be generated — share it with your team.</span>
                    </div>
                  )}

                  {form.role === 'Member' && (
                    <div>
                      <label style={S.label}>Company ID</label>
                      <input style={S.input} name="companyId" placeholder="Paste the ID from your Admin" value={form.companyId} onChange={handleChange} required />
                      <span style={S.hint}>Ask your Admin to copy it from their dashboard.</span>
                    </div>
                  )}
                </>
              ) : (
                /* ── Login-only: single column, untouched ── */
                <>
                  <div>
                    <label style={S.label}>Email Address</label>
                    <input style={S.input} name="email" type="email" placeholder="you@company.com" value={form.email} onChange={handleChange} required />
                  </div>
                  <div>
                    <label style={S.label}>Password</label>
                    <input style={S.input} name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
                  </div>
                </>
              )}
            </div>

            {error && (
              <div style={S.errorBox}>
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            <button style={{ ...S.btn, opacity: loading ? 0.75 : 1 }} type="submit" disabled={loading}>
              {loading ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
