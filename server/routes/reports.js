const express = require('express');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const auth = require('../middleware/auth');

const router = express.Router();

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const purchaseExtraTotal = (purchase) => (
  toNumber(purchase?.carRent) +
  toNumber(purchase?.workerSalary) +
  toNumber(purchase?.iceCost) +
  (purchase?.customExpenses || []).reduce((sum, e) => sum + toNumber(e?.amount), 0)
);

// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', auth, async (req, res, next) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const dateFilter = { date: { $gte: startOfDay, $lte: endOfDay } };

    const purchases = await Purchase.find(dateFilter).populate('items.product', 'name');
    const sales = await Sale.find(dateFilter).populate('items.product', 'name');

    const totalPurchase = purchases.reduce((sum, p) => sum + toNumber(p.totalExpense), 0);
    const totalSales = sales.reduce((sum, s) => sum + toNumber(s.totalSale), 0);

    const totalExpenses = purchases.reduce((sum, p) => sum + purchaseExtraTotal(p), 0);

    const totalProfitLoss = sales.reduce((sum, s) => sum + toNumber(s.profitLoss), 0);

    res.json({
      date: dateStr,
      totalPurchase,
      totalSales,
      totalExpenses,
      totalProfitLoss,
      netProfitLoss: totalSales - totalPurchase,
      purchaseCount: purchases.length,
      salesCount: sales.length,
      purchases,
      sales
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/monthly?month=MM&year=YYYY
router.get('/monthly', auth, async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const dateFilter = { date: { $gte: startOfMonth, $lte: endOfMonth } };

    const purchases = await Purchase.find(dateFilter);
    const sales = await Sale.find(dateFilter);

    const totalPurchase = purchases.reduce((sum, p) => sum + toNumber(p.totalExpense), 0);
    const totalSales = sales.reduce((sum, s) => sum + toNumber(s.totalSale), 0);
    const totalExpenses = purchases.reduce((sum, p) => sum + purchaseExtraTotal(p), 0);

    // Daily breakdown
    const dailyData = {};
    purchases.forEach(p => {
      const day = p.date.toISOString().split('T')[0];
      if (!dailyData[day]) dailyData[day] = { date: day, purchases: 0, sales: 0, expenses: 0 };
      dailyData[day].purchases += toNumber(p.totalExpense);
      dailyData[day].expenses += purchaseExtraTotal(p);
    });
    sales.forEach(s => {
      const day = s.date.toISOString().split('T')[0];
      if (!dailyData[day]) dailyData[day] = { date: day, purchases: 0, sales: 0, expenses: 0 };
      dailyData[day].sales += toNumber(s.totalSale);
    });

    const dailyBreakdown = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      month,
      year,
      totalPurchase,
      totalSales,
      totalExpenses,
      netProfitLoss: totalSales - totalPurchase,
      purchaseCount: purchases.length,
      salesCount: sales.length,
      dailyBreakdown
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/overall?upto=YYYY-MM-DD&from=YYYY-MM-DD
router.get('/overall', auth, async (req, res, next) => {
  try {
    const uptoStr = req.query.upto || new Date().toISOString().split('T')[0];
    const fromStr = req.query.from;

    const endDate = new Date(uptoStr);
    endDate.setHours(23, 59, 59, 999);

    const dateFilter = { date: { $lte: endDate } };
    if (fromStr) {
      const startDate = new Date(fromStr);
      startDate.setHours(0, 0, 0, 0);
      dateFilter.date.$gte = startDate;
    }

    const purchases = await Purchase.find(dateFilter);
    const sales = await Sale.find(dateFilter);

    const totalPurchase = purchases.reduce((sum, p) => sum + toNumber(p.totalExpense), 0);
    const totalSales = sales.reduce((sum, s) => sum + toNumber(s.totalSale), 0);
    const totalExpenses = purchases.reduce((sum, p) => sum + purchaseExtraTotal(p), 0);

    res.json({
      upto: uptoStr,
      from: fromStr || null,
      totalPurchase,
      totalSales,
      totalExpenses,
      netProfitLoss: totalSales - totalPurchase,
      purchaseCount: purchases.length,
      salesCount: sales.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
