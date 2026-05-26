import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });

  if (!user.isActive)
    return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hoá' });

  res.json({ token: signToken(user._id), user });
});

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, shift } = req.body;
  const emailExists = await User.findOne({ email });
  if (emailExists) return res.status(400).json({ message: 'Email đã được sử dụng' });

  if (phone) {
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) return res.status(400).json({ message: 'Số điện thoại đã được sử dụng' });
  }

  const user = await User.create({ name, email, password, role, phone, shift });
  res.status(201).json({ token: signToken(user._id), user });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

// PUT /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!(await user.matchPassword(oldPassword)))
    return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Đổi mật khẩu thành công' });
});
