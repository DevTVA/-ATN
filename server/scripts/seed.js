import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import Role from '../models/Role.js';
import Category from '../models/Category.js';
import OrderItem from '../models/OrderItem.js';
import Payment from '../models/Payment.js';
import Report from '../models/Report.js';

const initialCategories = [
  { name: 'Cà phê', slug: 'cafe', description: 'Các món cà phê pha phin và pha máy' },
  { name: 'Trà sữa', slug: 'tra-sua', description: 'Trà sữa, trà trái cây thơm mát' },
  { name: 'Bánh ngọt', slug: 'banh-ngot', description: 'Bánh ngọt ăn kèm' },
  { name: 'Nước ép', slug: 'nuoc-ep', description: 'Nước ép trái cây tươi' },
  { name: 'Khác', slug: 'khac', description: 'Đồ uống lon và đồ ăn nhẹ khác' },
];

const rawProducts = [
  { name: 'Cà phê sữa đá', price: 30000, categorySlug: 'cafe', emoji: '☕', description: 'Cà phê phin truyền thống pha với sữa đặc', soldCount: 120 },
  { name: 'Espresso', price: 35000, categorySlug: 'cafe', emoji: '☕', description: 'Cà phê espresso nguyên chất đậm đà', soldCount: 80 },
  { name: 'Cappuccino', price: 45000, categorySlug: 'cafe', emoji: '☕', description: 'Espresso với foam sữa mịn béo', soldCount: 95 },
  { name: 'Latte', price: 45000, categorySlug: 'cafe', emoji: '☕', description: 'Espresso với sữa tươi nóng', soldCount: 70 },
  { name: 'Americano', price: 35000, categorySlug: 'cafe', emoji: '☕', description: 'Espresso pha loãng với nước nóng', soldCount: 55 },
  { name: 'Cold Brew', price: 50000, categorySlug: 'cafe', emoji: '🧊', description: 'Cà phê ủ lạnh 12 giờ', soldCount: 40 },
  { name: 'Trà sữa Oolong', price: 35000, categorySlug: 'tra-sua', emoji: '🧋', description: 'Trà Oolong Taiwan pha sữa tươi', soldCount: 110 },
  { name: 'Trà sữa Thái', price: 35000, categorySlug: 'tra-sua', emoji: '🧋', description: 'Trà Thái đặc trưng màu cam', soldCount: 90 },
  { name: 'Trà đào cam sả', price: 40000, categorySlug: 'tra-sua', emoji: '🍑', description: 'Trà đào thơm kết hợp sả tươi', soldCount: 75 },
  { name: 'Matcha latte', price: 50000, categorySlug: 'tra-sua', emoji: '🍵', description: 'Matcha Nhật Bản nguyên chất', soldCount: 60 },
  { name: 'Bánh tiramisu', price: 45000, categorySlug: 'banh-ngot', emoji: '🍰', description: 'Tiramisu kiểu Ý truyền thống', soldCount: 50 },
  { name: 'Bánh croissant', price: 30000, categorySlug: 'banh-ngot', emoji: '🥐', description: 'Bánh croissant bơ giòn thơm', soldCount: 45 },
  { name: 'Cheesecake', price: 50000, categorySlug: 'banh-ngot', emoji: '🍰', description: 'Cheesecake New York béo ngậy', soldCount: 35 },
  { name: 'Nước cam ép', price: 35000, categorySlug: 'nuoc-ep', emoji: '🍊', description: 'Cam ép tươi nguyên chất', soldCount: 30 },
  { name: 'Sinh tố bơ', price: 45000, categorySlug: 'nuoc-ep', emoji: '🥑', description: 'Bơ sữa đặc mịn béo', soldCount: 25 },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // 1. Clear old collections
  await Promise.all([
    Role.deleteMany({}),
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Table.deleteMany({}),
    Order.deleteMany({}),
    OrderItem.deleteMany({}),
    Payment.deleteMany({}),
    Report.deleteMany({}),
  ]);
  console.log('🗑️  Cleared old data in all 9 tables');

  // 2. Create Roles
  const roles = await Role.create([
    { name: 'admin', description: 'Quản trị viên hệ thống' },
    { name: 'staff', description: 'Nhân viên phục vụ' },
    { name: 'cashier', description: 'Thu ngân kiêm thanh toán' },
  ]);
  console.log(`👥 Created ${roles.length} roles`);

  const adminRole = roles.find((r) => r.name === 'admin');
  const staffRole = roles.find((r) => r.name === 'staff');
  const cashierRole = roles.find((r) => r.name === 'cashier');

  // 3. Create Users
  const passwordHash = await bcrypt.hash('123456', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  const users = await User.create([
    { name: 'Admin', email: 'admin@cafe.com', password: 'admin123', role: adminRole._id, phone: '0901234567', shift: 'Toàn thời gian' },
    { name: 'Nguyễn Minh Anh', email: 'minhanh@cafe.com', password: '123456', role: staffRole._id, phone: '0912345678', shift: 'Sáng 7-15h' },
    { name: 'Trần Thanh Hà', email: 'thanhha@cafe.com', password: '123456', role: staffRole._id, phone: '0923456789', shift: 'Chiều 13-21h' },
    { name: 'Lê Văn Đức', email: 'vanduc@cafe.com', password: '123456', role: cashierRole._id, phone: '0934567890', shift: 'Chiều 13-21h' },
  ]);
  console.log(`👥 Created ${users.length} users`);

  // Override hashed password vì User pre('save') sẽ hash mật khẩu,
  // nhưng ở đây ta truyền plain password trong create ở trên, điều này là chính xác
  // do pre('save') trong User.js tự động băm mật khẩu. 

  // 4. Create Categories
  const categories = await Category.create(initialCategories);
  console.log(`🏷️  Created ${categories.length} categories`);

  // 5. Create Products
  const productsToCreate = rawProducts.map((p) => {
    const matchedCategory = categories.find((c) => c.slug === p.categorySlug);
    return {
      name: p.name,
      price: p.price,
      category: matchedCategory._id,
      emoji: p.emoji,
      description: p.description,
      soldCount: p.soldCount,
    };
  });
  const createdProducts = await Product.create(productsToCreate);
  console.log(`☕ Created ${createdProducts.length} products`);

  // 6. Create Tables
  const tableData = Array.from({ length: 15 }, (_, i) => ({
    number: i + 1,
    name: `Bàn ${i + 1}`,
    capacity: i < 3 ? 2 : i < 10 ? 4 : 6,
  }));
  const tables = await Table.create(tableData);
  console.log(`🪑 Created ${tables.length} tables`);

  // 7. Create Sample Orders, OrderItems and Payments (last 7 days)
  const orderItemsTemplates = [
    [
      { product: createdProducts[0]._id, name: createdProducts[0].name, price: 30000, quantity: 2 },
      { product: createdProducts[6]._id, name: createdProducts[6].name, price: 35000, quantity: 1 }
    ],
    [
      { product: createdProducts[2]._id, name: createdProducts[2].name, price: 45000, quantity: 2 },
      { product: createdProducts[10]._id, name: createdProducts[10].name, price: 45000, quantity: 2 }
    ],
    [
      { product: createdProducts[3]._id, name: createdProducts[3].name, price: 45000, quantity: 1 },
      { product: createdProducts[7]._id, name: createdProducts[7].name, price: 35000, quantity: 2 }
    ],
  ];

  let orderCount = 0;
  console.log('🔄 Creating sample orders, items and payments...');

  const dailyReportStats = {}; // { 'YYYY-MM-DD': { totalRevenue, totalOrders, productMap: { productId: { name, quantity, revenue } } } }

  for (let day = 6; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];

    dailyReportStats[dateStr] = {
      totalRevenue: 0,
      totalOrders: 0,
      productMap: {}
    };

    const ordersInDay = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < ordersInDay; i++) {
      const itemsTemplate = orderItemsTemplates[i % orderItemsTemplates.length];
      const subtotal = itemsTemplate.reduce((s, it) => s + it.price * it.quantity, 0);
      const total = subtotal;

      const h = 8 + Math.floor(Math.random() * 12);
      const orderDate = new Date(date);
      orderDate.setHours(h, Math.floor(Math.random() * 59), 0, 0);

      orderCount++;
      const orderCode = `#${String(orderCount).padStart(4, '0')}`;

      // Tạo Order trước (không có items và payment)
      const order = new Order({
        orderCode,
        table: tables[i % tables.length]._id,
        tableNumber: (i % tables.length) + 1,
        staff: users[1 + (i % 2)]._id,
        staffName: users[1 + (i % 2)].name,
        items: [],
        subtotal,
        total,
        status: 'paid',
        createdAt: orderDate,
        updatedAt: orderDate,
      });
      await order.save({ validateBeforeSave: false });

      // Tạo các OrderItems liên kết tới Order này
      const orderItemIds = [];
      for (const itemTemp of itemsTemplate) {
        const orderItem = await OrderItem.create({
          order: order._id,
          product: itemTemp.product,
          name: itemTemp.name,
          price: itemTemp.price,
          quantity: itemTemp.quantity,
          note: '',
          createdAt: orderDate,
          updatedAt: orderDate
        });
        orderItemIds.push(orderItem._id);

        // Lưu thống kê sản phẩm báo cáo
        const pId = itemTemp.product.toString();
        if (!dailyReportStats[dateStr].productMap[pId]) {
          dailyReportStats[dateStr].productMap[pId] = {
            product: itemTemp.product,
            name: itemTemp.name,
            quantity: 0,
            revenue: 0
          };
        }
        dailyReportStats[dateStr].productMap[pId].quantity += itemTemp.quantity;
        dailyReportStats[dateStr].productMap[pId].revenue += itemTemp.price * itemTemp.quantity;
      }

      // Tạo Payment liên kết tới Order
      const payment = await Payment.create({
        order: order._id,
        amount: total,
        paymentMethod: i % 3 === 0 ? 'transfer' : 'cash',
        status: 'completed',
        paidAt: orderDate,
        createdAt: orderDate,
        updatedAt: orderDate
      });

      // Cập nhật lại Order với items và payment
      order.items = orderItemIds;
      order.payment = payment._id;
      await order.save({ validateBeforeSave: false });

      // Cộng dồn thống kê báo cáo ngày
      dailyReportStats[dateStr].totalRevenue += total;
      dailyReportStats[dateStr].totalOrders += 1;
    }
  }
  console.log(`📋 Created ${orderCount} orders, order items and payments.`);

  // 8. Create Reports
  console.log('🔄 Creating daily reports...');
  for (const [dateKey, stats] of Object.entries(dailyReportStats)) {
    const topProducts = Object.values(stats.productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5); // top 5 sản phẩm bán chạy nhất ngày

    await Report.create({
      date: dateKey,
      totalRevenue: stats.totalRevenue,
      totalOrders: stats.totalOrders,
      topProducts
    });
  }
  console.log(`📊 Created ${Object.keys(dailyReportStats).length} reports.`);

  console.log('\n🎉 Seed completed!');
  console.log('----------------------------');
  console.log('Login: admin@cafe.com / admin123');
  console.log('Staff: minhanh@cafe.com / 123456');
  console.log('----------------------------');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
