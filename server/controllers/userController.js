import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Role from '../models/Role.js';

export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().populate('role').sort({ createdAt: -1 });
  res.json(users);
});

// GET /api/users/roles
export const getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find().sort({ name: 1 });
  res.json(roles);
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('role');
  if (!user) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
  res.json(user);
});

export const createUser = asyncHandler(async (req, res) => {
  const { email, phone, role } = req.body;
  const emailExists = await User.findOne({ email });
  if (emailExists) return res.status(400).json({ message: 'Email đã được sử dụng' });

  if (phone) {
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) return res.status(400).json({ message: 'Số điện thoại đã được sử dụng' });
  }

  // Ánh xạ role string sang Role ObjectId nếu được truyền lên dạng String
  if (role && typeof role === 'string') {
    const roleObj = await Role.findOne({ name: role });
    if (roleObj) {
      req.body.role = roleObj._id;
    }
  }

  const user = await User.create(req.body);
  const populatedUser = await user.populate('role');
  res.status(201).json(populatedUser);
});

export const updateUser = asyncHandler(async (req, res) => {
  // Don't allow password update via this route
  delete req.body.password;

  const { email, phone, role } = req.body;
  const userId = req.params.id;

  if (email) {
    const emailExists = await User.findOne({ email, _id: { $ne: userId } });
    if (emailExists) return res.status(400).json({ message: 'Email đã được sử dụng' });
  }

  if (phone) {
    const phoneExists = await User.findOne({ phone, _id: { $ne: userId } });
    if (phoneExists) return res.status(400).json({ message: 'Số điện thoại đã được sử dụng' });
  }

  // Ánh xạ role string sang Role ObjectId nếu được truyền lên dạng String
  if (role && typeof role === 'string') {
    const roleObj = await Role.findOne({ name: role });
    if (roleObj) {
      req.body.role = roleObj._id;
    }
  }

  const user = await User.findByIdAndUpdate(userId, req.body, { new: true }).populate('role');
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
