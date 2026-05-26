import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import Product from '../models/Product.js';

// GET /api/orders
export const getOrders = asyncHandler(async (req, res) => {
  const { status, date, tableNumber } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (tableNumber) filter.tableNumber = Number(tableNumber);
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: start, $lte: end };
  }
  const orders = await Order.find(filter)
    .populate('table', 'number name')
    .populate('staff', 'name')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json(orders);
});

// GET /api/orders/:id
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('table', 'number name')
    .populate('staff', 'name')
    .populate('items.product', 'name price emoji');
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  res.json(order);
});

// POST /api/orders
export const createOrder = asyncHandler(async (req, res) => {
  const { tableId, items, note, discount = 0 } = req.body;

  const table = await Table.findById(tableId);
  if (!table) return res.status(404).json({ message: 'Không tìm thấy bàn' });

  // Resolve product info
  const resolvedItems = await Promise.all(
    items.map(async ({ productId, quantity, note: iNote }) => {
      const p = await Product.findById(productId);
      if (!p) throw new Error(`Sản phẩm ${productId} không tồn tại`);
      return { product: p._id, name: p.name, price: p.price, quantity, note: iNote || '' };
    })
  );

  const order = await Order.create({
    table: table._id,
    tableNumber: table.number,
    staff: req.user._id,
    staffName: req.user.name,
    items: resolvedItems,
    discount,
    note,
    status: 'pending',
  });

  // Mark table occupied
  table.status = 'occupied';
  table.currentOrder = order._id;
  await table.save();

  res.status(201).json(order);
});

// PUT /api/orders/:id
export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

  const { status, items, discount, note, paymentMethod } = req.body;

  if (items) order.items = items;
  if (discount !== undefined) order.discount = discount;
  if (note !== undefined) order.note = note;
  if (paymentMethod) order.paymentMethod = paymentMethod;

  if (status) {
    order.status = status;

    if (status === 'paid') {
      order.paidAt = new Date();
      // Increment soldCount for each product
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { soldCount: item.quantity },
        });
      }
      // Free the table
      await Table.findByIdAndUpdate(order.table, {
        status: 'empty',
        currentOrder: null,
      });
    }

    if (status === 'cancelled') {
      await Table.findByIdAndUpdate(order.table, {
        status: 'empty',
        currentOrder: null,
      });
    }
  }

  await order.save();
  res.json(order);
});

// DELETE /api/orders/:id
export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  res.json({ message: 'Đã xoá đơn hàng' });
});
