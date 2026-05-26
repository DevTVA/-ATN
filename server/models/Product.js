import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ['cafe', 'tra-sua', 'banh-ngot', 'nuoc-ep', 'khac'],
      required: true,
    },
    image: { type: String, default: '' },
    emoji: { type: String, default: '☕' },
    isAvailable: { type: Boolean, default: true },
    soldCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);
