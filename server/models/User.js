import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    rawPassword: { type: String, default: '' },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    phone: { type: String, default: '' },
    shift: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.rawPassword = this.password;
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  if (obj.role && typeof obj.role === 'object' && obj.role.name) {
    obj.role = obj.role.name;
  }
  return obj;
};

export default mongoose.model('User', userSchema);
