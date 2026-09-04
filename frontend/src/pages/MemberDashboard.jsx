import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../utils/api';

const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Entertainment', 'Health', 'Utilities', 'Other'];

const STATUS_CONFIG = {
  Pending:  { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Pending' },
  Approved: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Approved' },
  Rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Rejected' },
};

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d) =>
  d ? new Date(d.toString().substring(0, 10) + 'T00:00:00').toLocaleDateString('en-IN') : '—';

export default function MemberDashboard() {
  const fileInputRef = useRef(null);

  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scanError, setScanError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [preview, setPreview] = useState(null);
  const [myExpenses, setMyExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [form, setForm] = useState({
    merchant: '', amount: '', category: 'Food',
    date: new Date().toISOString().split('T')[0],
  });

  const fetchMyExpenses = () => {
    setLoadingExpenses(true);
    api.get('/expenses')
      .then(({ data }) => setMyExpenses(data))
      .catch(() => {})
      .finally(() => setLoadingExpenses(false));
  };
  useEffect(() => { fetchMyExpenses(); }, []);

  const readAndScan = (file) => {
    setSaved(false); setScanError(''); setSaveError('');
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setPreview(dataUrl);
      setScanning(true);
      try {
        const { data } = await api.post('/ai/scan-receipt', {
          imageBase64: dataUrl.split(',')[1],
          mimeType: file.type,
        });
        setForm({
          merchant: data.merchant || '',
          amount: data.amount ?? '',
          category: CATEGORIES.includes(data.category) ? data.category : 'Other',
          date: data.date ? data.date.split('T')[0] : new Date().toISOString().split('T')[0],
        });
      } catch (err) {
        setScanError(err.response?.data?.message || 'Receipt scan failed');
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError(''); setSaving(true);
    try {
      await api.post('/expenses', {
        merchant: form.merchant, amount: Number(form.amount),
        category: form.category, date: form.date,
      });
      setSaved(true);
      setForm({ merchant: '', amount: '', category: 'Food', date: new Date().toISOString().split('T')[0] });
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchMyExpenses();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.page}>
      <Navbar />

      <main style={S.main}>
        <h1 style={S.pageTitle}>Log a Receipt</h1>
        <p style={S.pageSubtitle}>Upload a receipt image and let AI extract the details for you.</p>

        <div style={S.twoCol}>
          {/* ── Left: Upload + scan ── */}
          <div style={S.card}>
            <h2 style={S.cardTitle}>AI Receipt Scanner</h2>
            <p style={S.cardSub}>Drag & drop or click to upload</p>

            {/* Drop zone */}
            <div
              style={{ ...S.dropzone, ...(scanning ? S.dropzoneScanning : {}) }}
              onClick={() => !scanning && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) readAndScan(f); }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files[0]; if (f) readAndScan(f); }} />
              {preview ? (
                <img src={preview} alt="Receipt" style={S.previewImg} />
              ) : (
                <div style={S.dropzoneContent}>
                  <div style={S.dropzoneIcon}>
                    {scanning ? <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={28} color="#818cf8" />}
                  </div>
                  <p style={S.dropzoneTitle}>{scanning ? 'Scanning with Gemini AI…' : 'Drop receipt here'}</p>
                  <p style={S.dropzoneHint}>{scanning ? 'Extracting merchant, amount, category & date' : 'Supports JPG, PNG, HEIC · Click to browse'}</p>
                </div>
              )}
            </div>

            {scanning && (
              <div style={S.scanningBar}>
                <div style={S.scanningPulse} />
                <span style={S.scanningText}>Gemini AI is reading your receipt…</span>
              </div>
            )}
            {scanError && <div style={S.errorBox}><span>⚠️</span><span>{scanError}</span></div>}
          </div>

          {/* ── Right: Expense form ── */}
          <div style={S.card}>
            <h2 style={S.cardTitle}>Expense Details</h2>
            <p style={S.cardSub}>Review and edit before saving</p>

            <form onSubmit={handleSave} style={S.form}>
              <div style={S.field}>
                <label style={S.label}>Merchant</label>
                <input style={S.input} name="merchant" value={form.merchant}
                  onChange={(e) => setForm({ ...form, merchant: e.target.value })}
                  placeholder="e.g. Swiggy, Amazon" required />
              </div>

              <div style={S.field}>
                <label style={S.label}>Amount (₹)</label>
                <input style={S.input} name="amount" type="number" min="0" step="0.01"
                  value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0" required />
              </div>

              <div style={S.twoFields}>
                <div style={S.field}>
                  <label style={S.label}>Category</label>
                  <select style={S.select} value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Date</label>
                  <input style={S.input} type="date" value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>

              {saveError && <div style={S.errorBox}><span>⚠️</span><span>{saveError}</span></div>}

              {saved && (
                <div style={S.successBox}>
                  <CheckCircle size={16} color="#15803d" />
                  <span>Expense saved successfully!</span>
                </div>
              )}

              <button style={{ ...S.submitBtn, opacity: saving || scanning ? 0.7 : 1 }}
                type="submit" disabled={saving || scanning}>
                {saving ? 'Saving…' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>

        {/* ── My Expenses ── */}
        <div style={S.card}>
          <div style={S.tableHeader}>
            <div>
              <h2 style={S.cardTitle}>My Expenses</h2>
              <p style={S.cardSub}>{myExpenses.length} total receipts logged</p>
            </div>
          </div>

          {loadingExpenses ? (
            <p style={S.muted}>Loading your expenses…</p>
          ) : myExpenses.length === 0 ? (
            <div style={S.emptyState}>
              <p style={S.emptyTitle}>No expenses yet</p>
              <p style={S.emptyHint}>Upload your first receipt above to get started.</p>
            </div>
          ) : (
            <div style={S.tableWrapper}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Date', 'Merchant', 'Category', 'Amount', 'Status'].map((h) => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myExpenses.map((e) => {
                    const st = STATUS_CONFIG[e.status] || STATUS_CONFIG.Pending;
                    return (
                      <tr key={e._id} style={S.tr}>
                        <td style={S.td}><span style={S.dateText}>{fmtDate(e.date)}</span></td>
                        <td style={S.td}><span style={S.merchantText}>{e.merchant}</span></td>
                        <td style={S.td}><span style={S.catBadge}>{e.category}</span></td>
                        <td style={{ ...S.td, fontWeight: 700, color: '#1e293b' }}>{formatINR(e.amount)}</td>
                        <td style={{ ...S.td, verticalAlign: 'top' }}>
                          <span style={{ ...S.statusBadge, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                            {st.label}
                          </span>
                          {e.status === 'Rejected' && e.rejectionReason && (
                            <p style={S.rejectionNote}>{e.rejectionReason}</p>
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
      </main>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" },
  main: { maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 },
  pageSubtitle: { fontSize: '0.9rem', color: '#64748b', margin: '0.25rem 0 0' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },
  card: { background: '#fff', borderRadius: 18, border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: '1.5rem' },
  cardTitle: { fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.15rem' },
  cardSub: { fontSize: '0.825rem', color: '#94a3b8', margin: '0 0 1.25rem' },
  dropzone: {
    border: '2px dashed #c7d2fe', borderRadius: 14, padding: '2rem 1.5rem',
    background: 'rgba(238,242,255,0.3)', cursor: 'pointer', textAlign: 'center',
    transition: 'all 0.2s', minHeight: 160,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dropzoneScanning: { border: '2px dashed #6366f1', background: 'rgba(238,242,255,0.7)' },
  dropzoneContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' },
  dropzoneIcon: {
    width: 52, height: 52, borderRadius: 14, background: '#eef2ff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dropzoneTitle: { fontWeight: 600, color: '#4338ca', fontSize: '0.95rem', margin: 0 },
  dropzoneHint: { fontSize: '0.78rem', color: '#94a3b8', margin: 0 },
  previewImg: { maxWidth: '100%', maxHeight: 160, borderRadius: 10, objectFit: 'contain' },
  scanningBar: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    marginTop: '0.75rem', padding: '0.5rem 0.75rem',
    background: '#eef2ff', borderRadius: 8,
  },
  scanningPulse: {
    width: 8, height: 8, borderRadius: '50%', background: '#6366f1',
    animation: 'pulse 1.2s infinite',
  },
  scanningText: { fontSize: '0.825rem', color: '#4338ca', fontWeight: 500 },
  form: { display: 'flex', flexDirection: 'column', gap: '0.9rem' },
  field: { display: 'flex', flexDirection: 'column' },
  twoFields: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' },
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' },
  input: {
    padding: '0.65rem 0.9rem', borderRadius: 10, border: '1.5px solid #e2e8f0',
    fontSize: '0.9rem', color: '#1e293b', background: '#fafafa', outline: 'none', boxSizing: 'border-box',
  },
  select: {
    padding: '0.65rem 0.9rem', borderRadius: 10, border: '1.5px solid #e2e8f0',
    fontSize: '0.9rem', color: '#1e293b', background: '#fafafa', outline: 'none', boxSizing: 'border-box',
  },
  submitBtn: {
    padding: '0.75rem', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginTop: '0.25rem',
    boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
  },
  successBox: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
    padding: '0.6rem 0.85rem', fontSize: '0.875rem', color: '#15803d', fontWeight: 500,
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
    padding: '0.6rem 0.85rem', fontSize: '0.875rem', color: '#dc2626',
  },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th: {
    textAlign: 'left', padding: '0.6rem 0.85rem',
    fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid #f8fafc', transition: 'background 0.1s' },
  td: { padding: '0.75rem 0.85rem', color: '#334155', verticalAlign: 'middle' },
  dateText: { fontSize: '0.85rem', color: '#64748b' },
  merchantText: { fontWeight: 600, color: '#1e293b' },
  catBadge: {
    display: 'inline-block', padding: '0.2rem 0.6rem',
    background: '#f1f5f9', color: '#475569',
    borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
  },
  statusBadge: {
    display: 'inline-block', padding: '0.22rem 0.65rem',
    borderRadius: 99, fontSize: '0.75rem', fontWeight: 700,
  },
  rejectionNote: { margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#b91c1c', fontStyle: 'italic' },
  emptyState: { textAlign: 'center', padding: '2.5rem 1rem' },
  emptyTitle: { fontWeight: 700, color: '#475569', fontSize: '0.95rem', margin: '0 0 0.35rem' },
  emptyHint: { fontSize: '0.825rem', color: '#94a3b8', margin: 0 },
  muted: { color: '#94a3b8', fontSize: '0.875rem' },
};
