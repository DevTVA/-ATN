import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api/axios'
import { formatVND, STATUS_LABEL } from '../utils/format'
import { Badge, Spinner, EmptyState } from '../components/ui'
import { useAuthStore } from '../store/authStore'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [tables, setTables] = useState([])
  const [revenue, setRevenue] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const promises = [
      api.get('/orders?status=paid,cancelled&limit=5'),
      api.get('/tables'),
    ];
    
    if (user?.role === 'admin') {
      promises.push(api.get('/revenue?period=month'));
    }

    Promise.all(promises).then((res) => {
      setOrders(res[0].data)
      setTables(res[1].data)
      if (user?.role === 'admin' && res[2]) {
        setRevenue(res[2].data)
      }
    }).catch(err => console.error(err)).finally(() => setLoading(false))
  }, [user?.role])

  if (loading) return <div className="flex justify-center pt-20"><Spinner /></div>

  const todayOrders = orders.filter(o => {
    const d = new Date(o.createdAt)
    const now = new Date()
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
  })
  const occupied = tables.filter(t => t.status === 'occupied').length
  const todayRevenue = revenue?.summary?.totalRevenue || 0

  const chartData = (revenue?.chartData || []).slice(0, 15).map(d => ({
    label: d.label,
    value: d.revenue || 0
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-brown-900">Xin chào! ☕</h1>
        <p className="text-sm text-brown-500 mt-0.5">Đây là tổng quan hoạt động hôm nay</p>
      </div>

      {/* Metrics */}
      <div className={`grid grid-cols-2 ${user?.role === 'admin' ? 'lg:grid-cols-4' : ''} gap-4 mb-6`}>
        {user?.role === 'admin' && (
          <MetricCard
            icon="ti-currency-dong" iconBg="bg-brown-100" iconColor="text-brown-700"
            label="Doanh thu tháng" value={formatVND(todayRevenue)}
            sub={`${revenue?.summary?.totalOrders || 0} đơn đã thanh toán`}
          />
        )}
        <MetricCard
          icon="ti-receipt" iconBg="bg-green-50" iconColor="text-green-700"
          label="Đơn hôm nay" value={todayOrders.length}
          sub="Trong 24h gần nhất"
        />
        <MetricCard
          icon="ti-armchair" iconBg="bg-blue-50" iconColor="text-blue-700"
          label="Bàn đang phục vụ" value={`${occupied} / ${tables.length}`}
          sub={`${tables.length - occupied} bàn còn trống`}
        />
        {user?.role === 'admin' && (
          <MetricCard
            icon="ti-trending-up" iconBg="bg-amber-50" iconColor="text-amber-700"
            label="Trung bình / đơn" value={formatVND(revenue?.summary?.avgOrder || 0)}
            sub="Tháng này"
          />
        )}
      </div>

      <div className={`grid grid-cols-1 ${user?.role === 'admin' ? 'lg:grid-cols-5' : ''} gap-5 mb-5`}>
        {/* Chart */}
        {user?.role === 'admin' && (
          <div className="card col-span-3">
            <div className="card-title">
              Doanh thu tháng này
              <Link to="/revenue" className="text-xs text-brown-500 hover:text-brown-700">Xem chi tiết →</Link>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8B5A3A' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#8B5A3A' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v} />
                <Tooltip
                  formatter={(v) => [formatVND(v), 'Doanh thu']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8D5C4', background: '#FBF7F4' }}
                />
                <Bar dataKey="value" fill="#C4956A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table status */}
        <div className={`card ${user?.role === 'admin' ? 'col-span-2' : ''}`}>
          <div className="card-title">
            Trạng thái bàn
            <Link to="/tables" className="text-xs text-brown-500 hover:text-brown-700">Xem tất cả →</Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {tables.slice(0, 12).map(t => (
              <div
                key={t._id}
                className={`rounded-lg p-2 text-center text-xs border ${
                  t.status === 'occupied' ? 'status-occupied' :
                  t.status === 'reserved' ? 'status-reserved' : 'status-empty'
                }`}
              >
                <div className="font-semibold">{t.number}</div>
                <div className="text-[10px] mt-0.5 opacity-70">
                  {t.status === 'occupied' ? '🔴' : t.status === 'reserved' ? '🟡' : '🟢'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="card-title">
          Đơn hàng gần đây
          <Link to="/orders" className="text-xs text-brown-500 hover:text-brown-700">Xem tất cả →</Link>
        </div>
        {orders.length === 0 ? <EmptyState icon="ti-receipt" message="Chưa có đơn hàng nào" /> : (
          <table className="table-auto w-full">
            <thead>
              <tr>
                <th>Mã đơn</th><th>Nhân viên</th><th>Bàn</th>
                <th>Tổng tiền</th><th>Thời gian</th><th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map(o => (
                <tr key={o._id}>
                  <td className="font-mono font-semibold">{o.orderCode}</td>
                  <td>{o.staffName || o.staff?.name}</td>
                  <td>Bàn {o.tableNumber}</td>
                  <td className="font-semibold">{formatVND(o.total)}</td>
                  <td className="text-brown-400">{new Date(o.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td><Badge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function MetricCard({ icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
          <i className={`ti ${icon} text-base ${iconColor}`} />
        </div>
      </div>
      <div className="metric-value mt-2">{value}</div>
      <div className="metric-label">{label}</div>
      {sub && <div className="text-xs text-brown-400">{sub}</div>}
    </div>
  )
}
