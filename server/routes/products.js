const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// GET all products
router.get('/', auth, async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ name: 1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// POST create product
router.post('/', auth, async (req, res, next) => {
  try {
    const { name, category } = req.body;
    if (!name) return res.status(400).json({ message: 'Product name is required' });
    
    const product = new Product({ name, category });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// PUT update product
router.put('/:id', auth, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name, category: req.body.category },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// DELETE product (soft delete)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
