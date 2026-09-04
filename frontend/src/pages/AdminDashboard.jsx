import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Navbar from '../components/Navbar';
import api from '../utils/api';

const MONTHLY_BUDGET = 100000;

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d) =>
  d ? new Date(d.toString().substring(0, 10) + 'T00:00:00').toLocaleDateString('en-IN') : '—';

const CATEGORY_COLORS = {
  Food: '#6366f1', Travel: '#8b5cf6', Shopping: '#f59e0b',
  Entertainment: '#ec4899', Health: '#10b981', Utilities: '#3b82f6', Other: '#94a3b8',
};

const STATUS_CONFIG = {
  Pending:  { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Approved: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
};

const getYearMonth = (d) => {
  if (!d) return null;
  const raw = d.toString().substring(0, 7);
  return /^\d{4}-\d{2}$/.test(raw) ? raw : null;
};

const MONTH_LABELS = {
  '01':'January','02':'February','03':'March','04':'April',
  '05':'May','06':'June','07':'July','08':'August',
  '09':'September','10':'October','11':'November','12':'December',
};
const fmtMonth = (ym) => { const [y, m] = ym.split('-'); return `${MONTH_LABELS[m] || m} ${y}`; };

export default function AdminDashboard() {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentYM);
  const [company, setCompany] = useState(null);
  const [copied, setCopied] = useState(false);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchExpenses = () =>
    api.get('/expenses/admin').then(({ data }) => {
      setExpenses(data);
      const months = [...new Set(data.map((e) => getYearMonth(e.date)).filter(Boolean))].sort().reverse();
      if (months.length > 0 && !months.includes(currentYM)) setSelectedMonth(months[0]);
    });

  useEffect(() => {
    api.get('/company/me').then(({ data }) => setCompany(data)).catch(() => {});
    fetchExpenses()
      .catch((err) => setError(err.response?.data?.message || 'Failed to load expenses'))
      .finally(() => setLoading(false));
  }, []);

  const handleCopyId = () => {
    if (!company) return;
    navigator.clipboard.writeText(company._id).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      const { data: updated } = await api.patch(`/expenses/${id}/status`, { status: 'Approved' });
      setExpenses((prev) => prev.map((e) => (e._id === id ? updated : e)));
    } catch (err) { alert(err.response?.data?.message || 'Failed to approve'); }
    finally { setActionLoading(false); }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) { setRejectError('Please enter a reason.'); return; }
    setActionLoading(true);
    try {
      const { data: updated } = await api.patch(`/expenses/${rejectTarget._id}/status`, {
        status: 'Rejected', rejectionReason: rejectReason.trim(),
      });
      setExpenses((prev) => prev.map((e) => (e._id === rejectTarget._id ? updated : e)));
      setRejectTarget(null); setRejectReason(''); setRejectError('');
    } catch (err) { setRejectError(err.response?.data?.message || 'Failed to reject'); }
    finally { setActionLoading(false); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const availableMonths = [...new Set(expenses.map((e) => getYearMonth(e.date)).filter(Boolean))].sort().reverse();
  const filteredExpenses = expenses.filter((e) => getYearMonth(e.date) === selectedMonth);
  const billable = filteredExpenses.filter((e) => e.status !== 'Rejected');
  const totalSpent = billable.reduce((sum, e) => sum + e.amount, 0);
  const remaining = MONTHLY_BUDGET - totalSpent;
  const progressPct = Math.min((totalSpent / MONTHLY_BUDGET) * 100, 100);
  const overBudget = totalSpent > MONTHLY_BUDGET;
  const pendingCount = filteredExpenses.filter((e) => !e.status || e.status === 'Pending').length;

  const categoryMap = {};
  billable.forEach((e) => { categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount; });
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const KPI = [
    { label: 'Total Spend', value: formatINR(totalSpent), icon: '₹', iconBg: '#eef2ff', iconColor: '#6366f1', sub: fmtMonth(selectedMonth) },
    { label: 'Budget Remaining', value: formatINR(Math.max(remaining, 0)), icon: '📊', iconBg: '#f0fdf4', iconColor: '#15803d', sub: overBudget ? '⚠️ Over budget' : 'Available' },
    { label: 'Active Receipts', value: filteredExpenses.length, icon: '🧾', iconBg: '#fffbeb', iconColor: '#b45309', sub: 'This month' },
    { label: 'Pending Approvals', value: pendingCount, icon: '⏳', iconBg: '#faf5ff', iconColor: '#7c3aed', sub: 'Needs action' },
  ];

  return (
    <div style={S.page}>
      <Navbar />

      {/* ── Reject modal ── */}
      {rejectTarget && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h3 style={S.modalTitle}>Reject Expense</h3>
            <p style={S.modalSub}><strong>{rejectTarget.merchant}</strong> — {formatINR(rejectTarget.amount)}</p>
            <textarea style={S.modalTA} placeholder="Enter rejection reason…" rows={3}
              value={rejectReason} onChange={(e) => { setRejectReason(e.target.value); setRejectError(''); }} />
            {rejectError && <p style={S.rejectErr}>{rejectError}</p>}
            <div style={S.modalBtns}>
              <button style={S.cancelBtn} onClick={() => { setRejectTarget(null); setRejectReason(''); setRejectError(''); }}>Cancel</button>
              <button style={S.confirmBtn} onClick={handleRejectSubmit} disabled={actionLoading}>
                {actionLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={S.main}>
        {/* Over-budget banner */}
        {!loading && overBudget && (
          <div style={S.overBudgetBanner}>
            <span style={S.bannerIcon}>⚠️</span>
            <div>
              <strong>Monthly Budget Cap Exceeded!</strong>
              <span style={S.bannerDetail}> You are {formatINR(totalSpent - MONTHLY_BUDGET)} over the {formatINR(MONTHLY_BUDGET)} cap for {fmtMonth(selectedMonth)}.</span>
            </div>
          </div>
        )}

        {/* Company ID banner */}
        {company && (
          <div style={S.companyBanner}>
            <div style={S.companyBannerLeft}>
              <span style={S.companyIcon}>🏢</span>
              <div>
                <p style={S.companyName}>{company.name}</p>
                <p style={S.companyHint}>Share your Company ID with team members so they can join</p>
              </div>
            </div>
            <div style={S.companyIdWrap}>
              <code style={S.companyIdCode}>{company._id}</code>
              <button style={S.copyBtn} onClick={handleCopyId}>{copied ? '✅ Copied!' : 'Copy ID'}</button>
            </div>
          </div>
        )}

        {loading && <p style={S.muted}>Loading data…</p>}
        {error && <div style={S.errorBox}><span>⚠️</span><span>{error}</span></div>}

        {!loading && (
          <>
            {/* KPI Cards */}
            <div style={S.kpiGrid}>
              {KPI.map((k) => (
                <div key={k.label} style={S.kpiCard}>
                  <div style={{ ...S.kpiIcon, background: k.iconBg }}>
                    <span style={{ fontSize: 20 }}>{k.icon}</span>
                  </div>
                  <div>
                    <p style={S.kpiLabel}>{k.label}</p>
                    <p style={S.kpiValue}>{k.value}</p>
                    <p style={S.kpiSub}>{k.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Month selector */}
            <div style={S.filterRow}>
              <label style={S.filterLabel}>Viewing:</label>
              <select style={S.filterSelect} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {availableMonths.length === 0
                  ? <option value={currentYM}>{fmtMonth(currentYM)}</option>
                  : availableMonths.map((ym) => <option key={ym} value={ym}>{fmtMonth(ym)}</option>)}
              </select>
            </div>

            {/* Budget progress */}
            <div style={S.card}>
              <div style={S.cardHead}>
                <div>
                  <h2 style={S.cardTitle}>Budget — {fmtMonth(selectedMonth)}</h2>
                  <p style={S.cardSub}>Rejected expenses are excluded from the calculation</p>
                </div>
                <span style={{ ...S.pctPill, background: overBudget ? '#fef2f2' : '#f0fdf4', color: overBudget ? '#b91c1c' : '#15803d' }}>
                  {progressPct.toFixed(1)}%
                </span>
              </div>
              <div style={S.progressTrack}>
                <div style={{ ...S.progressFill, width: `${progressPct}%`, background: overBudget ? '#dc2626' : '#6366f1' }} />
              </div>
              <div style={S.progressLabels}>
                <span>{formatINR(totalSpent)} spent</span>
                <span style={{ color: '#94a3b8' }}>of {formatINR(MONTHLY_BUDGET)}</span>
              </div>
            </div>

            {/* Pie chart */}
            <div style={S.card}>
              <h2 style={S.cardTitle}>Spending by Category — {fmtMonth(selectedMonth)}</h2>
              <p style={S.cardSub}>Excludes rejected expenses</p>
              {pieData.length === 0 ? (
                <div style={S.emptyState}><p style={S.emptyTitle}>No data for this period</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={75} outerRadius={115} paddingAngle={3} dataKey="value">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatINR(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Receipts table */}
            <div style={S.card}>
              <div style={S.cardHead}>
                <div>
                  <h2 style={S.cardTitle}>Recent Receipts</h2>
                  <p style={S.cardSub}>{filteredExpenses.length} receipts · {pendingCount} pending approval</p>
                </div>
              </div>
              {filteredExpenses.length === 0 ? (
                <div style={S.emptyState}><p style={S.emptyTitle}>No receipts for this period</p></div>
              ) : (
                <div style={S.tableWrapper}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['Date', 'Merchant', 'Category', 'Amount', 'Logged By', 'Status', 'Actions'].map((h) => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.slice(0, 50).map((e) => {
                        const st = STATUS_CONFIG[e.status] || STATUS_CONFIG.Pending;
                        const isPending = !e.status || e.status === 'Pending';
                        return (
                          <tr key={e._id} style={S.tr}>
                            <td style={S.td}><span style={S.dateText}>{fmtDate(e.date)}</span></td>
                            <td style={S.td}><span style={S.merchantText}>{e.merchant}</span></td>
                            <td style={S.td}><span style={S.catBadge}>{e.category}</span></td>
                            <td style={{ ...S.td, fontWeight: 700, color: '#1e293b' }}>{formatINR(e.amount)}</td>
                            <td style={S.td}><span style={S.memberName}>{e.userId?.name || e.userId?.email || '—'}</span></td>
                            <td style={S.td}>
                              <span style={{ ...S.statusBadge, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                                {e.status || 'Pending'}
                              </span>
                            </td>
                            <td style={S.td}>
                              {isPending && (
                                <div style={S.actionBtns}>
                                  <button style={S.approveBtn} onClick={() => handleApprove(e._id)} disabled={actionLoading}>✓ Approve</button>
                                  <button style={S.rejectBtn} onClick={() => { setRejectTarget(e); setRejectReason(''); setRejectError(''); }} disabled={actionLoading}>✕ Reject</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" },
  main: { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },

  // Banners
  overBudgetBanner: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14,
    padding: '1rem 1.25rem', color: '#991b1b', fontSize: '0.9rem',
  },
  bannerIcon: { fontSize: 20, flexShrink: 0 },
  bannerDetail: { color: '#b91c1c' },
  companyBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
    background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 14, padding: '1rem 1.25rem',
  },
  companyBannerLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  companyIcon: { fontSize: 22 },
  companyName: { fontWeight: 700, color: '#3730a3', fontSize: '0.95rem', margin: '0 0 0.1rem' },
  companyHint: { fontSize: '0.78rem', color: '#6366f1', margin: 0 },
  companyIdWrap: { display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' },
  companyIdCode: { fontFamily: 'monospace', fontSize: '0.8rem', background: '#e0e7ff', padding: '0.3rem 0.65rem', borderRadius: 8, color: '#3730a3', wordBreak: 'break-all' },
  copyBtn: { padding: '0.4rem 0.9rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },

  // KPI
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' },
  kpiCard: {
    display: 'flex', alignItems: 'center', gap: '0.9rem',
    background: '#fff', borderRadius: 16, border: '1px solid rgba(226,232,240,0.8)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '1.1rem 1.25rem',
  },
  kpiIcon: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  kpiLabel: { fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.2rem' },
  kpiValue: { fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.1rem' },
  kpiSub: { fontSize: '0.75rem', color: '#94a3b8', margin: 0 },

  // Card
  card: { background: '#fff', borderRadius: 18, border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: '1.5rem' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
  cardTitle: { fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.15rem' },
  cardSub: { fontSize: '0.78rem', color: '#94a3b8', margin: 0 },
  pctPill: { padding: '0.25rem 0.75rem', borderRadius: 99, fontWeight: 800, fontSize: '0.875rem' },

  // Progress
  progressTrack: { height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', margin: '0.5rem 0' },
  progressFill: { height: '100%', borderRadius: 99, transition: 'width 0.4s ease' },
  progressLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569', fontWeight: 600 },

  // Filter
  filterRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  filterLabel: { fontSize: '0.85rem', fontWeight: 600, color: '#475569' },
  filterSelect: { padding: '0.5rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.875rem', background: '#fff', color: '#1e293b', cursor: 'pointer', outline: 'none' },

  // Table
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th: { textAlign: 'left', padding: '0.6rem 0.85rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f8fafc' },
  td: { padding: '0.75rem 0.85rem', color: '#334155', verticalAlign: 'middle' },
  dateText: { fontSize: '0.85rem', color: '#64748b' },
  merchantText: { fontWeight: 600, color: '#1e293b' },
  catBadge: { display: 'inline-block', padding: '0.2rem 0.6rem', background: '#f1f5f9', color: '#475569', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 },
  memberName: { fontSize: '0.85rem', color: '#64748b' },
  statusBadge: { display: 'inline-block', padding: '0.22rem 0.65rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700 },
  actionBtns: { display: 'flex', gap: '0.4rem' },
  approveBtn: { padding: '0.28rem 0.7rem', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  rejectBtn: { padding: '0.28rem 0.7rem', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },

  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 20, padding: '1.75rem', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem' },
  modalSub: { fontSize: '0.875rem', color: '#64748b', marginBottom: '1.1rem' },
  modalTA: { width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: '0.9rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
  rejectErr: { color: '#dc2626', fontSize: '0.8rem', margin: '0.4rem 0 0' },
  modalBtns: { display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem' },
  cancelBtn: { padding: '0.55rem 1.1rem', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: '#475569' },
  confirmBtn: { padding: '0.55rem 1.1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' },

  // Misc
  errorBox: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#dc2626' },
  emptyState: { textAlign: 'center', padding: '2.5rem 1rem' },
  emptyTitle: { fontWeight: 700, color: '#94a3b8', fontSize: '0.95rem', margin: 0 },
  muted: { color: '#94a3b8', fontSize: '0.875rem' },
};
