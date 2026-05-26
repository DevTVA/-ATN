import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    name: { type: String, default: '' },
    capacity: { type: Number, default: 4 },
    status: {
      type: String,
      enum: ['empty', 'occupied', 'reserved'],
      default: 'empty',
    },
    currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Table', tableSchema);
