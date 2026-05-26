import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { formatVND, CATEGORY_LABEL } from '../utils/format'
import { Modal, Spinner, EmptyState, PageHeader } from '../components/ui'

const CATS = [
  { value: '', label: 'Tất cả' },
  { value: 'cafe', label: 'Cà phê' },
  { value: 'tra-sua', label: 'Trà sữa' },
  { value: 'banh-ngot', label: 'Bánh ngọt' },
  { value: 'nuoc-ep', label: 'Nước ép' },
  { value: 'khac', label: 'Khác' },
]

const EMOJIS = ['☕', '🧋', '🍵', '🧊', '🍑', '🍰', '🥐', '🥑', '🍊', '🥤']

const EMPTY_FORM = { name: '', price: '', category: 'cafe', description: '', emoji: '☕', isAvailable: true }

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/products?category=${cat}&search=${search}`)
      setProducts(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [cat, search])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({ name: p.name, price: p.price, category: p.category, description: p.description, emoji: p.emoji, isAvailable: p.isAvailable })
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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <PageHeader
        title="Sản phẩm / Menu"
        subtitle={`${products.length} sản phẩm`}
        action={
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="ti ti-plus" /> Thêm sản phẩm
          </button>
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
          {CATS.map(c => (
            <button
              key={c.value}
              onClick={() => setCat(c.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                cat === c.value ? 'bg-brown-800 text-brown-100 border-brown-800' : 'bg-white text-brown-600 border-brown-200 hover:bg-brown-50'
              }`}
            >
              {c.label}
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
                  {CATEGORY_LABEL[p.category]}
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

      {/* Modal */}
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
              {CATS.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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
    </div>
  )
}
