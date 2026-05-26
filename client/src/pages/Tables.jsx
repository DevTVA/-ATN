import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { Modal, Badge, Spinner, PageHeader, StatPill } from '../components/ui'
import { formatVND } from '../utils/format'

const EMPTY_FORM = { number: '', name: '', capacity: 4 }

export default function Tables() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)

  const fetch = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/tables')
      setTables(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => {
    setEditing(null)
    const nextNum = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1
    setForm({ number: nextNum, name: `Bàn ${nextNum}`, capacity: 4 })
    setModal(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({ number: t.number, name: t.name, capacity: t.capacity })
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.number) return toast.error('Vui lòng nhập số bàn')
    setSaving(true)
    try {
      if (editing) {
        const { data } = await api.put(`/tables/${editing._id}`, { ...form, number: Number(form.number), capacity: Number(form.capacity) })
        setTables(ts => ts.map(t => t._id === data._id ? data : t))
        toast.success('Đã cập nhật bàn')
      } else {
        const { data } = await api.post('/tables', { ...form, number: Number(form.number), capacity: Number(form.capacity) })
        setTables(ts => [...ts, data].sort((a, b) => a.number - b.number))
        toast.success('Đã thêm bàn mới')
      }
      setModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally { setSaving(false) }
  }

  const handleDelete = async (t) => {
    if (t.status === 'occupied') return toast.error('Không thể xoá bàn đang phục vụ')
    if (!confirm(`Xoá bàn ${t.number}?`)) return
    try {
      await api.delete(`/tables/${t._id}`)
      setTables(ts => ts.filter(x => x._id !== t._id))
      toast.success('Đã xoá bàn')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xoá')
    }
  }

  const updateStatus = async (t, status) => {
    try {
      const { data } = await api.put(`/tables/${t._id}`, { status })
      setTables(ts => ts.map(x => x._id === data._id ? data : x))
      setSelected(data)
      toast.success(`Cập nhật bàn ${t.number}: ${STATUS_VI[status]}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi')
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const empty = tables.filter(t => t.status === 'empty').length
  const occupied = tables.filter(t => t.status === 'occupied').length
  const reserved = tables.filter(t => t.status === 'reserved').length

  return (
    <div>
      <PageHeader
        title="Sơ đồ bàn"
        subtitle={`${tables.length} bàn`}
        action={
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="ti ti-plus" /> Thêm bàn
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <StatPill label="Tổng" value={tables.length} />
        <StatPill label="Trống" value={empty} color="text-green-700" />
        <StatPill label="Đang phục vụ" value={occupied} color="text-red-700" />
        <StatPill label="Đã đặt" value={reserved} color="text-amber-700" />
      </div>

      {loading ? (
        <div className="flex justify-center pt-20"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {tables.map(t => (
            <div
              key={t._id}
              onClick={() => setSelected(t)}
              className={`rounded-xl border-2 p-3 text-center cursor-pointer transition-all hover:shadow-md ${
                t.status === 'occupied' ? 'bg-red-50 border-red-200 hover:border-red-400' :
                t.status === 'reserved' ? 'bg-amber-50 border-amber-200 hover:border-amber-400' :
                'bg-green-50 border-green-200 hover:border-green-400'
              }`}
            >
              <div className="text-2xl mb-1">
                {t.status === 'occupied' ? '🔴' : t.status === 'reserved' ? '🟡' : '🟢'}
              </div>
              <div className="font-bold text-brown-900 text-sm">Bàn {t.number}</div>
              <div className="text-[10px] text-brown-400 mt-0.5">{t.capacity} người</div>
              <div className={`text-[10px] font-medium mt-1 ${
                t.status === 'occupied' ? 'text-red-600' :
                t.status === 'reserved' ? 'text-amber-600' : 'text-green-600'
              }`}>
                {STATUS_VI[t.status]}
              </div>
              {t.currentOrder?.total && (
                <div className="text-[10px] text-brown-500 mt-0.5">{formatVND(t.currentOrder.total)}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Table detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Bàn ${selected?.number}`}
        footer={
          <div className="flex gap-2 w-full flex-wrap">
            {selected?.status !== 'empty' && (
              <button className="btn bg-green-50 text-green-700 border-green-200" onClick={() => updateStatus(selected, 'empty')}>
                <i className="ti ti-checks" /> Đặt trống
              </button>
            )}
            {selected?.status === 'empty' && (
              <button className="btn bg-amber-50 text-amber-700 border-amber-200" onClick={() => updateStatus(selected, 'reserved')}>
                <i className="ti ti-bookmark" /> Đánh dấu đặt trước
              </button>
            )}
            <button className="btn" onClick={() => { openEdit(selected); setSelected(null) }}>
              <i className="ti ti-edit" /> Sửa thông tin
            </button>
            <button className="btn btn-danger" onClick={() => { handleDelete(selected); setSelected(null) }}>
              <i className="ti ti-trash" /> Xoá
            </button>
            <button className="btn ml-auto" onClick={() => setSelected(null)}>Đóng</button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-brown-400">Trạng thái</span>
              <Badge status={selected.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-brown-400">Sức chứa</span>
              <span className="font-medium">{selected.capacity} người</span>
            </div>
            {selected.currentOrder && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-brown-400">Mã đơn hiện tại</span>
                  <span className="font-mono font-bold">{selected.currentOrder.orderCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-brown-400">Tổng tiền</span>
                  <span className="font-semibold">{formatVND(selected.currentOrder.total)}</span>
                </div>
              </>
            )}
            {selected.note && (
              <div className="bg-brown-50 rounded-lg px-3 py-2">
                <span className="text-brown-500">Ghi chú: </span>{selected.note}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create/Edit modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? `Sửa bàn ${editing.number}` : 'Thêm bàn mới'}
        footer={
          <>
            <button className="btn" onClick={() => setModal(false)}>Huỷ</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Thêm bàn')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Số bàn *</label>
              <input className="input" type="number" value={form.number} onChange={e => set('number', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Sức chứa (người)</label>
              <input className="input" type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} />
            </div>
          </div>
          <div className="form-group mb-0">
            <label className="label">Tên / ghi chú</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Bàn góc, Bàn ngoài trời..." />
          </div>
        </div>
      </Modal>
    </div>
  )
}

const STATUS_VI = { empty: 'Trống', occupied: 'Đang phục vụ', reserved: 'Đã đặt' }
