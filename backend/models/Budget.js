const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    monthlyCap: { type: Number, required: true, min: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Budget', budgetSchema);
