export const formatVND = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0)

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'

export const formatDateTime = (d) =>
  d ? `${formatDate(d)} ${formatTime(d)}` : '—'

export const STATUS_LABEL = {
  processing: 'Đang pha chế',
  paid: 'Đã thanh toán',
  cancelled: 'Đã huỷ',
}

export const CATEGORY_LABEL = {
  'nuoc-ep': 'Nước ép',
  'tra-sua': 'Trà sữa',
  'tra-hoa-qua': 'Trà hoa quả',
  'do-da-xay': 'Đồ đá xay',
  'cafe': 'Cà phê',
  'sinh-to': 'Sinh tố',
  'banh-ngot': 'Bánh ngọt',
  'khac': 'Đồ khác...',
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

export const PAYMENT_METHOD_LABEL = {
  cash: 'Tiền mặt',
  card: 'Thẻ',
  transfer: 'Chuyển khoản',
  QR_CODE: 'QR Code',
}

