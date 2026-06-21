import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // VD: Cà phê, Trà sữa, Bánh ngọt...
    slug: { type: String, required: true, unique: true }, // VD: cafe, tra-sua, banh-ngot...
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
