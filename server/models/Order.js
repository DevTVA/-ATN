import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  note: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, unique: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    tableNumber: { type: Number, required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    staffName: { type: String },
    items: [orderItemSchema],
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'cancelled'],
      default: 'pending',
    },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['cash', 'card', 'transfer'], default: 'cash' },
    note: { type: String, default: '' },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// Auto generate order code
orderSchema.pre('save', async function (next) {
  if (!this.orderCode) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderCode = `#${String(count + 1).padStart(4, '0')}`;
  }
  // Recalculate totals
  this.subtotal = this.items.reduce((s, i) => s + i.price * i.quantity, 0);
  this.total = this.subtotal - this.discount;
  next();
});

export default mongoose.model('Order', orderSchema);
