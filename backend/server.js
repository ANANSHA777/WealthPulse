require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const { verifyToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const expenseRoutes = require('./routes/expenses');
const companyRoutes = require('./routes/company');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://wealth-pulse-rust.vercel.app'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/company', verifyToken, companyRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 Fallback Handler (Debugging Unmatched Routes) ─────────────────────────
app.use((req, res) => {
  console.warn(`⚠️ 404 - Route Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found on server.` });
});

// ── Database + Server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

const isValidMongoURI =
  MONGODB_URI &&
  (MONGODB_URI.startsWith('mongodb://') || MONGODB_URI.startsWith('mongodb+srv://'));

if (!isValidMongoURI) {
  console.error(
    '\n❌  MONGODB_URI is missing or invalid in backend/.env\n' +
    '    Set it to a real connection string before starting:\n' +
    '    mongodb+srv://<user>:<pass>@cluster.mongodb.net/<dbname>\n'
  );
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅  Connected to MongoDB Atlas');
    app.listen(PORT, () => console.log(`🚀  Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });