import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

// GET /api/revenue?period=day|month|year&date=2024-05-16
export const getRevenue = asyncHandler(async (req, res) => {
  const { period = 'day', date, startDate, endDate } = req.query;
  const now = date ? new Date(date) : new Date();

  let start, end, groupFormat, labels;

  if (period === 'day') {
    start = new Date(now); start.setHours(0, 0, 0, 0);
    end = new Date(now); end.setHours(23, 59, 59, 999);
    groupFormat = '%H';
    labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    groupFormat = '%d';
    const days = end.getDate();
    labels = Array.from({ length: days }, (_, i) => `${i + 1}`);
  } else if (period === 'custom') {
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Vui lòng cung cấp ngày bắt đầu và ngày kết thúc' });
    }
    start = new Date(startDate); start.setHours(0, 0, 0, 0);
    end = new Date(endDate); end.setHours(23, 59, 59, 999);
    groupFormat = '%Y-%m-%d';
  } else {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    groupFormat = '%m';
    labels = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
  }

  const [revenueData, summary, topProducts] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: start, $lte: end } } },
      { $group: {
        _id: { $dateToString: { format: groupFormat, date: '$createdAt', timezone: '+07:00' } },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: start, $lte: end } } },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalOrders: { $sum: 1 },
        avgOrder: { $avg: '$total' },
      }},
    ]),
    Order.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$items' },
      { $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      }},
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
  ]);

  let finalChartData = revenueData;
  if (period === 'custom') {
    const startD = new Date(startDate);
    const endD = new Date(endDate);
    const dateMap = new Map(revenueData.map(d => [d._id, d]));

    finalChartData = [];
    let curr = new Date(startD);
    while (curr <= endD) {
      const dateStr = curr.toISOString().split('T')[0];
      const found = dateMap.get(dateStr);

      const day = String(curr.getDate()).padStart(2, '0');
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const label = `${day}/${month}`;

      finalChartData.push({
        label,
        revenue: found ? found.revenue : 0,
        orders: found ? found.orders : 0
      });
      curr.setDate(curr.getDate() + 1);
    }
    labels = finalChartData.map(d => d.label);
  }

  res.json({
    period,
    labels,
    chartData: finalChartData,
    summary: summary[0] || { totalRevenue: 0, totalOrders: 0, avgOrder: 0 },
    topProducts,
  });
});
