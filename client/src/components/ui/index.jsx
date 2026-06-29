import React from 'react'

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="font-semibold text-brown-900 text-base">{title}</h3>
          <button onClick={onClose} className="btn btn-sm p-1.5">
            <i className="ti ti-x text-base" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Badge({ status }) {
  const map = {
    processing: ['badge-processing', 'Đang pha chế'],
    paid: ['badge-paid', 'Đã thanh toán'],
    cancelled: ['badge-cancelled', 'Đã huỷ'],
    admin: ['badge-admin', 'Admin'],
    staff: ['badge-staff', 'Nhân viên'],
    cashier: ['badge-cashier', 'Thu ngân'],
    empty: ['bg-green-50 text-green-700', 'Trống'],
    occupied: ['bg-red-50 text-red-700', 'Đang phục vụ'],
    reserved: ['bg-amber-50 text-amber-700', 'Đã đặt'],
  }
  const [cls, label] = map[status] || ['badge-staff', status]
  return <span className={`badge ${cls}`}>{label}</span>
}

export function Spinner({ size = 'md' }) {
  const sz = size === 'sm' ? 'h-4 w-4' : 'h-8 w-8'
  return (
    <div className={`${sz} animate-spin rounded-full border-2 border-brown-200 border-t-brown-600`} />
  )
}

export function EmptyState({ icon = 'ti-inbox', message = 'Không có dữ liệu' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-brown-400">
      <i className={`ti ${icon} text-4xl mb-3`} />
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-brown-900 font-serif">{title}</h1>
        {subtitle && <p className="text-sm text-brown-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatPill({ label, value, color = 'text-brown-700' }) {
  return (
    <div className="bg-white border border-brown-100 rounded-full px-4 py-1.5 text-sm flex items-center gap-2">
      <span className="text-brown-400">{label}:</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )
}
