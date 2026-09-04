const express = require('express');
const Company = require('../models/Company');
const { checkRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/company/me — returns the Admin's company (id + name + monthlyBudget)
router.get('/me', checkRole(['Admin']), async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch company', error: err.message });
  }
});

module.exports = router;
