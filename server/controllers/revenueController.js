import asyncHandler from 'express-async-handler';
import Payment from '../models/Payment.js';
import Report from '../models/Report.js';
import OrderItem from '../models/OrderItem.js';

const formatDateYYYYMMDD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getLocalDateFromStr = (str) => {
  const parts = str.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

const getVNTime = (d) => {
  const dateObj = d ? new Date(d) : new Date();
  return new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000) + (7 * 3600000));
};

// GET /api/revenue?period=day|week|month|year&date=2024-05-16
export const getRevenue = asyncHandler(async (req, res) => {
  const { period = 'day', date, startDate, endDate } = req.query;
  const now = date ? new Date(date) : new Date();
  const vnTime = getVNTime(now);

  let startStr, endStr, labels, chartData = [];

  if (period === 'day') {
    const ymd = formatDateYYYYMMDD(vnTime);
    startStr = ymd;
    endStr = ymd;
    labels = Array.from({ length: 24 }, (_, i) => `${i}h`);

    const start = new Date(`${ymd}T00:00:00.000+07:00`);
    const end = new Date(`${ymd}T23:59:59.999+07:00`);

    // Với truy vấn ngày, ta gom các Payment theo giờ
    const paymentsPerHour = await Payment.aggregate([
      { $match: { status: 'completed', paidAt: { $gte: start, $lte: end } } },
      { $group: {
        _id: { $dateToString: { format: '%H', date: '$paidAt', timezone: '+07:00' } },
        revenue: { $sum: '$amount' },
        orders: { $sum: 1 }
      }}
    ]);

    const hourlyMap = new Map(paymentsPerHour.map(p => [parseInt(p._id), p]));
    for (let i = 0; i < 24; i++) {
      const found = hourlyMap.get(i);
      chartData.push({
        label: `${i}h`,
        revenue: found ? found.revenue : 0,
        orders: found ? found.orders : 0
      });
    }
  } else {
    // Với các kỳ khác, lấy khoảng thời gian
    if (period === 'week') {
      const dayOfWeek = vnTime.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startOfWeek = new Date(vnTime);
      startOfWeek.setDate(vnTime.getDate() + diff);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      startStr = formatDateYYYYMMDD(startOfWeek);
      endStr = formatDateYYYYMMDD(endOfWeek);
    } else if (period === 'month') {
      const y = vnTime.getFullYear();
      const m = vnTime.getMonth();
      const startOfMonth = new Date(y, m, 1);
      const endOfMonth = new Date(y, m + 1, 0);
      startStr = formatDateYYYYMMDD(startOfMonth);
      endStr = formatDateYYYYMMDD(endOfMonth);
    } else if (period === 'custom') {
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Vui lòng cung cấp ngày bắt đầu và ngày kết thúc' });
      }
      startStr = startDate;
      endStr = endDate;
    } else { // year
      const y = vnTime.getFullYear();
      startStr = `${y}-01-01`;
      endStr = `${y}-12-31`;
    }

    // Lấy dữ liệu tổng hợp từ bảng Report
    const reports = await Report.find({ date: { $gte: startStr, $lte: endStr } }).sort({ date: 1 });
    const reportMap = new Map(reports.map(r => [r.date, r]));

    if (period === 'week') {
      let curr = getLocalDateFromStr(startStr);
      const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
      for (let i = 0; i < 7; i++) {
        const currStr = formatDateYYYYMMDD(curr);
        const report = reportMap.get(currStr);
        chartData.push({
          label: `${dayNames[i]} (${curr.getDate()}/${curr.getMonth() + 1})`,
          revenue: report ? report.totalRevenue : 0,
          orders: report ? report.totalOrders : 0
        });
        curr.setDate(curr.getDate() + 1);
      }
      labels = chartData.map(d => d.label);
    } else if (period === 'month') {
      let curr = getLocalDateFromStr(startStr);
      const endCurr = getLocalDateFromStr(endStr);
      while (curr <= endCurr) {
        const currStr = formatDateYYYYMMDD(curr);
        const report = reportMap.get(currStr);
        chartData.push({
          label: `${curr.getDate()}`,
          revenue: report ? report.totalRevenue : 0,
          orders: report ? report.totalOrders : 0
        });
        curr.setDate(curr.getDate() + 1);
      }
      labels = chartData.map(d => d.label);
    } else if (period === 'custom') {
      let curr = getLocalDateFromStr(startStr);
      const endCurr = getLocalDateFromStr(endStr);
      while (curr <= endCurr) {
        const currStr = formatDateYYYYMMDD(curr);
        const report = reportMap.get(currStr);
        chartData.push({
          label: `${curr.getDate()}/${curr.getMonth() + 1}`,
          revenue: report ? report.totalRevenue : 0,
          orders: report ? report.totalOrders : 0
        });
        curr.setDate(curr.getDate() + 1);
      }
      labels = chartData.map(d => d.label);
    } else { // year (gom theo tháng)
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        label: `T${i + 1}`,
        revenue: 0,
        orders: 0
      }));
      for (const report of reports) {
        const monthIndex = parseInt(report.date.split('-')[1]) - 1;
        monthlyData[monthIndex].revenue += report.totalRevenue;
        monthlyData[monthIndex].orders += report.totalOrders;
      }
      chartData = monthlyData;
      labels = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
    }
  }

  // Thống kê tổng hợp (Summary) và Sản phẩm bán chạy (Top Products)
  let totalRevenue = 0;
  let totalOrders = 0;
  const productStatsMap = {};

  if (period === 'day') {
    totalRevenue = chartData.reduce((sum, c) => sum + c.revenue, 0);
    totalOrders = chartData.reduce((sum, c) => sum + c.orders, 0);

    // Lấy top sản phẩm từ các OrderItem trong ngày
    const start = new Date(`${startStr}T00:00:00.000+07:00`);
    const end = new Date(`${endStr}T23:59:59.999+07:00`);
    const items = await OrderItem.find({ createdAt: { $gte: start, $lte: end } });
    
    for (const item of items) {
      if (item.product) {
        const pId = item.product.toString();
        if (!productStatsMap[pId]) {
          productStatsMap[pId] = {
            product: item.product,
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        productStatsMap[pId].quantity += item.quantity;
        productStatsMap[pId].revenue += item.price * item.quantity;
      }
    }
  } else {
    // Đọc trực tiếp từ các tài liệu Report đã truy vấn
    const reports = await Report.find({ date: { $gte: startStr, $lte: endStr } });
    for (const r of reports) {
      totalRevenue += r.totalRevenue;
      totalOrders += r.totalOrders;
      for (const p of r.topProducts) {
        if (p.product) {
          const pId = p.product.toString();
          if (!productStatsMap[pId]) {
            productStatsMap[pId] = {
              product: p.product,
              name: p.name,
              quantity: 0,
              revenue: 0
            };
          }
          productStatsMap[pId].quantity += p.quantity;
          productStatsMap[pId].revenue += p.revenue;
        }
      }
    }
  }

  const topProducts = Object.values(productStatsMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  res.json({
    period,
    labels,
    chartData,
    summary: { totalRevenue, totalOrders, avgOrder },
    topProducts,
  });
});

// GET /api/revenue/products?period=day|week|month|custom&startDate=...&endDate=...
export const getProductStatistics = asyncHandler(async (req, res) => {
  const { period = 'month', date, startDate, endDate } = req.query;
  const now = date ? new Date(date) : new Date();
  const vnTime = getVNTime(now);

  let startStr, endStr;

  if (period === 'day') {
    const ymd = formatDateYYYYMMDD(vnTime);
    startStr = ymd;
    endStr = ymd;
  } else if (period === 'week') {
    const dayOfWeek = vnTime.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(vnTime);
    startOfWeek.setDate(vnTime.getDate() + diff);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    startStr = formatDateYYYYMMDD(startOfWeek);
    endStr = formatDateYYYYMMDD(endOfWeek);
  } else if (period === 'month') {
    const y = vnTime.getFullYear();
    const m = vnTime.getMonth();
    const startOfMonth = new Date(y, m, 1);
    const endOfMonth = new Date(y, m + 1, 0);
    startStr = formatDateYYYYMMDD(startOfMonth);
    endStr = formatDateYYYYMMDD(endOfMonth);
  } else if (period === 'custom') {
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Vui lòng cung cấp ngày bắt đầu và ngày kết thúc' });
    }
    startStr = startDate;
    endStr = endDate;
  } else { // year
    const y = vnTime.getFullYear();
    startStr = `${y}-01-01`;
    endStr = `${y}-12-31`;
  }

  const productStatsMap = {};

  if (period === 'day') {
    const start = new Date(`${startStr}T00:00:00.000+07:00`);
    const end = new Date(`${endStr}T23:59:59.999+07:00`);
    const items = await OrderItem.find({ createdAt: { $gte: start, $lte: end } });
    for (const item of items) {
      if (item.product) {
        const pId = item.product.toString();
        if (!productStatsMap[pId]) {
          productStatsMap[pId] = {
            _id: item.product,
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        productStatsMap[pId].quantity += item.quantity;
        productStatsMap[pId].revenue += item.price * item.quantity;
      }
    }
  } else {
    const reports = await Report.find({ date: { $gte: startStr, $lte: endStr } });
    for (const r of reports) {
      for (const p of r.topProducts) {
        if (p.product) {
          const pId = p.product.toString();
          if (!productStatsMap[pId]) {
            productStatsMap[pId] = {
              _id: p.product,
              name: p.name,
              quantity: 0,
              revenue: 0
            };
          }
          productStatsMap[pId].quantity += p.quantity;
          productStatsMap[pId].revenue += p.revenue;
        }
      }
    }
  }

  const productStats = Object.values(productStatsMap).sort((a, b) => b.revenue - 1);
  const totalRevenue = productStats.reduce((acc, p) => acc + p.revenue, 0);
  const totalQuantity = productStats.reduce((acc, p) => acc + p.quantity, 0);

  const statsWithPercentage = productStats.map(p => ({
    ...p,
    percentage: totalRevenue > 0 ? parseFloat(((p.revenue / totalRevenue) * 100).toFixed(1)) : 0
  }));

  res.json({
    period,
    products: statsWithPercentage,
    summary: {
      totalRevenue,
      totalQuantity,
      productCount: productStats.length
    }
  });
});
