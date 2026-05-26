# ☕ Brew & Co. — Hệ thống quản lý quán cà phê

Ứng dụng web fullstack quản lý quán cà phê sử dụng MERN Stack (MongoDB, Express, React, Node.js).

---

## 🚀 Cài đặt & Chạy

### Yêu cầu
- Node.js >= 18
- MongoDB (local hoặc MongoDB Atlas)

### Bước 1: Cài dependencies

```bash
npm run install:all
```

### Bước 2: Cấu hình môi trường

Mở file `server/.env` và cập nhật:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cafe-manager
JWT_SECRET=cafe_manager_super_secret_key_2024
NODE_ENV=development
```

> Nếu dùng **MongoDB Atlas**, thay `MONGODB_URI` bằng connection string của bạn.

### Bước 3: Seed dữ liệu mẫu (tuỳ chọn)

```bash
npm run seed
```

Tạo sẵn:
- 4 tài khoản (1 admin + 3 nhân viên)
- 15 sản phẩm (cà phê, trà sữa, bánh, nước ép)
- 15 bàn
- ~60 đơn hàng mẫu (7 ngày gần nhất)

### Bước 4: Chạy ứng dụng

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

---

## 🔑 Tài khoản demo

| Vai trò   | Email               | Mật khẩu   |
|-----------|---------------------|------------|
| Admin     | admin@cafe.com      | admin123   |
| Nhân viên | minhanh@cafe.com    | 123456     |
| Nhân viên | thanhha@cafe.com    | 123456     |
| Thu ngân  | vanduc@cafe.com     | 123456     |

---

## 📁 Cấu trúc dự án

```
cafe-manager/
├── server/                  # Backend Node.js + Express
│   ├── controllers/         # Business logic
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API routes
│   ├── middleware/          # JWT auth middleware
│   ├── scripts/seed.js      # Dữ liệu mẫu
│   └── index.js             # Entry point
│
└── client/                  # Frontend React + Vite
    └── src/
        ├── pages/           # Dashboard, Products, Orders, Tables, Users, Revenue
        ├── components/      # UI components, Layout
        ├── store/           # Zustand state management
        ├── api/             # Axios instance
        └── utils/           # Helper functions
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint                    | Mô tả              |
|--------|-----------------------------|--------------------|
| POST   | /api/auth/login             | Đăng nhập          |
| POST   | /api/auth/register          | Đăng ký            |
| GET    | /api/auth/me                | Lấy thông tin user |
| PUT    | /api/auth/change-password   | Đổi mật khẩu       |

### Products
| Method | Endpoint             | Quyền  |
|--------|----------------------|--------|
| GET    | /api/products        | All    |
| POST   | /api/products        | Admin  |
| PUT    | /api/products/:id    | Admin  |
| DELETE | /api/products/:id    | Admin  |

### Orders
| Method | Endpoint          | Quyền  |
|--------|-------------------|--------|
| GET    | /api/orders       | All    |
| POST   | /api/orders       | All    |
| PUT    | /api/orders/:id   | All    |
| DELETE | /api/orders/:id   | Admin  |

### Tables
| Method | Endpoint          | Quyền  |
|--------|-------------------|--------|
| GET    | /api/tables       | All    |
| POST   | /api/tables       | Admin  |
| PUT    | /api/tables/:id   | All    |
| DELETE | /api/tables/:id   | Admin  |

### Users
| Method | Endpoint                        | Quyền  |
|--------|---------------------------------|--------|
| GET    | /api/users                      | Admin  |
| POST   | /api/users                      | Admin  |
| PUT    | /api/users/:id                  | Admin  |
| PUT    | /api/users/:id/reset-password   | Admin  |
| DELETE | /api/users/:id                  | Admin  |

### Revenue
| Method | Endpoint                          | Quyền  |
|--------|-----------------------------------|--------|
| GET    | /api/revenue?period=day\|month\|year | Admin  |

---

## ⚙️ Công nghệ sử dụng

**Frontend**
- React 18 + Vite
- Tailwind CSS
- React Router v6
- Zustand (state management)
- Recharts (biểu đồ)
- Axios
- React Hot Toast

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs
- Morgan (logging)
