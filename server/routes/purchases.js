const express = require('express');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// GET all purchases (with optional date filter)
router.get('/', auth, async (req, res, next) => {
  try {
    const { date, startDate, endDate, product } = req.query;
    let filter = {};

    if (date) {
      const d = new Date(date);
      filter.date = {
        $gte: new Date(d.setHours(0, 0, 0, 0)),
        $lte: new Date(d.setHours(23, 59, 59, 999))
      };
    } else if (startDate && endDate) {
      filter.date = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    if (product) {
      filter['items.productName'] = { $regex: product, $options: 'i' };
    }

    const purchases = await Purchase.find(filter)
      .populate('items.product', 'name')
      .sort({ date: -1 });
    res.json(purchases);
  } catch (error) {
    next(error);
  }
});

// GET single purchase
router.get('/:id', auth, async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate('items.product', 'name');
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json(purchase);
  } catch (error) {
    next(error);
  }
});

// POST create purchase — auto-creates new products if needed
router.post('/', auth, async (req, res, next) => {
  try {
    const { items, ...rest } = req.body;
    const resolvedItems = [];
    for (const item of items) {
      let productId = item.product || null;
      if (!productId && item.productName) {
        const escaped = item.productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let prod = await Product.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } });
        if (!prod) {
          prod = await Product.create({ name: item.productName.trim() });
        }
        productId = prod._id;
      }
      resolvedItems.push({ ...item, product: productId });
    }
    const purchase = new Purchase({ ...rest, items: resolvedItems });
    await purchase.save();
    await purchase.populate('items.product', 'name');
    res.status(201).json(purchase);
  } catch (error) {
    next(error);
  }
});

// PUT update purchase
router.put('/:id', auth, async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const { items, ...rest } = req.body;
    if (items) {
      const resolvedItems = [];
      for (const item of items) {
        let productId = item.product || null;
        if (!productId && item.productName) {
          const escaped = item.productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          let prod = await Product.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } });
          if (!prod) {
            prod = await Product.create({ name: item.productName.trim() });
          }
          productId = prod._id;
        }
        resolvedItems.push({ ...item, product: productId });
      }
      purchase.items = resolvedItems;
    }
    Object.assign(purchase, rest);
    await purchase.save();
    await purchase.populate('items.product', 'name');
    res.json(purchase);
  } catch (error) {
    next(error);
  }
});

// DELETE purchase
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const purchase = await Purchase.findByIdAndDelete(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json({ message: 'Purchase deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
