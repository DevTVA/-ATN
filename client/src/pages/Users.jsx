import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { Modal, Badge, Spinner, EmptyState, PageHeader } from '../components/ui'
import { formatDateTime, ROLE_LABEL } from '../utils/format'

const EMPTY_FORM = { name: '', email: '', password: '', role: 'staff', phone: '', shift: '' }

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [resetModal, setResetModal] = useState(null)
  const [newPwd, setNewPwd] = useState('')

  const fetch = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setUsers(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  const openEdit = (u) => {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', shift: u.shift || '' })
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.email) return toast.error('Vui lòng điền đầy đủ thông tin')
    if (!editing && !form.password) return toast.error('Vui lòng nhập mật khẩu')
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (editing) {
        const { data } = await api.put(`/users/${editing._id}`, payload)
        setUsers(us => us.map(u => u._id === data._id ? data : u))
        toast.success('Đã cập nhật nhân viên')
      } else {
        const { data } = await api.post('/users', payload)
        setUsers(us => [data, ...us])
        toast.success('Đã thêm nhân viên mới')
      }
      setModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally { setSaving(false) }
  }

  const handleDelete = async (u) => {
    if (!confirm(`Xoá nhân viên "${u.name}"?`)) return
    try {
      await api.delete(`/users/${u._id}`)
      setUsers(us => us.filter(x => x._id !== u._id))
      toast.success('Đã xoá nhân viên')
    } catch (err) { toast.error(err.response?.data?.message || 'Không thể xoá') }
  }

  const handleToggleActive = async (u) => {
    try {
      const { data } = await api.put(`/users/${u._id}`, { isActive: !u.isActive })
      setUsers(us => us.map(x => x._id === data._id ? data : x))
      toast.success(data.isActive ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hoá tài khoản')
    } catch (err) { toast.error('Lỗi') }
  }

  const handleResetPassword = async () => {
    if (!newPwd || newPwd.length < 6) return toast.error('Mật khẩu tối thiểu 6 ký tự')
    try {
      await api.put(`/users/${resetModal._id}/reset-password`, { newPassword: newPwd })
      toast.success('Đã đặt lại mật khẩu')
      setResetModal(null)
      setNewPwd('')
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const initials = (name) => name?.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase() || '?'

  return (
    <div>
      <PageHeader
        title="Quản lý nhân viên"
        subtitle={`${users.length} nhân viên`}
        action={
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="ti ti-user-plus" /> Thêm nhân viên
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center pt-20"><Spinner /></div>
      ) : users.length === 0 ? (
        <EmptyState icon="ti-users" message="Chưa có nhân viên nào" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <th>Nhân viên</th><th>Email / Mật khẩu</th><th>Vai trò</th>
                <th>Ca làm</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-brown-200 flex items-center justify-center text-xs font-bold text-brown-700 flex-shrink-0">
                        {initials(u.name)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{u.name}</div>
                        {u.phone && <div className="text-xs text-brown-400">{u.phone}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="text-brown-500 text-sm">
                    <div className="font-medium">{u.email}</div>
                    <div className="text-[11px] text-brown-400 mt-1 flex items-center gap-1 font-mono">
                      <span>Mật khẩu:</span>
                      <span className="font-semibold select-all text-brown-800 bg-brown-100 border border-brown-200 px-1 rounded" title="Sao chép mật khẩu">
                        {u.rawPassword || (u.email === 'admin@cafe.com' ? 'admin123' : '123456')}
                      </span>
                    </div>
                  </td>
                  <td><Badge status={u.role} /></td>
                  <td className="text-brown-400 text-xs">{u.shift || '—'}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-paid' : 'badge-cancelled'}`}>
                      {u.isActive ? 'Đang làm' : 'Nghỉ'}
                    </span>
                  </td>
                  <td className="text-brown-400 text-xs">{formatDateTime(u.createdAt)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-sm px-2" onClick={() => openEdit(u)} title="Sửa">
                        <i className="ti ti-edit text-sm" />
                      </button>
                      <button className="btn btn-sm px-2" onClick={() => { setResetModal(u); setNewPwd('') }} title="Đặt lại mật khẩu">
                        <i className="ti ti-key text-sm" />
                      </button>
                      <button
                        className={`btn btn-sm px-2 ${u.isActive ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}
                        onClick={() => handleToggleActive(u)}
                        title={u.isActive ? 'Vô hiệu hoá' : 'Kích hoạt'}
                      >
                        <i className={`ti ${u.isActive ? 'ti-user-off' : 'ti-user-check'} text-sm`} />
                      </button>
                      <button className="btn btn-sm btn-danger px-2" onClick={() => handleDelete(u)} title="Xoá">
                        <i className="ti ti-trash text-sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}
        footer={
          <>
            <button className="btn" onClick={() => setModal(false)}>Huỷ</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Thêm mới')}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="form-group">
            <label className="label">Họ và tên *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nguyễn Văn A" />
          </div>
          <div className="form-group">
            <label className="label">Email *</label>
            <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="nhanvien@cafe.com" />
          </div>
          {!editing && (
            <div className="form-group">
              <label className="label">Mật khẩu *</label>
              <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Tối thiểu 6 ký tự" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Vai trò</label>
              <select className="select" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="staff">Nhân viên</option>
                <option value="cashier">Thu ngân</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Số điện thoại</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="09xxxxxxxx" />
            </div>
          </div>
          <div className="form-group mb-0">
            <label className="label">Ca làm việc</label>
            <input className="input" value={form.shift} onChange={e => set('shift', e.target.value)} placeholder="VD: Sáng 7-15h" />
          </div>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={!!resetModal}
        onClose={() => setResetModal(null)}
        title={`Đặt lại mật khẩu — ${resetModal?.name}`}
        footer={
          <>
            <button className="btn" onClick={() => setResetModal(null)}>Huỷ</button>
            <button className="btn btn-primary" onClick={handleResetPassword}>
              <i className="ti ti-key" /> Đặt lại mật khẩu
            </button>
          </>
        }
      >
        <div className="form-group mb-0">
          <label className="label">Mật khẩu mới *</label>
          <input
            className="input"
            type="password"
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
          />
        </div>
      </Modal>
    </div>
  )
}
