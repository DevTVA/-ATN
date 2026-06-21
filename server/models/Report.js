import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // Ngày báo cáo dạng YYYY-MM-DD
    totalRevenue: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    topProducts: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: { type: String },
        quantity: { type: Number },
        revenue: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Report', reportSchema);
