import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { formatVND, formatDateTime, STATUS_LABEL } from '../utils/format'
import { Modal, Badge, Spinner, EmptyState, PageHeader, StatPill } from '../components/ui'

const STATUSES = ['', 'pending', 'processing', 'paid', 'cancelled']
const STATUS_COLORS = { pending: 'text-blue-600', processing: 'text-amber-600', paid: 'text-green-600', cancelled: 'text-red-600' }

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [createModal, setCreateModal] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/orders?status=${status}`)
      setOrders(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [status])

  const openDetail = async (o) => {
    setDetail(o)
    try {
      const { data } = await api.get(`/orders/${o._id}`)
      setDetailData(data)
    } catch { setDetailData(o) }
  }

  const updateStatus = async (id, newStatus) => {
    try {
      const { data } = await api.put(`/orders/${id}`, { status: newStatus })
      setOrders(os => os.map(o => o._id === id ? { ...o, status: data.status } : o))
      if (detailData?._id === id) setDetailData(d => ({ ...d, status: data.status }))
      toast.success(`Đã cập nhật: ${STATUS_LABEL[newStatus]}`)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const counts = {
    all: orders.length,
    paid: orders.filter(o => o.status === 'paid').length,
    processing: orders.filter(o => o.status === 'processing').length,
    pending: orders.filter(o => o.status === 'pending').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }

  return (
    <div>
      <PageHeader
        title="Quản lý đơn hàng"
        subtitle={`${orders.length} đơn`}
        action={
          <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
            <i className="ti ti-plus" /> Tạo đơn mới
          </button>
        }
      />

      {/* Stat pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <StatPill label="Tổng" value={counts.all} />
        <StatPill label="Đã thanh toán" value={counts.paid} color="text-green-700" />
        <StatPill label="Đang pha chế" value={counts.processing} color="text-amber-700" />
        <StatPill label="Chờ xác nhận" value={counts.pending} color="text-blue-700" />
        <StatPill label="Đã huỷ" value={counts.cancelled} color="text-red-700" />
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
              status === s ? 'bg-brown-800 text-brown-100 border-brown-800' : 'bg-white text-brown-600 border-brown-200 hover:bg-brown-50'
            }`}
          >
            {s === '' ? 'Tất cả' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center pt-20"><Spinner /></div>
      ) : orders.length === 0 ? (
        <EmptyState icon="ti-receipt" message="Không có đơn hàng nào" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <th>Mã đơn</th><th>Nhân viên</th><th>Bàn</th>
                <th>Số món</th><th>Tổng tiền</th><th>Thời gian</th>
                <th>Trạng thái</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o._id}>
                  <td className="font-mono font-bold text-brown-800">{o.orderCode}</td>
                  <td>{o.staffName || o.staff?.name || '—'}</td>
                  <td>{o.type === 'takeaway' || !o.tableNumber ? 'Mang về' : `Bàn ${o.tableNumber}`}</td>
                  <td>{o.items?.length || 0} món</td>
                  <td className="font-semibold">{formatVND(o.total)}</td>
                  <td className="text-brown-400 text-xs">{formatDateTime(o.createdAt)}</td>
                  <td><Badge status={o.status} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-sm px-2" onClick={() => openDetail(o)} title="Xem chi tiết">
                        <i className="ti ti-eye text-sm" />
                      </button>
                      {o.status === 'pending' && (
                        <button className="btn btn-sm px-2 bg-amber-50 text-amber-700 border-amber-200" onClick={() => updateStatus(o._id, 'processing')} title="Bắt đầu pha chế">
                          <i className="ti ti-player-play text-sm" />
                        </button>
                      )}
                      {o.status === 'processing' && (
                        <button className="btn btn-sm px-2 bg-green-50 text-green-700 border-green-200" onClick={() => updateStatus(o._id, 'paid')} title="Thanh toán">
                          <i className="ti ti-check text-sm" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={!!detail}
        onClose={() => { setDetail(null); setDetailData(null) }}
        title={`Chi tiết đơn ${detail?.orderCode}`}
        footer={
          <div className="flex gap-2 w-full">
            {detail?.status === 'pending' && (
              <button className="btn bg-amber-50 text-amber-700 border-amber-200" onClick={() => updateStatus(detail._id, 'processing')}>
                <i className="ti ti-player-play" /> Bắt đầu pha chế
              </button>
            )}
            {detail?.status === 'processing' && (
              <button className="btn bg-green-50 text-green-700 border-green-200" onClick={() => { updateStatus(detail._id, 'paid'); setDetail(null) }}>
                <i className="ti ti-check" /> Thanh toán
              </button>
            )}
            {(detail?.status === 'pending' || detail?.status === 'processing') && (
              <button className="btn btn-danger" onClick={() => { updateStatus(detail._id, 'cancelled'); setDetail(null) }}>
                <i className="ti ti-x" /> Huỷ đơn
              </button>
            )}
            <button className="btn ml-auto" onClick={() => { setDetail(null); setDetailData(null) }}>Đóng</button>
          </div>
        }
      >
        {!detailData ? <div className="flex justify-center py-8"><Spinner /></div> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-brown-400">Nhân viên:</span> <span className="font-medium">{detailData.staffName || detailData.staff?.name}</span></div>
              <div><span className="text-brown-400">Bàn:</span> <span className="font-medium">{detailData.type === 'takeaway' || !detailData.tableNumber ? 'Mang về' : `Bàn ${detailData.tableNumber}`}</span></div>
              <div><span className="text-brown-400">Trạng thái:</span> <Badge status={detailData.status} /></div>
              <div><span className="text-brown-400">Thanh toán:</span> <span className="font-medium capitalize">{detailData.paymentMethod || 'cash'}</span></div>
            </div>

            <div>
              <div className="text-xs font-medium text-brown-500 uppercase tracking-wide mb-2">Danh sách món</div>
              <div className="border border-brown-100 rounded-lg overflow-hidden">
                {(detailData.items || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-brown-50 last:border-0">
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-brown-400">{formatVND(item.price)} × {item.quantity}</div>
                    </div>
                    <div className="font-semibold text-sm">{formatVND(item.price * item.quantity)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-sm font-semibold pt-2 border-t border-brown-100">
              <span>Tổng cộng</span>
              <span className="text-lg text-brown-800 font-serif">{formatVND(detailData.total)}</span>
            </div>

            {detailData.note && (
              <div className="bg-brown-50 rounded-lg px-3 py-2 text-sm text-brown-600">
                <span className="font-medium">Ghi chú:</span> {detailData.note}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create order modal */}
      <CreateOrderModal open={createModal} onClose={() => setCreateModal(false)} onCreated={() => { setCreateModal(false); fetch() }} />
    </div>
  )
}

function CreateOrderModal({ open, onClose, onCreated }) {
  const [tables, setTables] = useState([])
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({ tableId: '', note: '', discount: 0 })
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([api.get('/tables'), api.get('/products?available=true')]).then(([t, p]) => {
      setTables(t.data.filter(tb => tb.status === 'empty'))
      setProducts(p.data)
      setForm({ tableId: '', note: '', discount: 0 })
      setItems([])
    })
  }, [open])

  const addItem = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product._id)
      if (existing) return prev.map(i => i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { productId: product._id, name: product.name, price: product.price, quantity: 1 }]
    })
  }

  const removeItem = (productId) => setItems(prev => prev.filter(i => i.productId !== productId))
  const changeQty = (productId, qty) => {
    if (qty < 1) return removeItem(productId)
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i))
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const total = subtotal - Number(form.discount || 0)

  const handleCreate = async () => {
    if (!form.tableId) return toast.error('Vui lòng chọn bàn')
    if (items.length === 0) return toast.error('Vui lòng thêm ít nhất 1 món')
    setSaving(true)
    try {
      await api.post('/orders', { ...form, items: items.map(i => ({ productId: i.productId, quantity: i.quantity })) })
      toast.success('Tạo đơn hàng thành công!')
      onCreated()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo đơn')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Tạo đơn hàng mới"
      footer={
        <>
          <button className="btn" onClick={onClose}>Huỷ</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Đang tạo...' : `Tạo đơn • ${formatVND(total)}`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Bàn *</label>
            <select className="select" value={form.tableId} onChange={e => setForm(f => ({ ...f, tableId: e.target.value }))}>
              <option value="">-- Chọn bàn --</option>
              {tables.map(t => <option key={t._id} value={t._id}>Bàn {t.number} ({t.capacity} người)</option>)}
            </select>
          </div>
          <div>
            <label className="label">Giảm giá (VNĐ)</label>
            <input className="input" type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} placeholder="0" />
          </div>
        </div>

        <div>
          <label className="label mb-2">Chọn món</label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {products.map(p => (
              <button key={p._id} onClick={() => addItem(p)}
                className="flex items-center gap-2 text-left px-3 py-2 rounded-lg border border-brown-100 hover:bg-brown-50 hover:border-brown-300 transition-all">
                <span className="text-xl">{p.emoji}</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{p.name}</div>
                  <div className="text-xs text-brown-400">{formatVND(p.price)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {items.length > 0 && (
          <div>
            <label className="label mb-2">Đơn hàng ({items.length} món)</label>
            <div className="space-y-1">
              {items.map(item => (
                <div key={item.productId} className="flex items-center gap-2 bg-brown-50 rounded-lg px-3 py-2">
                  <span className="text-sm flex-1">{item.name}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeQty(item.productId, item.quantity - 1)} className="w-6 h-6 rounded-full bg-white border border-brown-200 text-xs flex items-center justify-center">−</button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => changeQty(item.productId, item.quantity + 1)} className="w-6 h-6 rounded-full bg-white border border-brown-200 text-xs flex items-center justify-center">+</button>
                  </div>
                  <span className="text-xs font-semibold w-20 text-right">{formatVND(item.price * item.quantity)}</span>
                  <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600"><i className="ti ti-x text-sm" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">Ghi chú</label>
          <input className="input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Ghi chú cho đơn hàng..." />
        </div>
      </div>
    </Modal>
  )
}
