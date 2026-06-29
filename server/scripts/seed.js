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
  { name: 'Nước ép', slug: 'nuoc-ep', description: 'Nước ép trái cây nguyên chất thanh nhiệt' },
  { name: 'Trà sữa', slug: 'tra-sua', description: 'Trà sữa trân châu, trà sữa các hương vị béo ngậy' },
  { name: 'Trà hoa quả', slug: 'tra-hoa-qua', description: 'Trà hoa quả tươi mát lạnh giải nhiệt' },
  { name: 'Đồ đá xay', slug: 'do-da-xay', description: 'Các món đá xay mát lạnh sảng khoái' },
  { name: 'Cà phê', slug: 'cafe', description: 'Cà phê truyền thống và cà phê pha máy kiểu Ý' },
  { name: 'Sinh tố', slug: 'sinh-to', description: 'Sinh tố hoa quả tươi thơm ngon bổ dưỡng' },
  { name: 'Bánh ngọt', slug: 'banh-ngot', description: 'Bánh ngọt ăn kèm trà và cà phê' },
  { name: 'Đồ khác...', slug: 'khac', description: 'Đồ đóng lon và đồ ăn vặt nhẹ khác' },
];

const rawProducts = [
  // 1. Nước ép (8 món)
  { name: 'Nước cam ép', price: 35000, categorySlug: 'nuoc-ep', emoji: '🍊', description: 'Cam tươi nguyên chất vắt tay giàu vitamin C', soldCount: 880 },
  { name: 'Nước dưa hấu ép', price: 35000, categorySlug: 'nuoc-ep', emoji: '🍉', description: 'Nước ép dưa hấu đỏ mọng ngọt mát tự nhiên', soldCount: 750 },
  { name: 'Nước dứa ép', price: 35000, categorySlug: 'nuoc-ep', emoji: '🍍', description: 'Dứa tươi ép chua chua ngọt ngọt thơm lừng', soldCount: 540 },
  { name: 'Nước táo ép', price: 40000, categorySlug: 'nuoc-ep', emoji: '🍎', description: 'Nước ép táo đỏ ngọt thanh mát nhẹ', soldCount: 420 },
  { name: 'Nước ép ổi', price: 35000, categorySlug: 'nuoc-ep', emoji: '🍹', description: 'Ổi hồng giàu vitamin ép nguyên chất thơm dịu', soldCount: 620 },
  { name: 'Nước ép bưởi', price: 40000, categorySlug: 'nuoc-ep', emoji: '🍊', description: 'Bưởi da xanh ép chua ngọt nhẹ, đẹp dáng sáng da', soldCount: 390 },
  { name: 'Nước ép cà rốt', price: 30000, categorySlug: 'nuoc-ep', emoji: '🥕', description: 'Cà rốt tươi ép kết hợp mật ong tốt cho mắt', soldCount: 290 },
  { name: 'Nước chanh leo', price: 30000, categorySlug: 'nuoc-ep', emoji: '🍋', description: 'Chanh leo tươi chua ngọt thơm mát lạnh', soldCount: 950 },

  // 2. Trà sữa (8 món)
  { name: 'Trà sữa truyền thống', price: 30000, categorySlug: 'tra-sua', emoji: '🧋', description: 'Trà sữa truyền thống vị đậm đà thơm ngậy', soldCount: 1600 },
  { name: 'Trà sữa Oolong', price: 35000, categorySlug: 'tra-sua', emoji: '🧋', description: 'Trà sữa oolong Taiwan thanh mát hậu vị ngọt', soldCount: 1100 },
  { name: 'Trà sữa Thái xanh', price: 35000, categorySlug: 'tra-sua', emoji: '🧋', description: 'Trà sữa Thái xanh thơm mùi thảo mộc béo ngậy', soldCount: 980 },
  { name: 'Trà sữa Thái đỏ', price: 35000, categorySlug: 'tra-sua', emoji: '🧋', description: 'Trà sữa Thái đỏ chuẩn vị đặc trưng thơm ngon', soldCount: 890 },
  { name: 'Trà sữa trân châu đường đen', price: 45000, categorySlug: 'tra-sua', emoji: '🧋', description: 'Sữa tươi kem béo kết hợp trân châu đường đen dẻo thơm', soldCount: 1750 },
  { name: 'Trà sữa matcha', price: 40000, categorySlug: 'tra-sua', emoji: '🍵', description: 'Trà sữa vị matcha Nhật Bản thơm bùi lạ miệng', soldCount: 710 },
  { name: 'Trà sữa khoai môn', price: 40000, categorySlug: 'tra-sua', emoji: '🧋', description: 'Trà sữa khoai môn ngọt bùi thơm lừng màu tím nhạt', soldCount: 650 },
  { name: 'Trà sữa socola', price: 40000, categorySlug: 'tra-sua', emoji: '🍫', description: 'Trà sữa socola đậm đà thơm ngậy cuốn hút', soldCount: 830 },

  // 3. Trà hoa quả (8 món)
  { name: 'Trà đào cam sả', price: 40000, categorySlug: 'tra-hoa-qua', emoji: '🍑', description: 'Trà đào thơm cùng cam tươi thái lát và sả đập dập', soldCount: 1950 },
  { name: 'Trà vải lài', price: 40000, categorySlug: 'tra-hoa-qua', emoji: '🍹', description: 'Trà hoa nhài thơm thanh khiết cùng quả vải mọng ngọt', soldCount: 720 },
  { name: 'Trà dâu tằm thạch dừa', price: 40000, categorySlug: 'tra-hoa-qua', emoji: '🍓', description: 'Trà dâu tằm chua ngọt giòn dai thạch dừa sần sật', soldCount: 530 },
  { name: 'Trà sen vàng', price: 45000, categorySlug: 'tra-hoa-qua', emoji: '🪷', description: 'Trà oolong thanh khiết cùng hạt sen bùi ngậy củ năng giòn', soldCount: 960 },
  { name: 'Trà thanh long đỏ', price: 40000, categorySlug: 'tra-hoa-qua', emoji: '🍹', description: 'Trà kết hợp nước ép thanh long ruột đỏ màu sắc bắt mắt', soldCount: 410 },
  { name: 'Trà xoài chanh leo', price: 40000, categorySlug: 'tra-hoa-qua', emoji: '🥭', description: 'Sự kết hợp chua ngọt sảng khoái giữa xoài chín và chanh leo', soldCount: 880 },
  { name: 'Trà nhài bưởi hồng', price: 40000, categorySlug: 'tra-hoa-qua', emoji: '🍹', description: 'Trà nhài thanh mát kết hợp tép bưởi hồng ngọt dịu', soldCount: 510 },
  { name: 'Trà kiwi lô hội', price: 40000, categorySlug: 'tra-hoa-qua', emoji: '🥝', description: 'Trà kiwi chua ngọt kèm thạch lô hội giòn mát', soldCount: 460 },

  // 4. Đồ đá xay (8 món)
  { name: 'Matcha đá xay', price: 50000, categorySlug: 'do-da-xay', emoji: '🍵', description: 'Matcha Nhật Bản xay tuyết mịn cùng lớp kem whipping béo', soldCount: 810 },
  { name: 'Chanh tuyết đá xay', price: 40000, categorySlug: 'do-da-xay', emoji: '🍋', description: 'Nước cốt chanh tươi xay tuyết chua chua ngọt ngọt cực đã', soldCount: 1100 },
  { name: 'Socola đá xay', price: 48000, categorySlug: 'do-da-xay', emoji: '🍫', description: 'Socola đậm đà đá xay kèm kem whipping xịt phủ xốt cacao', soldCount: 750 },
  { name: 'Cookie đá xay', price: 48000, categorySlug: 'do-da-xay', emoji: '🍪', description: 'Bánh cookie Oreo xay mịn cùng sữa béo thơm ngon', soldCount: 920 },
  { name: 'Cà phê cốt dừa đá xay', price: 45000, categorySlug: 'do-da-xay', emoji: '🥥', description: 'Cà phê đậm vị hòa cùng sữa dừa đá xay béo thơm nức mũi', soldCount: 1400 },
  { name: 'Xoài cốt dừa đá xay', price: 48000, categorySlug: 'do-da-xay', emoji: '🥭', description: 'Xoài chín mọng ngọt thơm quyện sữa dừa béo ngậy đá xay', soldCount: 530 },
  { name: 'Việt quất đá xay', price: 50000, categorySlug: 'do-da-xay', emoji: '🫐', description: 'Quả việt quất chua ngọt thơm lừng đá xay kem béo ngậy', soldCount: 390 },
  { name: 'Bạc hà socola đá xay', price: 48000, categorySlug: 'do-da-xay', emoji: '🌱', description: 'Hương bạc hà mát lạnh hòa cùng vụn socola đắng đá xay', soldCount: 310 },

  // 5. Cà phê (8 món)
  { name: 'Cà phê sữa đá', price: 30000, categorySlug: 'cafe', emoji: '☕', description: 'Cà phê phin truyền thống hòa cùng sữa đặc sánh mịn', soldCount: 2200 },
  { name: 'Cà phê đen đá', price: 25000, categorySlug: 'cafe', emoji: '☕', description: 'Cà phê đen phin nguyên chất đậm đà sảng khoái', soldCount: 1800 },
  { name: 'Bạc xỉu', price: 32000, categorySlug: 'cafe', emoji: '☕', description: 'Thức uống truyền thống từ nhiều sữa tươi sữa đặc và ít cà phê', soldCount: 1950 },
  { name: 'Cà phê muối', price: 35000, categorySlug: 'cafe', emoji: '☕', description: 'Cà phê phin thơm lừng phủ lớp kem mặn béo ngậy', soldCount: 2400 },
  { name: 'Cà phê trứng', price: 40000, categorySlug: 'cafe', emoji: '☕', description: 'Cà phê nóng đậm đà phủ lớp kem lòng đỏ trứng đánh bông mịn', soldCount: 520 },
  { name: 'Espresso', price: 35000, categorySlug: 'cafe', emoji: '☕', description: 'Cà phê Espresso pha máy nguyên chất đậm vị kiểu Ý', soldCount: 910 },
  { name: 'Cappuccino', price: 45000, categorySlug: 'cafe', emoji: '☕', description: 'Espresso thơm cùng sữa tươi và lớp bọt sữa dày mịn béo', soldCount: 780 },
  { name: 'Latte', price: 45000, categorySlug: 'cafe', emoji: '☕', description: 'Espresso cùng nhiều sữa tươi nóng vẽ hình nghệ thuật', soldCount: 820 },

  // 6. Sinh tố (8 món)
  { name: 'Sinh tố bơ sáp', price: 45000, categorySlug: 'sinh-to', emoji: '🥑', description: 'Bơ sáp Đắk Lắk béo dẻo xay mịn cùng sữa đặc sữa tươi', soldCount: 880 },
  { name: 'Sinh tố dâu tây', price: 45000, categorySlug: 'sinh-to', emoji: '🍓', description: 'Dâu tây tươi Đà Lạt chua ngọt xay mịn cùng sữa chua', soldCount: 740 },
  { name: 'Sinh tố xoài chín', price: 45000, categorySlug: 'sinh-to', emoji: '🥭', description: 'Xoài chín thơm ngọt lịm xay nhuyễn béo bùi sữa đặc', soldCount: 680 },
  { name: 'Sinh tố việt quất', price: 50000, categorySlug: 'sinh-to', emoji: '🫐', description: 'Sinh tố việt quất nhập khẩu chua ngọt mát lành bổ dưỡng', soldCount: 420 },
  { name: 'Sinh tố chuối bơ lạc', price: 45000, categorySlug: 'sinh-to', emoji: '🍌', description: 'Chuối chín thơm ngậy cùng bơ đậu phộng dồi dào năng lượng', soldCount: 310 },
  { name: 'Sinh tố mãng cầu', price: 45000, categorySlug: 'sinh-to', emoji: '🥭', description: 'Mãng cầu xiêm chua chua ngọt ngọt xay sữa đặc thơm béo', soldCount: 590 },
  { name: 'Sinh tố sapoche', price: 45000, categorySlug: 'sinh-to', emoji: '🥔', description: 'Sapoche (hồng xiêm) chín ngọt lịm thơm ngậy sữa tươi', soldCount: 450 },
  { name: 'Sinh tố dừa xiêm', price: 40000, categorySlug: 'sinh-to', emoji: '🥥', description: 'Cơm dừa xiêm dẻo bùi xay đá mịn ngọt dịu sữa đặc', soldCount: 610 },

  // 7. Bánh ngọt (8 món)
  { name: 'Bánh tiramisu', price: 45000, categorySlug: 'banh-ngot', emoji: '🍰', description: 'Bánh ngọt vị cà phê cacao kem béo ngậy kiểu Ý', soldCount: 610 },
  { name: 'Bánh croissant bơ tỏi', price: 30000, categorySlug: 'banh-ngot', emoji: '🥐', description: 'Bánh sừng bò ngàn lớp nướng giòn thơm lừng bơ tỏi', soldCount: 520 },
  { name: 'Cheesecake dâu tây', price: 50000, categorySlug: 'banh-ngot', emoji: '🍰', description: 'Bánh phô mai nướng mềm mịn phủ xốt dâu tây đỏ mọng', soldCount: 410 },
  { name: 'Mousse chanh leo', price: 45000, categorySlug: 'banh-ngot', emoji: '🧁', description: 'Bánh mousse mát lịm thơm lừng chua ngọt chanh leo', soldCount: 390 },
  { name: 'Muffin socola', price: 35000, categorySlug: 'banh-ngot', emoji: '🧁', description: 'Muffin xốp mềm ngập tràn socola chip đắng nhẹ ngọt ngào', soldCount: 330 },
  { name: 'Bánh su kem vani', price: 25000, categorySlug: 'banh-ngot', emoji: '🥯', description: 'Vỏ su giòn nhẹ ôm lớp nhân kem vani ngọt dịu mát lạnh', soldCount: 820 },
  { name: 'Bánh tart trứng', price: 30000, categorySlug: 'banh-ngot', emoji: '🥮', description: 'Bánh tart vỏ ngàn lớp giòn rụm nhân custard trứng béo thơm', soldCount: 740 },
  { name: 'Bánh Red Velvet', price: 50000, categorySlug: 'banh-ngot', emoji: '🍰', description: 'Bánh ngọt màu nhung đỏ quyến rũ xen kem phô mai béo ngậy', soldCount: 290 },

  // 8. Đồ khác... (8 món)
  { name: 'Coca-Cola lon', price: 20000, categorySlug: 'khac', emoji: '🥤', description: 'Nước ngọt giải khát có ga lon 330ml mát lạnh', soldCount: 1200 },
  { name: 'Pepsi lon', price: 20000, categorySlug: 'khac', emoji: '🥤', description: 'Nước giải khát Pepsi có ga lon 330ml sảng khoái', soldCount: 950 },
  { name: 'Nước khoáng Aquafina', price: 15000, categorySlug: 'khac', emoji: '💧', description: 'Nước uống tinh khiết Aquafina đóng chai 500ml', soldCount: 1900 },
  { name: 'Hạt hướng dương', price: 20000, categorySlug: 'khac', emoji: '🌻', description: 'Đĩa hướng dương rang giòn tí tách trò chuyện', soldCount: 2500 },
  { name: 'Khô bò lá chanh', price: 45000, categorySlug: 'khac', emoji: '🥩', description: 'Thịt bò khô xé sợi cay cay thơm mùi lá chanh sấy', soldCount: 1100 },
  { name: 'Khô gà bơ tỏi', price: 35000, categorySlug: 'khac', emoji: '🐔', description: 'Thịt gà xé cay giòn thơm bùi tỏi sấy giòn rụm', soldCount: 930 },
  { name: 'Khoai tây chiên', price: 30000, categorySlug: 'khac', emoji: '🍟', description: 'Khoai tây chiên lát dày giòn rụm kèm tương cà tương ớt', soldCount: 710 },
  { name: 'Nem chua rán', price: 40000, categorySlug: 'khac', emoji: '🌭', description: 'Nem chua rán Hà Nội chiên xù nóng hổi (đĩa 5 chiếc)', soldCount: 980 },
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
  const users = await User.create([
    { name: 'Admin', email: 'admin@cafe.com', password: 'admin123', role: adminRole._id, phone: '0901234567', shift: 'Toàn thời gian' },
    { name: 'Nguyễn Minh Anh', email: 'minhanh@cafe.com', password: '123456', role: staffRole._id, phone: '0912345678', shift: 'Sáng 7-15h' },
    { name: 'Trần Thanh Hà', email: 'thanhha@cafe.com', password: '123456', role: staffRole._id, phone: '0923456789', shift: 'Chiều 13-21h' },
    { name: 'Lê Văn Đức', email: 'vanduc@cafe.com', password: '123456', role: cashierRole._id, phone: '0934567890', shift: 'Chiều 13-21h' },
  ]);
  console.log(`👥 Created ${users.length} users`);

  // 4. Create Categories
  const categories = await Category.create(initialCategories);
  console.log(`🏷️  Created ${categories.length} categories`);

  // 5. Create Products (64 products)
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

  // 6. Create 20 Tables (Không lưu sức chứa / để mặc định)
  const tableData = Array.from({ length: 20 }, (_, i) => ({
    number: i + 1,
    name: `Bàn ${i + 1}`,
    capacity: 4 // Sức chứa mặc định nhưng không hiển thị trên UI
  }));
  const tables = await Table.create(tableData);
  console.log(`🪑 Created ${tables.length} tables`);

  // 7. Seed Orders, OrderItems and Payments in bulk for the last 1 year (365 days)
  console.log('🔄 Preparing 1 year of sales data...');
  
  const ordersToInsert = [];
  const orderItemsToInsert = [];
  const paymentsToInsert = [];
  const dailyReportStats = {}; // { 'YYYY-MM-DD': { totalRevenue, totalOrders, productMap: { productId: { name, quantity, revenue } } } }

  let orderCount = 0;

  for (let day = 365; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];

    dailyReportStats[dateStr] = {
      totalRevenue: 0,
      totalOrders: 0,
      productMap: {}
    };

    // Số lượng đơn hàng mỗi ngày ngẫu nhiên từ 15 đến 30 đơn
    const ordersInDay = 15 + Math.floor(Math.random() * 16);
    
    for (let i = 0; i < ordersInDay; i++) {
      // Chọn ngẫu nhiên từ 1 đến 4 món cho đơn hàng
      const numberOfItems = 1 + Math.floor(Math.random() * 4);
      const chosenProducts = [];
      const usedIndexes = new Set();
      
      while (chosenProducts.length < numberOfItems) {
        const randIdx = Math.floor(Math.random() * createdProducts.length);
        if (!usedIndexes.has(randIdx)) {
          usedIndexes.add(randIdx);
          chosenProducts.push(createdProducts[randIdx]);
        }
      }

      const itemsTemplate = chosenProducts.map(p => ({
        product: p._id,
        name: p.name,
        price: p.price,
        quantity: 1 + Math.floor(Math.random() * 3) // 1 đến 3 phần
      }));

      const subtotal = itemsTemplate.reduce((s, it) => s + it.price * it.quantity, 0);
      const discount = Math.random() > 0.85 ? (Math.random() > 0.5 ? 20000 : 50000) : 0;
      const total = Math.max(0, subtotal - discount);

      // Thời gian đơn hàng ngẫu nhiên từ 7h sáng đến 22h tối
      const h = 7 + Math.floor(Math.random() * 16);
      const orderDate = new Date(date);
      orderDate.setHours(h, Math.floor(Math.random() * 59), Math.floor(Math.random() * 59), 0);

      orderCount++;
      const orderCode = `#${String(orderCount).padStart(5, '0')}`;

      // Sinh sẵn IDs
      const orderId = new mongoose.Types.ObjectId();
      const paymentId = new mongoose.Types.ObjectId();
      const orderItemIds = [];

      // Tạo các OrderItem docs
      for (const itemTemp of itemsTemplate) {
        const orderItemId = new mongoose.Types.ObjectId();
        orderItemIds.push(orderItemId);
        
        orderItemsToInsert.push({
          _id: orderItemId,
          order: orderId,
          product: itemTemp.product,
          name: itemTemp.name,
          price: itemTemp.price,
          quantity: itemTemp.quantity,
          note: '',
          createdAt: orderDate,
          updatedAt: orderDate
        });

        // Tích lũy báo cáo ngày
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

      // Tạo Order doc
      ordersToInsert.push({
        _id: orderId,
        orderCode,
        type: Math.random() > 0.2 ? 'dine-in' : 'takeaway',
        table: tables[i % tables.length]._id,
        tableNumber: (i % tables.length) + 1,
        staff: users[1 + (i % 3)]._id,
        staffName: users[1 + (i % 3)].name,
        items: orderItemIds,
        subtotal,
        discount,
        total,
        status: 'paid',
        payment: paymentId,
        createdAt: orderDate,
        updatedAt: orderDate
      });

      // Tạo Payment doc
      paymentsToInsert.push({
        _id: paymentId,
        order: orderId,
        amount: total,
        paymentMethod: Math.random() > 0.45 ? 'transfer' : 'cash',
        status: 'completed',
        paidAt: orderDate,
        createdAt: orderDate,
        updatedAt: orderDate
      });

      // Cộng dồn thống kê báo cáo ngày
      dailyReportStats[dateStr].totalRevenue += total;
      dailyReportStats[dateStr].totalOrders += 1;
    }
  }

  console.log(`💾 Inserting ${ordersToInsert.length} Orders, ${orderItemsToInsert.length} Items and ${paymentsToInsert.length} Payments into database...`);
  
  // Thực hiện insert bulk vô cùng nhanh chóng
  await Promise.all([
    Order.insertMany(ordersToInsert),
    OrderItem.insertMany(orderItemsToInsert),
    Payment.insertMany(paymentsToInsert)
  ]);
  console.log('✅ Bulk insert sales data completed successfully!');

  // 8. Create Reports
  console.log('🔄 Creating daily reports...');
  const reportsToInsert = [];
  for (const [dateKey, stats] of Object.entries(dailyReportStats)) {
    const topProducts = Object.values(stats.productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5); // top 5 sản phẩm bán chạy nhất ngày

    reportsToInsert.push({
      date: dateKey,
      totalRevenue: stats.totalRevenue,
      totalOrders: stats.totalOrders,
      topProducts
    });
  }
  
  await Report.insertMany(reportsToInsert);
  console.log(`📊 Created ${reportsToInsert.length} daily reports.`);

  console.log('\n🎉 Seed completed successfully!');
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
