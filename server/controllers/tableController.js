import asyncHandler from 'express-async-handler';
import Table from '../models/Table.js';

export const getTables = asyncHandler(async (req, res) => {
  const tables = await Table.find().populate('currentOrder', 'orderCode total status createdAt').sort('number');
  res.json(tables);
});

export const getTable = asyncHandler(async (req, res) => {
  const table = await Table.findById(req.params.id).populate('currentOrder');
  if (!table) return res.status(404).json({ message: 'Không tìm thấy bàn' });
  res.json(table);
});

export const createTable = asyncHandler(async (req, res) => {
  const table = await Table.create(req.body);
  res.status(201).json(table);
});

export const updateTable = asyncHandler(async (req, res) => {
  const table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!table) return res.status(404).json({ message: 'Không tìm thấy bàn' });
  res.json(table);
});

export const deleteTable = asyncHandler(async (req, res) => {
  const table = await Table.findByIdAndDelete(req.params.id);
  if (!table) return res.status(404).json({ message: 'Không tìm thấy bàn' });
  res.json({ message: 'Đã xoá bàn' });
});
