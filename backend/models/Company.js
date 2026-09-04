const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    monthlyBudget: { type: Number, default: 100000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
