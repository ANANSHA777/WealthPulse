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
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/company', verifyToken, companyRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

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
    app.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
