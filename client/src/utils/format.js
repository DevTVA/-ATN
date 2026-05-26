export const formatVND = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0)

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'

export const formatDateTime = (d) =>
  d ? `${formatDate(d)} ${formatTime(d)}` : '—'

export const STATUS_LABEL = {
  pending: 'Chờ xác nhận',
  processing: 'Đang pha chế',
  paid: 'Đã thanh toán',
  cancelled: 'Đã huỷ',
}

export const CATEGORY_LABEL = {
  'cafe': 'Cà phê',
  'tra-sua': 'Trà sữa',
  'banh-ngot': 'Bánh ngọt',
  'nuoc-ep': 'Nước ép',
  'khac': 'Khác',
}

export const ROLE_LABEL = {
  admin: 'Admin',
  staff: 'Nhân viên',
  cashier: 'Thu ngân',
}

export const TABLE_STATUS_LABEL = {
  empty: 'Trống',
  occupied: 'Đang phục vụ',
  reserved: 'Đã đặt',
}
