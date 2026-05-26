import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
  res.json(user);
});

export const createUser = asyncHandler(async (req, res) => {
  const exists = await User.findOne({ email: req.body.email });
  if (exists) return res.status(400).json({ message: 'Email đã được sử dụng' });
  const user = await User.create(req.body);
  res.status(201).json(user);
});

export const updateUser = asyncHandler(async (req, res) => {
  // Don't allow password update via this route
  delete req.body.password;
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!user) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
  res.json(user);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Đặt lại mật khẩu thành công' });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString())
    return res.status(400).json({ message: 'Không thể xoá chính mình' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Đã xoá nhân viên' });
});
