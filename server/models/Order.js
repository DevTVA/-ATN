import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, unique: true },
    type: { type: String, enum: ['dine-in', 'takeaway'], default: 'dine-in' },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
    tableNumber: { type: Number },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    staffName: { type: String },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem' }],
    status: {
      type: String,
      enum: ['processing', 'paid', 'cancelled'],
      default: 'processing',
    },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto generate order code
orderSchema.pre('save', async function (next) {
  if (!this.orderCode) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderCode = `#${String(count + 1).padStart(4, '0')}`;
  }
  // Tiền sẽ được tính toán trực tiếp trong Controller khi tạo/cập nhật đơn hàng và lưu vào các trường subtotal/total
  next();
});

export default mongoose.model('Order', orderSchema);
