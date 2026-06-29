import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import Product from '../models/Product.js';
import OrderItem from '../models/OrderItem.js';
import Payment from '../models/Payment.js';
import Report from '../models/Report.js';

// Hàm phụ trợ cập nhật thống kê báo cáo hàng ngày
const updateDailyReport = async (dateStr) => {
  try {
    const start = new Date(`${dateStr}T00:00:00.000+07:00`);
    const end = new Date(`${dateStr}T23:59:59.999+07:00`);
    
    // Tìm tất cả đơn hàng đã thanh toán trong ngày
    const orders = await Order.find({
      status: 'paid',
      updatedAt: { $gte: start, $lte: end }
    }).populate('items');
    
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    
    const productMap = {};
    for (const o of orders) {
      for (const item of o.items) {
        if (item.product) {
          const pId = item.product.toString();
          if (!productMap[pId]) {
            productMap[pId] = {
              product: item.product,
              name: item.name,
              quantity: 0,
              revenue: 0
            };
          }
          productMap[pId].quantity += item.quantity;
          productMap[pId].revenue += item.price * item.quantity;
        }
      }
    }
    
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
      
    await Report.findOneAndUpdate(
      { date: dateStr },
      { totalRevenue, totalOrders, topProducts },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Lỗi khi cập nhật Report:', error);
  }
};

// GET /api/orders
export const getOrders = asyncHandler(async (req, res) => {
  const { status, date, tableNumber, type, sort, limit } = req.query;
  const filter = {};
  if (status) {
    if (status.includes(',')) {
      filter.status = { $in: status.split(',') };
    } else {
      filter.status = status;
    }
  }
  if (type) filter.type = type;
  if (tableNumber) filter.tableNumber = Number(tableNumber);
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: start, $lte: end };
  }
  
  const sortQuery = sort === 'updatedAt' ? { updatedAt: -1 } : { createdAt: -1 };
  const limitValue = limit ? Number(limit) : 200;

  const orders = await Order.find(filter)
    .populate('table', 'number name')
    .populate('staff', 'name')
    .populate({
      path: 'items',
      populate: { path: 'product', select: 'name price emoji' }
    })
    .populate('payment')
    .sort(sortQuery)
    .limit(limitValue);
  res.json(orders);
});

// GET /api/orders/:id
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('table', 'number name')
    .populate('staff', 'name')
    .populate({
      path: 'items',
      populate: { path: 'product', select: 'name price emoji' }
    })
    .populate('payment');
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  res.json(order);
});

// POST /api/orders
export const createOrder = asyncHandler(async (req, res) => {
  const { tableId, items, note, discount = 0, type = 'dine-in' } = req.body;

  let table = null;
  if (type === 'dine-in') {
    table = await Table.findById(tableId);
    if (!table) return res.status(404).json({ message: 'Không tìm thấy bàn' });
  }

  // 1. Tạo đơn hàng trống trước để lấy ID
  const order = await Order.create({
    type,
    table: table ? table._id : undefined,
    tableNumber: table ? table.number : undefined,
    staff: req.user._id,
    staffName: req.user.name,
    items: [],
    discount,
    note,
    status: 'processing',
  });

  // 2. Tạo các OrderItem liên kết tới Order này
  let subtotal = 0;
  const orderItemIds = [];

  for (const item of items) {
    const { productId, quantity, name, price, isCustom, note: iNote } = item;
    let resolvedItem;
    if (isCustom || !productId || productId === 'custom' || String(productId).startsWith('custom-')) {
      resolvedItem = { product: null, name: name || 'Món ngoài menu', price: Number(price) || 0, quantity, note: iNote || '' };
    } else {
      const p = await Product.findById(productId);
      if (!p) {
        // Xóa order đã tạo nếu xảy ra lỗi
        await Order.findByIdAndDelete(order._id);
        return res.status(404).json({ message: `Sản phẩm ${productId} không tồn tại` });
      }
      resolvedItem = { product: p._id, name: p.name, price: p.price, quantity, note: iNote || '' };
    }

    const orderItem = await OrderItem.create({
      order: order._id,
      product: resolvedItem.product,
      name: resolvedItem.name,
      price: resolvedItem.price,
      quantity: resolvedItem.quantity,
      note: resolvedItem.note,
    });
    orderItemIds.push(orderItem._id);
    subtotal += resolvedItem.price * resolvedItem.quantity;
  }

  // 3. Cập nhật lại Order với danh sách items, subtotal và total
  order.items = orderItemIds;
  order.subtotal = subtotal;
  order.total = subtotal - discount;
  await order.save();

  // Đánh dấu bàn đang hoạt động
  if (type === 'dine-in' && table) {
    table.status = 'occupied';
    table.currentOrder = order._id;
    await table.save();
  }

  // Trả về order đã populate đầy đủ thông tin
  const populatedOrder = await Order.findById(order._id)
    .populate('table', 'number name')
    .populate('staff', 'name')
    .populate({
      path: 'items',
      populate: { path: 'product', select: 'name price emoji' }
    });

  res.status(201).json(populatedOrder);
});

// PUT /api/orders/:id
export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

  const { status, items, discount, note, paymentMethod } = req.body;

  // 1. Cập nhật các sản phẩm (nếu có gửi kèm items mới)
  if (items) {
    // Xóa các OrderItem cũ của order này
    await OrderItem.deleteMany({ order: order._id });

    let subtotal = 0;
    const orderItemIds = [];
    
    for (const item of items) {
      const productId = item.product || item.productId;
      const isCustom = item.isCustom || !productId || productId === 'custom' || String(productId).startsWith('custom-');
      let resolvedItem;
      
      if (isCustom) {
        resolvedItem = {
          product: null,
          name: item.name || 'Món ngoài menu',
          price: Number(item.price) || 0,
          quantity: item.quantity,
          note: item.note || '',
        };
      } else {
        const p = await Product.findById(productId);
        if (!p) return res.status(404).json({ message: `Sản phẩm ${productId} không tồn tại` });
        resolvedItem = {
          product: p._id,
          name: p.name,
          price: p.price,
          quantity: item.quantity,
          note: item.note || '',
        };
      }

      const orderItem = await OrderItem.create({
        order: order._id,
        product: resolvedItem.product,
        name: resolvedItem.name,
        price: resolvedItem.price,
        quantity: resolvedItem.quantity,
        note: resolvedItem.note,
      });
      orderItemIds.push(orderItem._id);
      subtotal += resolvedItem.price * resolvedItem.quantity;
    }

    order.items = orderItemIds;
    order.subtotal = subtotal;
  }

  if (discount !== undefined) order.discount = discount;
  if (note !== undefined) order.note = note;

  // Tính lại tổng tiền
  order.total = order.subtotal - order.discount;

  // 2. Cập nhật trạng thái và thông tin Thanh toán
  if (status) {
    const prevStatus = order.status;
    order.status = status;

    if (status === 'paid' && prevStatus !== 'paid') {
      // Tạo một Payment mới
      const payment = await Payment.create({
        order: order._id,
        amount: order.total,
        paymentMethod: paymentMethod || 'cash',
        status: 'completed',
        paidAt: new Date(),
      });
      order.payment = payment._id;

      // Tăng soldCount cho các sản phẩm đã bán
      const populatedItems = await OrderItem.find({ order: order._id });
      for (const item of populatedItems) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { soldCount: item.quantity },
          });
        }
      }

      // Trả trạng thái bàn về trống
      if (order.table) {
        await Table.findByIdAndUpdate(order.table, {
          status: 'empty',
          currentOrder: null,
        });
      }

      // Lưu Order trước khi cập nhật Report
      await order.save();

      // Cập nhật thống kê báo cáo ngày
      const todayStr = new Date().toISOString().split('T')[0];
      await updateDailyReport(todayStr);
    }

    if (status === 'cancelled') {
      // Hủy bàn
      if (order.table) {
        await Table.findByIdAndUpdate(order.table, {
          status: 'empty',
          currentOrder: null,
        });
      }
      
      await order.save();

      // Cập nhật lại báo cáo nếu trước đó đơn hàng từng ở trạng thái paid (hữu ích cho việc đồng bộ)
      if (prevStatus === 'paid') {
        const todayStr = new Date().toISOString().split('T')[0];
        await updateDailyReport(todayStr);
      }
    }
  }

  if (order.status !== 'paid') {
    await order.save();
  }

  const updatedOrder = await Order.findById(order._id)
    .populate('table', 'number name')
    .populate('staff', 'name')
    .populate({
      path: 'items',
      populate: { path: 'product', select: 'name price emoji' }
    })
    .populate('payment');

  res.json(updatedOrder);
});

// DELETE /api/orders/:id
export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

  // Giải phóng bàn nếu đơn chưa thanh toán hoặc chưa hủy
  if (order.status !== 'paid' && order.status !== 'cancelled' && order.table) {
    await Table.findByIdAndUpdate(order.table, {
      status: 'empty',
      currentOrder: null,
    });
  }

  // Xóa các dữ liệu liên kết: OrderItems, Payments
  await OrderItem.deleteMany({ order: order._id });
  await Payment.deleteMany({ order: order._id });
  
  const wasPaid = order.status === 'paid';
  const orderDateStr = new Date(order.createdAt).toISOString().split('T')[0];

  await Order.findByIdAndDelete(req.params.id);

  // Cập nhật lại báo cáo ngày
  if (wasPaid) {
    await updateDailyReport(orderDateStr);
  }

  res.json({ message: 'Đã xoá đơn hàng' });
});

// PUT /api/orders/:id/change-table
export const changeTable = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

  if (order.status === 'paid' || order.status === 'cancelled') {
    return res.status(400).json({ message: 'Không thể chuyển bàn cho đơn hàng đã thanh toán hoặc đã huỷ' });
  }

  const { newTableId, toTakeaway } = req.body;

  // Trường hợp 1: Chuyển đơn sang Mang Về (takeaway)
  if (toTakeaway || newTableId === 'takeaway') {
    const oldTableId = order.table;

    order.type = 'takeaway';
    order.table = undefined;
    order.tableNumber = undefined;
    await order.save();

    // Giải phóng bàn cũ nếu có
    if (oldTableId) {
      await Table.findByIdAndUpdate(oldTableId, {
        status: 'empty',
        currentOrder: null,
      });
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'number name')
      .populate('staff', 'name')
      .populate({
        path: 'items',
        populate: { path: 'product', select: 'name price emoji' }
      });

    return res.json({ message: 'Chuyển sang đơn mang về thành công', order: populatedOrder });
  }

  // Trường hợp 2: Chuyển đơn sang Bàn mới (dine-in)
  const newTable = await Table.findById(newTableId);
  if (!newTable) return res.status(404).json({ message: 'Không tìm thấy bàn mới' });

  if (newTable.status === 'occupied') {
    return res.status(400).json({ message: 'Bàn mới đang có khách, không thể chuyển' });
  }

  const oldTableId = order.table;

  // Cập nhật thông tin bàn cho order
  order.type = 'dine-in';
  order.table = newTable._id;
  order.tableNumber = newTable.number;
  await order.save();

  // Giải phóng bàn cũ nếu có
  if (oldTableId) {
    await Table.findByIdAndUpdate(oldTableId, {
      status: 'empty',
      currentOrder: null,
    });
  }

  // Gán đơn cho bàn mới
  newTable.status = 'occupied';
  newTable.currentOrder = order._id;
  await newTable.save();

  const populatedOrder = await Order.findById(order._id)
    .populate('table', 'number name')
    .populate('staff', 'name')
    .populate({
      path: 'items',
      populate: { path: 'product', select: 'name price emoji' }
    });

  res.json({ message: 'Chuyển bàn thành công', order: populatedOrder });
});

// PUT /api/orders/:id/merge-table
export const mergeTable = asyncHandler(async (req, res) => {
  const targetOrder = await Order.findById(req.params.id);
  if (!targetOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng đích' });

  if (targetOrder.type === 'takeaway') {
    return res.status(400).json({ message: 'Không thể ghép bàn cho đơn hàng mang về' });
  }

  if (targetOrder.status === 'paid' || targetOrder.status === 'cancelled') {
    return res.status(400).json({ message: 'Không thể ghép bàn cho đơn hàng đã thanh toán hoặc đã huỷ' });
  }

  const { sourceTableId } = req.body;
  const sourceTable = await Table.findById(sourceTableId);
  if (!sourceTable) return res.status(404).json({ message: 'Không tìm thấy bàn nguồn' });

  if (sourceTable.status !== 'occupied' || !sourceTable.currentOrder) {
    return res.status(400).json({ message: 'Bàn nguồn không có khách hoặc không có đơn hàng hoạt động' });
  }

  if (sourceTable._id.toString() === targetOrder.table.toString()) {
    return res.status(400).json({ message: 'Bàn nguồn và bàn đích không thể giống nhau' });
  }

  const sourceOrder = await Order.findById(sourceTable.currentOrder);
  if (!sourceOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng của bàn nguồn' });

  if (sourceOrder.status !== 'processing') {
    return res.status(400).json({ message: 'Đơn hàng của bàn nguồn không ở trạng thái đang pha chế, không thể ghép' });
  }

  // 1. Lấy chi tiết OrderItems của cả 2 orders
  const sourceItems = await OrderItem.find({ order: sourceOrder._id });
  const targetItems = await OrderItem.find({ order: targetOrder._id });

  // 2. Gộp items
  for (const sItem of sourceItems) {
    // Tìm item trùng sản phẩm ở target
    const matchedTargetItem = targetItems.find(
      (tItem) =>
        tItem.product &&
        sItem.product &&
        tItem.product.toString() === sItem.product.toString()
    );

    if (matchedTargetItem) {
      // Nếu trùng, cộng dồn số lượng và cập nhật ghi chú trên OrderItem của target
      matchedTargetItem.quantity += sItem.quantity;
      if (sItem.note) {
        matchedTargetItem.note = matchedTargetItem.note
          ? `${matchedTargetItem.note}; ${sItem.note}`
          : sItem.note;
      }
      await matchedTargetItem.save();
      
      // Xóa OrderItem của source vì đã gộp
      await OrderItem.findByIdAndDelete(sItem._id);
    } else {
      // Nếu không trùng, chuyển quyền sở hữu OrderItem sang targetOrder
      sItem.order = targetOrder._id;
      await sItem.save();
      
      // Đẩy ID vào mảng items của target
      targetOrder.items.push(sItem._id);
    }
  }

  // 3. Tính toán lại subtotal, total cho targetOrder
  const allTargetItems = await OrderItem.find({ order: targetOrder._id });
  targetOrder.subtotal = allTargetItems.reduce((s, i) => s + i.price * i.quantity, 0);
  targetOrder.discount = (targetOrder.discount || 0) + (sourceOrder.discount || 0);
  targetOrder.total = targetOrder.subtotal - targetOrder.discount;

  // Gộp ghi chú đơn hàng
  const targetNote = targetOrder.note;
  const sourceNote = sourceOrder.note;
  const mergeNoteMsg = `[Ghép từ Bàn ${sourceTable.number}]${sourceNote ? `: ${sourceNote}` : ''}`;
  targetOrder.note = targetNote ? `${targetNote}; ${mergeNoteMsg}` : mergeNoteMsg;

  // Lưu targetOrder
  await targetOrder.save();

  // 4. Hủy sourceOrder và giải phóng bàn nguồn
  sourceOrder.status = 'cancelled';
  sourceOrder.items = []; // Xóa liên kết items cũ
  sourceOrder.note = `${sourceOrder.note ? sourceOrder.note + '; ' : ''}[Đã ghép vào Bàn ${targetOrder.tableNumber}]`;
  await sourceOrder.save();

  sourceTable.status = 'empty';
  sourceTable.currentOrder = null;
  await sourceTable.save();

  const populatedOrder = await Order.findById(targetOrder._id)
    .populate('table', 'number name')
    .populate('staff', 'name')
    .populate({
      path: 'items',
      populate: { path: 'product', select: 'name price emoji' }
    });

  res.json({ message: 'Ghép bàn thành công', order: populatedOrder });
});

// POST /api/orders/:id/webhook-mock
export const mockWebhook = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
  
  if (order.status === 'paid') {
    return res.status(400).json({ message: 'Đơn hàng đã được thanh toán trước đó' });
  }
  
  const prevStatus = order.status;
  order.status = 'paid';
  
  // Tạo Payment mới
  const payment = await Payment.create({
    order: order._id,
    amount: order.total,
    paymentMethod: 'QR_CODE',
    status: 'completed',
    paidAt: new Date(),
  });
  order.payment = payment._id;
  
  // Tăng soldCount cho các sản phẩm đã bán
  const populatedItems = await OrderItem.find({ order: order._id });
  for (const item of populatedItems) {
    if (item.product) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { soldCount: item.quantity },
      });
    }
  }

  // Trả trạng thái bàn về trống
  if (order.table) {
    await Table.findByIdAndUpdate(order.table, {
      status: 'empty',
      currentOrder: null,
    });
  }

  await order.save();

  // Cập nhật thống kê báo cáo ngày
  const todayStr = new Date().toISOString().split('T')[0];
  await updateDailyReport(todayStr);

  res.json({ message: 'Giả lập webhook thành công', order: order });
});

// POST /api/orders/webhook-sepay
export const webhookSepay = asyncHandler(async (req, res) => {
  const { transferType, transferAmount, transactionContent } = req.body;
  
  console.log("=== Nhận Webhook SePay ===", req.body);

  if (transferType !== 'in') {
    return res.status(400).json({ message: 'Bỏ qua giao dịch rút tiền' });
  }

  // Lấy danh sách các đơn hàng đang pha chế
  const orders = await Order.find({ status: 'processing' }).populate('table');
  
  let targetOrder = null;
  
  // 1. Tìm tất cả các số (chuỗi ký số) có trong nội dung giao dịch
  const numbers = transactionContent.match(/\d+/g) || [];
  
  // 2. Thử khớp theo cú pháp chuẩn "don hang XXXX" hoặc "donhangXXXX" hoặc "#XXXX" trước
  const patternMatch = transactionContent.match(/don[ _]?hang[ _]?#?(\d+)/i) || transactionContent.match(/#(\d+)/);
  if (patternMatch) {
    const orderNumber = Number(patternMatch[1]);
    targetOrder = orders.find(o => Number(o.orderCode.replace('#', '')) === orderNumber);
  }
  
  // 3. Nếu không khớp bằng cú pháp chuẩn, duyệt qua toàn bộ các số tìm thấy trong nội dung để đối chiếu với mã đơn hàng đang chờ thanh toán
  if (!targetOrder && numbers.length > 0) {
    for (const numStr of numbers) {
      const num = Number(numStr);
      // Bỏ qua các số quá lớn (thường là mã giao dịch ngân hàng chứa ngày giờ hoặc số tài khoản)
      if (num <= 0 || num > 100000) continue;
      
      targetOrder = orders.find(o => Number(o.orderCode.replace('#', '')) === num);
      if (targetOrder) {
        console.log(`🔍 Webhook SePay: Khớp đơn hàng qua việc đối chiếu số tự do: ${num} -> ${targetOrder.orderCode}`);
        break; 
      }
    }
  }

  if (!targetOrder) {
    return res.status(404).json({ message: `Không tìm thấy đơn hàng đang chờ thanh toán nào khớp với nội dung chuyển khoản: "${transactionContent}"` });
  }

  // Kiểm tra số tiền chuyển khoản có khớp hoặc lớn hơn tổng tiền đơn hàng không
  if (transferAmount < targetOrder.total) {
    return res.status(400).json({ message: `Số tiền chuyển khoản (${transferAmount}) nhỏ hơn tổng tiền đơn hàng (${targetOrder.total})` });
  }

  // Cập nhật trạng thái đơn hàng
  targetOrder.status = 'paid';

  // Tạo Payment mới
  const payment = await Payment.create({
    order: targetOrder._id,
    amount: transferAmount,
    paymentMethod: 'QR_CODE',
    status: 'completed',
    paidAt: new Date(),
  });
  targetOrder.payment = payment._id;

  // Tăng soldCount cho các sản phẩm đã bán
  const populatedItems = await OrderItem.find({ order: targetOrder._id });
  for (const item of populatedItems) {
    if (item.product) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { soldCount: item.quantity },
      });
    }
  }

  // Trả trạng thái bàn về trống
  if (targetOrder.table) {
    await Table.findByIdAndUpdate(targetOrder.table, {
      status: 'empty',
      currentOrder: null,
    });
  }

  await targetOrder.save();

  // Cập nhật thống kê báo cáo ngày
  const todayStr = new Date().toISOString().split('T')[0];
  await updateDailyReport(todayStr);

  console.log(`✅ Webhook SePay: Thanh toán thành công đơn hàng ${targetOrder.orderCode}`);

  res.json({ message: 'Thanh toán đơn hàng thành công qua Webhook SePay', order: targetOrder });
});
