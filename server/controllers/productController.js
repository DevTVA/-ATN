import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

// GET /api/products
export const getProducts = asyncHandler(async (req, res) => {
  const { category, available, search } = req.query;
  const filter = {};
  
  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    } else {
      const catObj = await Category.findOne({ slug: category });
      if (catObj) {
        filter.category = catObj._id;
      } else {
        filter.category = new mongoose.Types.ObjectId(); // ID ngẫu nhiên để không ra kết quả
      }
    }
  }
  
  if (available !== undefined) filter.isAvailable = available === 'true';
  if (search) filter.name = { $regex: search, $options: 'i' };
  
  const products = await Product.find(filter).populate('category').sort({ name: 1 });
  res.json(products);
});

// GET /api/products/categories
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json(categories);
});

// GET /api/products/:id
export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category');
  if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  res.json(product);
});

// POST /api/products
export const createProduct = asyncHandler(async (req, res) => {
  const { category } = req.body;
  if (category && typeof category === 'string' && !mongoose.Types.ObjectId.isValid(category)) {
    const catObj = await Category.findOne({ $or: [{ slug: category }, { name: category }] });
    if (catObj) {
      req.body.category = catObj._id;
    }
  }
  const product = await Product.create(req.body);
  const populatedProduct = await product.populate('category');
  res.status(201).json(populatedProduct);
});

// PUT /api/products/:id
export const updateProduct = asyncHandler(async (req, res) => {
  const { category } = req.body;
  if (category && typeof category === 'string' && !mongoose.Types.ObjectId.isValid(category)) {
    const catObj = await Category.findOne({ $or: [{ slug: category }, { name: category }] });
    if (catObj) {
      req.body.category = catObj._id;
    }
  }
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('category');
  if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  res.json(product);
});

// DELETE /api/products/:id
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  res.json({ message: 'Đã xoá sản phẩm' });
});

// Helper function to create slug from Vietnamese text
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^a-z0-9\s-]|_)+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// POST /api/products/categories
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Tên danh mục là bắt buộc' });
  
  const slug = slugify(name);
  const slugExists = await Category.findOne({ slug });
  if (slugExists) return res.status(400).json({ message: 'Danh mục này đã tồn tại' });
  
  const category = await Category.create({ name, slug, description });
  res.status(201).json(category);
});

// PUT /api/products/categories/:id
export const updateCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
  
  if (name) {
    category.name = name;
    category.slug = slugify(name);
  }
  if (description !== undefined) {
    category.description = description;
  }
  
  await category.save();
  res.json(category);
});

// DELETE /api/products/categories/:id
export const deleteCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;
  
  // Check if there are products belonging to this category
  const productCount = await Product.countDocuments({ category: categoryId });
  if (productCount > 0) {
    return res.status(400).json({ message: 'Không thể xoá danh mục đang chứa sản phẩm. Hãy di chuyển hoặc xoá các sản phẩm thuộc danh mục này trước.' });
  }
  
  const category = await Category.findByIdAndDelete(categoryId);
  if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
  
  res.json({ message: 'Đã xoá danh mục thành công' });
});

