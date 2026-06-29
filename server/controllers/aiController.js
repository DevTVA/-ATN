import { GoogleGenerativeAI } from '@google/generative-ai';
import asyncHandler from 'express-async-handler';
import Report from '../models/Report.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

// Các hàm truy vấn database thực tế phục vụ AI Function Calling
const getRevenueReport = async ({ startDate, endDate }) => {
  try {
    const reports = await Report.find({ date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 });
    const totalRevenue = reports.reduce((sum, r) => sum + r.totalRevenue, 0);
    const totalOrders = reports.reduce((sum, r) => sum + r.totalOrders, 0);
    return {
      success: true,
      startDate,
      endDate,
      totalRevenue,
      totalOrders,
      details: reports.map(r => ({ date: r.date, revenue: r.totalRevenue, orders: r.totalOrders }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const getTopSellingProducts = async ({ startDate, endDate, limit = 5 }) => {
  try {
    const reports = await Report.find({ date: { $gte: startDate, $lte: endDate } });
    const productStats = {};
    for (const r of reports) {
      for (const p of r.topProducts) {
        const pId = p.product?.toString() || p.name;
        if (!productStats[pId]) {
          productStats[pId] = { name: p.name, quantity: 0, revenue: 0 };
        }
        productStats[pId].quantity += p.quantity;
        productStats[pId].revenue += p.revenue;
      }
    }
    const sorted = Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
    return {
      success: true,
      startDate,
      endDate,
      products: sorted
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const getTablesStatus = async () => {
  try {
    const tables = await Table.find().populate({
      path: 'currentOrder',
      select: 'orderCode total'
    });
    const total = tables.length;
    const empty = tables.filter(t => t.status === 'empty').length;
    const occupied = tables.filter(t => t.status === 'occupied').length;
    const reserved = tables.filter(t => t.status === 'reserved').length;
    return {
      success: true,
      summary: { total, empty, occupied, reserved },
      tables: tables.map(t => ({
        number: t.number,
        name: t.name,
        status: t.status === 'empty' ? 'Trống' : t.status === 'occupied' ? 'Đang phục vụ' : 'Đã đặt',
        orderCode: t.currentOrder?.orderCode || null,
        total: t.currentOrder?.total || 0
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const getRecentOrders = async ({ limit = 5 }) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('staff', 'name')
      .populate('payment');
    return {
      success: true,
      orders: orders.map(o => ({
        orderCode: o.orderCode,
        type: o.type === 'dine-in' ? 'Tại bàn' : 'Mang về',
        tableNumber: o.tableNumber || null,
        staffName: o.staffName || o.staff?.name || '—',
        total: o.total,
        status: o.status === 'paid' ? 'Đã thanh toán' : o.status === 'cancelled' ? 'Đã huỷ' : 'Đang pha chế',
        paymentMethod: o.payment?.paymentMethod || 'cash',
        createdAt: o.createdAt
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Định nghĩa công cụ (Tools) cho Gemini API
const getRevenueReportDeclaration = {
  name: "getRevenueReport",
  description: "Lấy báo cáo doanh thu và số lượng đơn hàng của quán cafe trong một khoảng thời gian cụ thể (startDate đến endDate). Cần truyền ngày định dạng YYYY-MM-DD.",
  parameters: {
    type: "OBJECT",
    properties: {
      startDate: { type: "STRING", description: "Ngày bắt đầu, định dạng YYYY-MM-DD (ví dụ: '2026-06-01')" },
      endDate: { type: "STRING", description: "Ngày kết thúc, định dạng YYYY-MM-DD (ví dụ: '2026-06-30')" }
    },
    required: ["startDate", "endDate"]
  }
};

const getTopSellingProductsDeclaration = {
  name: "getTopSellingProducts",
  description: "Lấy danh sách các sản phẩm/đồ uống bán chạy nhất trong một khoảng thời gian cụ thể (startDate đến endDate).",
  parameters: {
    type: "OBJECT",
    properties: {
      startDate: { type: "STRING", description: "Ngày bắt đầu, định dạng YYYY-MM-DD" },
      endDate: { type: "STRING", description: "Ngày kết thúc, định dạng YYYY-MM-DD" },
      limit: { type: "INTEGER", description: "Số lượng sản phẩm muốn lấy, mặc định là 5" }
    },
    required: ["startDate", "endDate"]
  }
};

const getTablesStatusDeclaration = {
  name: "getTablesStatus",
  description: "Lấy thông tin trạng thái hoạt động hiện tại của tất cả các bàn trong quán cafe (bàn trống, bàn đang phục vụ, bàn đã đặt).",
  parameters: {
    type: "OBJECT",
    properties: {}
  }
};

const getRecentOrdersDeclaration = {
  name: "getRecentOrders",
  description: "Lấy danh sách các đơn hàng mới phát sinh gần đây nhất.",
  parameters: {
    type: "OBJECT",
    properties: {
      limit: { type: "INTEGER", description: "Số lượng đơn hàng muốn lấy, mặc định là 5" }
    }
  }
};

const dbFunctions = {
  getRevenueReport,
  getTopSellingProducts,
  getTablesStatus,
  getRecentOrders
};

// POST /api/ai/chat
export const chatWithAI = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ message: 'Vui lòng cung cấp nội dung tin nhắn' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback nếu không cấu hình GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_actual_api_key_here') {
    return res.json({
      reply: `🤖 **Brew & Co. AI Chatbot (Chế độ Demo)**\n\nHệ thống phát hiện thấy bạn chưa cấu hình khóa API trong file \`server/.env\`.\n\n### Hướng dẫn cấu hình hoạt động:\n1. Truy cập [Google AI Studio](https://aistudio.google.com/) để nhận mã khóa API miễn phí.\n2. Mở file \`server/.env\` và thêm dòng:\n   \`\`\`env\n   GEMINI_API_KEY=mã_khóa_api_của_bạn\n   \`\`\`\n3. Khởi động lại server để bắt đầu trải nghiệm AI chatbot thông minh phân tích dữ liệu thực tế.\n\n---\n*Dưới đây là một số câu trả lời mẫu dựa trên câu hỏi của bạn:*\n* Bạn hỏi: "${message}"\n* Để kiểm tra trạng thái bàn hiện tại, bạn có thể chuyển qua tab **Sơ đồ bàn**.\n* Để xem chi tiết doanh thu thực tế, vui lòng truy cập trang **Báo cáo doanh thu**.`
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const todayStr = new Date().toISOString().split('T')[0];

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      tools: [{
        functionDeclarations: [
          getRevenueReportDeclaration,
          getTopSellingProductsDeclaration,
          getTablesStatusDeclaration,
          getRecentOrdersDeclaration
        ]
      }],
      systemInstruction: `Bạn là một AI Trợ lý Báo cáo Thông minh tại quán cafe Brew & Co. (địa chỉ Liên Minh, Đan Phượng, Hà Nội - SĐT: 0963664924).
Nhiệm vụ của bạn là hỗ trợ chủ quán và nhân viên tra cứu, phân tích số liệu doanh thu, bán hàng, trạng thái bàn.
Hãy trả lời bằng tiếng Việt thân thiện, chuyên nghiệp, lịch sự.
Sử dụng các định dạng danh sách hoặc bảng biểu markdown để hiển thị các số liệu thống kê cho sạch sẽ, trực quan, dễ theo dõi.
Hãy luôn ưu tiên sử dụng các tools (hàm) được cung cấp để lấy dữ liệu thực tế từ cơ sở dữ liệu trước khi trả lời.
Nếu thông tin do tool trả về có dạng tiền tệ, hãy định dạng thành VNĐ (ví dụ: 120.000đ).
Hôm nay là ngày: ${todayStr} (ngày 30 tháng 6 năm 2026). Khi người dùng hỏi về tuần này, tháng này, hôm qua, hãy tính toán khoảng ngày tương ứng dựa trên ngày hôm nay để truyền vào các đối số của hàm.`
    });

    const chat = model.startChat();
    let result = await chat.sendMessage(message);
    let response = result.response;

    // Xử lý Function Callings nếu Gemini yêu cầu
    const functionCalls = typeof response.functionCalls === 'function'
      ? response.functionCalls()
      : response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const fnName = call.name;
      const fnArgs = call.args;

      console.log(`🤖 AI requested calling tool: ${fnName} with args:`, fnArgs);

      // Thực thi gọi hàm lấy dữ liệu từ MongoDB
      let fnResult;
      if (dbFunctions[fnName]) {
        fnResult = await dbFunctions[fnName](fnArgs);
      } else {
        fnResult = { success: false, error: "Function not found" };
      }

      console.log(`🤖 DB result for ${fnName}:`, fnResult);

      // Gửi kết quả hàm ngược lại cho Gemini
      const responseParts = [
        {
          functionResponse: {
            name: fnName,
            response: { result: fnResult }
          }
        }
      ];

      const finalResult = await chat.sendMessage(responseParts);
      return res.json({ reply: finalResult.response.text() });
    }

    return res.json({ reply: response.text() });
  } catch (error) {
    console.error('❌ AI Chatbot Error:', error);
    return res.status(500).json({
      message: 'Lỗi hệ thống khi xử lý AI Chatbot',
      error: error.message
    });
  }
});
