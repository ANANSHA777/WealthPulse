const express = require('express');
const Expense = require('../models/Expense');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// All expense routes require authentication
router.use(verifyToken);

// Guard: all expense routes require a company in the token (re-login if missing)
router.use((req, res, next) => {
  if (!req.user.company) {
    return res.status(401).json({ message: 'Session expired: please log out and log in again to refresh your token.' });
  }
  next();
});

// GET /api/expenses — Member: own expenses scoped to their company
router.get('/', async (req, res) => {
  try {
    const expenses = await Expense.find({
      userId: req.user.id,
      company: req.user.company,
    })
      .populate('userId', 'name email')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch expenses', error: err.message });
  }
});

// GET /api/expenses/admin — Admin: all expenses for their company only
router.get('/admin', checkRole(['Admin']), async (req, res) => {
  try {
    const expenses = await Expense.find({ company: req.user.company })
      .populate('userId', 'name email')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch expenses', error: err.message });
  }
});

// PATCH /api/expenses/:id/status — Admin: approve or reject an expense
router.patch('/:id/status', checkRole(['Admin']), async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: "status must be 'Approved' or 'Rejected'" });
    }
    if (status === 'Rejected' && !rejectionReason?.trim()) {
      return res.status(400).json({ message: 'rejectionReason is required when rejecting an expense' });
    }

    // Company-scoped: Admin can only update expenses that belong to their company
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      {
        status,
        rejectionReason: status === 'Rejected' ? rejectionReason.trim() : '',
      },
      { new: true }
    ).populate('userId', 'name email');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update expense status', error: err.message });
  }
});

// POST /api/expenses — create a new expense, stamped with user's company
router.post('/', async (req, res) => {
  try {
    const { merchant, amount, category, date } = req.body;

    const expense = await Expense.create({
      merchant,
      amount,
      category,
      date: date || Date.now(),
      userId: req.user.id,
      company: req.user.company,
    });

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create expense', error: err.message });
  }
});

module.exports = router;
