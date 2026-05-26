import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';

const products = [
  { name: 'Cà phê sữa đá', price: 30000, category: 'cafe', emoji: '☕', description: 'Cà phê phin truyền thống pha với sữa đặc', soldCount: 120 },
  { name: 'Espresso', price: 35000, category: 'cafe', emoji: '☕', description: 'Cà phê espresso nguyên chất đậm đà', soldCount: 80 },
  { name: 'Cappuccino', price: 45000, category: 'cafe', emoji: '☕', description: 'Espresso với foam sữa mịn béo', soldCount: 95 },
  { name: 'Latte', price: 45000, category: 'cafe', emoji: '☕', description: 'Espresso với sữa tươi nóng', soldCount: 70 },
  { name: 'Americano', price: 35000, category: 'cafe', emoji: '☕', description: 'Espresso pha loãng với nước nóng', soldCount: 55 },
  { name: 'Cold Brew', price: 50000, category: 'cafe', emoji: '🧊', description: 'Cà phê ủ lạnh 12 giờ', soldCount: 40 },
  { name: 'Trà sữa Oolong', price: 35000, category: 'tra-sua', emoji: '🧋', description: 'Trà Oolong Taiwan pha sữa tươi', soldCount: 110 },
  { name: 'Trà sữa Thái', price: 35000, category: 'tra-sua', emoji: '🧋', description: 'Trà Thái đặc trưng màu cam', soldCount: 90 },
  { name: 'Trà đào cam sả', price: 40000, category: 'tra-sua', emoji: '🍑', description: 'Trà đào thơm kết hợp sả tươi', soldCount: 75 },
  { name: 'Matcha latte', price: 50000, category: 'tra-sua', emoji: '🍵', description: 'Matcha Nhật Bản nguyên chất', soldCount: 60 },
  { name: 'Bánh tiramisu', price: 45000, category: 'banh-ngot', emoji: '🍰', description: 'Tiramisu kiểu Ý truyền thống', soldCount: 50 },
  { name: 'Bánh croissant', price: 30000, category: 'banh-ngot', emoji: '🥐', description: 'Bánh croissant bơ giòn thơm', soldCount: 45 },
  { name: 'Cheesecake', price: 50000, category: 'banh-ngot', emoji: '🍰', description: 'Cheesecake New York béo ngậy', soldCount: 35 },
  { name: 'Nước cam ép', price: 35000, category: 'nuoc-ep', emoji: '🍊', description: 'Cam ép tươi nguyên chất', soldCount: 30 },
  { name: 'Sinh tố bơ', price: 45000, category: 'nuoc-ep', emoji: '🥑', description: 'Bơ sữa đặc mịn béo', soldCount: 25 },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Clear
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Table.deleteMany({}),
    Order.deleteMany({}),
  ]);
  console.log('🗑️  Cleared old data');

  // Users
  const users = await User.create([
    { name: 'Admin', email: 'admin@cafe.com', password: 'admin123', role: 'admin', phone: '0901234567', shift: 'Toàn thời gian' },
    { name: 'Nguyễn Minh Anh', email: 'minhanh@cafe.com', password: '123456', role: 'staff', phone: '0912345678', shift: 'Sáng 7-15h' },
    { name: 'Trần Thanh Hà', email: 'thanhha@cafe.com', password: '123456', role: 'staff', phone: '0923456789', shift: 'Chiều 13-21h' },
    { name: 'Lê Văn Đức', email: 'vanduc@cafe.com', password: '123456', role: 'cashier', phone: '0934567890', shift: 'Chiều 13-21h' },
  ]);
  console.log(`👥 Created ${users.length} users`);

  // Products
  const createdProducts = await Product.create(products);
  console.log(`☕ Created ${createdProducts.length} products`);

  // Tables
  const tableData = Array.from({ length: 15 }, (_, i) => ({
    number: i + 1,
    name: `Bàn ${i + 1}`,
    capacity: i < 3 ? 2 : i < 10 ? 4 : 6,
  }));
  const tables = await Table.create(tableData);
  console.log(`🪑 Created ${tables.length} tables`);

  // Sample orders (last 7 days)
  const orderItems = [
    [{ product: createdProducts[0]._id, name: createdProducts[0].name, price: 30000, quantity: 2 },
     { product: createdProducts[6]._id, name: createdProducts[6].name, price: 35000, quantity: 1 }],
    [{ product: createdProducts[2]._id, name: createdProducts[2].name, price: 45000, quantity: 2 },
     { product: createdProducts[10]._id, name: createdProducts[10].name, price: 45000, quantity: 2 }],
    [{ product: createdProducts[3]._id, name: createdProducts[3].name, price: 45000, quantity: 1 },
     { product: createdProducts[7]._id, name: createdProducts[7].name, price: 35000, quantity: 2 }],
  ];

  const ordersToCreate = [];
  for (let day = 6; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    for (let i = 0; i < 5 + Math.floor(Math.random() * 5); i++) {
      const items = orderItems[i % orderItems.length];
      const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
      const h = 8 + Math.floor(Math.random() * 12);
      const orderDate = new Date(date);
      orderDate.setHours(h, Math.floor(Math.random() * 59), 0, 0);
      ordersToCreate.push({
        table: tables[i % tables.length]._id,
        tableNumber: (i % tables.length) + 1,
        staff: users[1 + (i % 2)]._id,
        staffName: users[1 + (i % 2)].name,
        items,
        subtotal,
        total: subtotal,
        status: 'paid',
        paymentMethod: i % 3 === 0 ? 'transfer' : 'cash',
        paidAt: orderDate,
        createdAt: orderDate,
        updatedAt: orderDate,
      });
    }
  }

  // Insert without triggering pre-save (to preserve createdAt)
  const orderCount = await Order.countDocuments();
  const ordersWithCodes = ordersToCreate.map((o, i) => ({
    ...o,
    orderCode: `#${String(orderCount + i + 1).padStart(4, '0')}`,
  }));
  await Order.insertMany(ordersWithCodes);
  console.log(`📋 Created ${ordersWithCodes.length} sample orders`);

  console.log('\n🎉 Seed completed!');
  console.log('----------------------------');
  console.log('Login: admin@cafe.com / admin123');
  console.log('Staff: minhanh@cafe.com / 123456');
  console.log('----------------------------');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
