const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true, trim: true },
  quantitySold: { type: Number, required: true, min: 0 },
  pricePerKg: { type: Number, required: true, min: 0 },
  commission: { type: Number, default: 0, min: 0 },
  itemTotal: { type: Number, default: 0 }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  items: {
    type: [saleItemSchema],
    validate: [arr => arr.length > 0, 'At least one item is required']
  },
  purchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase'
  },
  purchaseCost: {
    type: Number,
    default: 0
  },
  totalSale: {
    type: Number,
    default: 0
  },
  profitLoss: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Auto-calculate totalSale and profitLoss before saving
saleSchema.pre('save', function(next) {
  let total = 0;
  for (const item of this.items) {
    item.itemTotal = (item.quantitySold * item.pricePerKg) - (item.commission || 0);
    total += item.itemTotal;
  }
  this.totalSale = total;
  this.profitLoss = this.totalSale - (this.purchaseCost || 0);
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
