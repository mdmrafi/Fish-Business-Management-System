const express = require('express');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

const isAllItemsSelection = (name = '') => /^all items?$/i.test(name.trim());

// GET all sales (with optional date/product filter)
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

    const sales = await Sale.find(filter)
      .populate('items.product', 'name')
      .sort({ date: -1 });
    res.json(sales);
  } catch (error) {
    next(error);
  }
});

// GET single sale
router.get('/:id', auth, async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('items.product', 'name');
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json(sale);
  } catch (error) {
    next(error);
  }
});

// POST create sale — auto-creates new products if needed
router.post('/', auth, async (req, res, next) => {
  try {
    const { items, ...rest } = req.body;
    const resolvedItems = [];
    for (const item of items) {
      let productId = item.product || null;
      if (isAllItemsSelection(item.productName)) {
        productId = null;
      } else if (!productId && item.productName) {
        const escaped = item.productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let prod = await Product.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } });
        if (!prod) {
          prod = await Product.create({ name: item.productName.trim() });
        }
        productId = prod._id;
      }
      resolvedItems.push({ ...item, product: productId });
    }
    const sale = new Sale({ ...rest, items: resolvedItems });
    await sale.save();
    await sale.populate('items.product', 'name');
    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
});

// PUT update sale
router.put('/:id', auth, async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const { items, ...rest } = req.body;
    if (items) {
      const resolvedItems = [];
      for (const item of items) {
        let productId = item.product || null;
        if (isAllItemsSelection(item.productName)) {
          productId = null;
        } else if (!productId && item.productName) {
          const escaped = item.productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          let prod = await Product.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } });
          if (!prod) {
            prod = await Product.create({ name: item.productName.trim() });
          }
          productId = prod._id;
        }
        resolvedItems.push({ ...item, product: productId });
      }
      sale.items = resolvedItems;
    }
    Object.assign(sale, rest);
    await sale.save();
    await sale.populate('items.product', 'name');
    res.json(sale);
  } catch (error) {
    next(error);
  }
});

// DELETE sale
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json({ message: 'Sale deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
