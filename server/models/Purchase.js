const mongoose = require('mongoose');

const customExpenseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, default: 0 }
}, { _id: false });

const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  pricePerKg: { type: Number, required: true, min: 0 },
  freeKg: { type: Number, default: 0, min: 0 },
  itemTotal: { type: Number, default: 0 }
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  items: {
    type: [purchaseItemSchema],
    validate: [arr => arr.length > 0, 'At least one item is required']
  },
  carRent: { type: Number, default: 0, min: 0 },
  workerSalary: { type: Number, default: 0, min: 0 },
  iceCost: { type: Number, default: 0, min: 0 },
  customExpenses: [customExpenseSchema],
  totalExpense: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Auto-calculate totals before saving
purchaseSchema.pre('save', function(next) {
  let itemsTotal = 0;
  for (const item of this.items) {
    item.itemTotal = item.quantity * item.pricePerKg;
    itemsTotal += item.itemTotal;
  }
  const extras = (this.carRent || 0) + (this.workerSalary || 0) + (this.iceCost || 0);
  const customTotal = (this.customExpenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  this.totalExpense = itemsTotal + extras + customTotal;
  next();
});

module.exports = mongoose.model('Purchase', purchaseSchema);
