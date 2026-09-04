const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');

const router = express.Router();

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role, company: user.company },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const userPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  company: user.company,
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, companyName, companyId } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    let companyObjectId;

    if (role === 'Admin') {
      // Admin registers → create a new Company
      if (!companyName) {
        return res.status(400).json({ message: 'companyName is required for Admin registration' });
      }
      const company = await Company.create({ name: companyName });
      companyObjectId = company._id;
    } else {
      // Member registers → must supply an existing companyId to join
      if (!companyId) {
        return res.status(400).json({ message: 'companyId is required for Member registration' });
      }
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({ message: 'Invalid Company ID format. Copy it exactly from your Admin dashboard.' });
      }
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found. Check your Company ID.' });
      }
      companyObjectId = company._id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'Member',
      company: companyObjectId,
    });

    res.status(201).json({
      token: signToken(user),
      user: userPayload(user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Account exists but was created before multi-tenant migration
    if (!user.company) {
      return res.status(403).json({
        message: 'Your account was created before the multi-tenant update. Please register a new account.',
      });
    }

    res.json({
      token: signToken(user),
      user: userPayload(user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

module.exports = router;
