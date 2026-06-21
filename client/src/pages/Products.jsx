import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { formatVND, CATEGORY_LABEL } from '../utils/format'
import { Modal, Spinner, EmptyState, PageHeader } from '../components/ui'

const EMOJIS = ['☕', '🧋', '🍵', '🧊', '🍑', '🍰', '🥐', '🥑', '🍊', '🥤']

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('')
  const [search, setSearch] = useState('')
  
  // Modals
  const [modal, setModal] = useState(false)
  const [categoryModal, setCategoryModal] = useState(false)
  
  // Product Form states
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', category: '', description: '', emoji: '☕', isAvailable: true })
  const [saving, setSaving] = useState(false)
  
  // Category Form states
  const [newCatForm, setNewCatForm] = useState({ name: '', description: '' })
  const [catSaving, setCatSaving] = useState(false)

  // Fetch categories from database
  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/products/categories')
      setCategories(data)
    } catch (err) {
      toast.error('Không thể tải danh sách danh mục')
    }
  }

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/products?category=${cat}&search=${search}`)
      setProducts(data)
    } catch (err) {
      toast.error('Không thể tải danh sách sản phẩm')
    } finally { setLoading(false) }
  }

  // Initial load
  useEffect(() => {
    fetchCategories()
  }, [])

  // Refetch products when filters change
  useEffect(() => {
    fetchProducts()
  }, [cat, search])

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '',
      price: '',
      category: categories[0]?._id || '',
      description: '',
      emoji: '☕',
      isAvailable: true
    })
    setModal(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name,
      price: p.price,
      category: p.category?._id || p.category, // Sử dụng ID làm value cho select
      description: p.description || '',
      emoji: p.emoji || '☕',
      isAvailable: p.isAvailable
    })
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.price) return toast.error('Vui lòng điền đầy đủ thông tin')
    setSaving(true)
    try {
      if (editing) {
        const { data } = await api.put(`/products/${editing._id}`, { ...form, price: Number(form.price) })
        setProducts(ps => ps.map(p => p._id === data._id ? data : p))
        toast.success('Đã cập nhật sản phẩm')
      } else {
        const { data } = await api.post('/products', { ...form, price: Number(form.price) })
        setProducts(ps => [data, ...ps])
        toast.success('Đã thêm sản phẩm mới')
      }
      setModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally { setSaving(false) }
  }

  const handleDelete = async (p) => {
    if (!confirm(`Xoá sản phẩm "${p.name}"?`)) return
    try {
      await api.delete(`/products/${p._id}`)
      setProducts(ps => ps.filter(x => x._id !== p._id))
      toast.success('Đã xoá sản phẩm')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xoá')
    }
  }

  // Category management functions
  const handleCreateCategory = async (e) => {
    e.preventDefault()
    if (!newCatForm.name.trim()) return toast.error('Vui lòng nhập tên danh mục')
    setCatSaving(true)
    try {
      const { data } = await api.post('/products/categories', newCatForm)
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCatForm({ name: '', description: '' })
      toast.success('Đã thêm danh mục mới')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally { setCatSaving(false) }
  }

  const handleDeleteCategory = async (c) => {
    if (!confirm(`Bạn có chắc chắn muốn xoá danh mục "${c.name}"?`)) return
    try {
      await api.delete(`/products/categories/${c._id}`)
      setCategories(prev => prev.filter(x => x._id !== c._id))
      toast.success('Đã xoá danh mục')
      // Nếu đang lọc theo danh mục này thì reset bộ lọc về "Tất cả"
      if (cat === c._id || cat === c.slug) {
        setCat('')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xoá')
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Build filter list with "Tất cả" at the beginning
  const filterCats = [{ _id: '', name: 'Tất cả', slug: '' }, ...categories]

  return (
    <div>
      <PageHeader
        title="Sản phẩm / Menu"
        subtitle={`${products.length} sản phẩm`}
        action={
          <div className="flex gap-2">
            <button className="btn bg-brown-100 text-brown-800 hover:bg-brown-200 border-brown-200" onClick={() => setCategoryModal(true)}>
              <i className="ti ti-category" /> Quản lý danh mục
            </button>
            <button className="btn btn-primary" onClick={openCreate}>
              <i className="ti ti-plus" /> Thêm sản phẩm
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          className="input max-w-xs"
          placeholder="🔍 Tìm sản phẩm..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-2 flex-wrap">
          {filterCats.map(c => (
            <button
              key={c._id || 'all'}
              onClick={() => setCat(c._id || c.slug)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                cat === (c._id || c.slug) ? 'bg-brown-800 text-brown-100 border-brown-800' : 'bg-white text-brown-600 border-brown-200 hover:bg-brown-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center pt-20"><Spinner /></div>
      ) : products.length === 0 ? (
        <EmptyState icon="ti-coffee" message="Không có sản phẩm nào" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <div key={p._id} className="card p-0 overflow-hidden group">
              <div className="h-24 bg-brown-50 flex items-center justify-center text-4xl">
                {p.emoji}
              </div>
              <div className="p-3">
                <div className="font-medium text-sm text-brown-900">{p.name}</div>
                <div className="text-xs text-brown-500 mt-0.5">
                  {p.category?.name || CATEGORY_LABEL[p.category?.slug || p.category] || 'Khác'}
                  {!p.isAvailable && <span className="ml-2 text-red-400">• Hết hàng</span>}
                </div>
                <div className="text-brown-700 font-semibold text-sm mt-1">{formatVND(p.price)}</div>
                <div className="flex gap-2 mt-3">
                  <button className="btn btn-sm flex-1 justify-center" onClick={() => openEdit(p)}>
                    <i className="ti ti-edit text-sm" /> Sửa
                  </button>
                  <button className="btn btn-sm btn-danger px-2" onClick={() => handleDelete(p)}>
                    <i className="ti ti-trash text-sm" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Add/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
        footer={
          <>
            <button className="btn" onClick={() => setModal(false)}>Huỷ</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Thêm mới')}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="label">Emoji</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => set('emoji', e)}
                className={`w-9 h-9 rounded-lg text-xl border-2 transition-all ${form.emoji === e ? 'border-brown-600 bg-brown-50' : 'border-transparent'}`}
              >{e}</button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="label">Tên món *</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Cà phê sữa đá" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="form-group">
            <label className="label">Giá (VNĐ) *</label>
            <input className="input" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="30000" />
          </div>
          <div className="form-group">
            <label className="label">Danh mục *</label>
            <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="label">Mô tả</label>
          <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Mô tả ngắn về món..." />
        </div>
        <div className="form-group mb-0">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isAvailable} onChange={e => set('isAvailable', e.target.checked)} className="w-4 h-4 accent-brown-600" />
            <span className="text-sm text-brown-700">Còn hàng / Đang phục vụ</span>
          </label>
        </div>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        open={categoryModal}
        onClose={() => setCategoryModal(false)}
        title="Quản lý danh mục sản phẩm"
      >
        {/* Form thêm nhanh danh mục */}
        <form onSubmit={handleCreateCategory} className="mb-6 p-4 bg-brown-50 rounded-xl border border-brown-100">
          <div className="text-sm font-semibold text-brown-900 mb-3 flex items-center gap-1.5">
            <i className="ti ti-plus-small text-lg" /> Thêm danh mục mới
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="form-group mb-0">
              <label className="label text-xs">Tên danh mục *</label>
              <input
                className="input text-sm"
                placeholder="VD: Nước ngọt, Sinh tố"
                value={newCatForm.name}
                onChange={e => setNewCatForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group mb-0">
              <label className="label text-xs">Mô tả</label>
              <input
                className="input text-sm"
                placeholder="Mô tả ngắn..."
                value={newCatForm.description}
                onChange={e => setNewCatForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn btn-sm btn-primary" disabled={catSaving}>
              {catSaving ? 'Đang lưu...' : 'Thêm danh mục'}
            </button>
          </div>
        </form>

        {/* Danh sách danh mục */}
        <div>
          <div className="text-sm font-semibold text-brown-900 mb-2 flex items-center gap-1.5">
            <i className="ti ti-list text-base" /> Danh sách hiện có ({categories.length})
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {categories.map(c => (
              <div key={c._id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-brown-100 hover:shadow-sm transition-all">
                <div>
                  <div className="font-semibold text-brown-900 text-sm">{c.name}</div>
                  {c.description && <div className="text-xs text-brown-500 mt-0.5">{c.description}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c)}
                  className="btn btn-sm btn-danger p-2"
                  title="Xoá danh mục"
                >
                  <i className="ti ti-trash text-sm" />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-center text-brown-400 text-sm py-4 italic">Chưa có danh mục nào</div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
