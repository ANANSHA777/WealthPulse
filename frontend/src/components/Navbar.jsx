import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || '';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const roleBadge = role === 'Admin'
    ? { background: '#ede9fe', color: '#6d28d9', label: 'Admin' }
    : { background: '#e0e7ff', color: '#4338ca', label: 'Member' };

  return (
    <header style={S.header}>
      <div style={S.inner}>
        {/* Brand */}
        <div style={S.brand}>
          <div style={S.logoWrap}>
            <span style={S.logoChar}>W</span>
          </div>
          <div>
            <span style={S.brandName}>WealthPulse</span>
            <span style={S.brandTag}>Expense Intelligence</span>
          </div>
        </div>

        {/* User pill */}
        <div style={S.pill}>
          <div style={S.pillInfo}>
            <div style={S.pillAvatar}>{(user.name || 'U')[0].toUpperCase()}</div>
            <div style={S.pillText}>
              <span style={S.pillName}>{user.name || 'User'}</span>
              <div style={S.pillMeta}>
                <span style={{ ...S.roleBadge, background: roleBadge.background, color: roleBadge.color }}>
                  {roleBadge.label}
                </span>
                {user.company && (
                  <span style={S.companyTag}>
                    🏢 <span style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{String(user.company).slice(-6)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <button style={S.logoutBtn} onClick={handleLogout} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

const S = {
  header: {
    position: 'sticky', top: 0, zIndex: 40,
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(226,232,240,0.8)',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  inner: {
    maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem',
    height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logoWrap: {
    width: 38, height: 38, borderRadius: 10,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  logoChar: { color: '#fff', fontSize: 16, fontWeight: 800 },
  brandName: { display: 'block', fontWeight: 800, fontSize: '1.05rem', color: '#1e293b', lineHeight: 1.2 },
  brandTag: { display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500, letterSpacing: '0.03em' },
  pill: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 40, padding: '0.35rem 0.5rem 0.35rem 0.35rem',
  },
  pillInfo: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  pillAvatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', fontWeight: 700, fontSize: '0.875rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  pillText: { display: 'flex', flexDirection: 'column', gap: 2 },
  pillName: { fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', lineHeight: 1 },
  pillMeta: { display: 'flex', alignItems: 'center', gap: '0.35rem' },
  roleBadge: {
    fontSize: '0.65rem', fontWeight: 700, borderRadius: 99,
    padding: '0.1rem 0.45rem', letterSpacing: '0.03em',
  },
  companyTag: { fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.4rem 0.75rem', background: 'none',
    border: '1px solid #e2e8f0', borderRadius: 99,
    cursor: 'pointer', color: '#64748b', fontSize: '0.8rem', fontWeight: 600,
    transition: 'background 0.15s',
  },
};
