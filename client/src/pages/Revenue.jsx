import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import api from '../api/axios'
import { formatVND } from '../utils/format'
import { Spinner, PageHeader } from '../components/ui'

const PERIODS = [
  { value: 'day', label: 'Hôm nay' },
  { value: 'month', label: 'Tháng này' },
  { value: 'year', label: 'Năm nay' },
]

const CAT_LABEL = {
  'cafe': 'Cà phê', 'tra-sua': 'Trà sữa',
  'banh-ngot': 'Bánh ngọt', 'nuoc-ep': 'Nước ép', 'khac': 'Khác',
}

export default function Revenue() {
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get(`/revenue?period=${period}`)
      setData(d)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [period])

  const chartData = data
    ? (data.labels || []).map((label, i) => {
        const found = data.chartData.find(d => parseInt(d._id) === (period === 'day' ? i : i + 1))
        return { label, revenue: found?.revenue || 0, orders: found?.orders || 0 }
      })
    : []

  return (
    <div>
      <PageHeader
        title="Báo cáo doanh thu"
        subtitle="Thống kê chi tiết theo thời gian"
        action={
          <button className="btn" onClick={fetch}>
            <i className="ti ti-refresh" /> Làm mới
          </button>
        }
      />

      {/* Period tabs */}
      <div className="flex gap-2 mb-6">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              period === p.value ? 'bg-brown-800 text-brown-100 border-brown-800' : 'bg-white text-brown-600 border-brown-200 hover:bg-brown-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center pt-20"><Spinner /></div>
      ) : !data ? null : (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card">
              <div className="text-xs text-brown-400 mb-1">Tổng doanh thu</div>
              <div className="text-2xl font-serif font-semibold text-brown-900">{formatVND(data.summary.totalRevenue)}</div>
            </div>
            <div className="card">
              <div className="text-xs text-brown-400 mb-1">Tổng đơn đã thanh toán</div>
              <div className="text-2xl font-serif font-semibold text-brown-900">{data.summary.totalOrders}</div>
            </div>
            <div className="card">
              <div className="text-xs text-brown-400 mb-1">Trung bình / đơn</div>
              <div className="text-2xl font-serif font-semibold text-brown-900">{formatVND(data.summary.avgOrder)}</div>
            </div>
          </div>

          {/* Revenue bar chart */}
          <div className="card">
            <div className="card-title">Biểu đồ doanh thu</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5EDE3" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8B5A3A' }} axisLine={false} tickLine={false} interval={period === 'month' ? 1 : 0} />
                <YAxis tick={{ fontSize: 10, fill: '#8B5A3A' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip
                  formatter={(v, name) => [name === 'revenue' ? formatVND(v) : v, name === 'revenue' ? 'Doanh thu' : 'Đơn hàng']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8D5C4', background: '#FBF7F4' }}
                />
                <Bar dataKey="revenue" fill="#C4956A" radius={[4, 4, 0, 0]} name="revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Orders line chart */}
          <div className="card">
            <div className="card-title">Số đơn hàng</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5EDE3" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8B5A3A' }} axisLine={false} tickLine={false} interval={period === 'month' ? 1 : 0} />
                <YAxis tick={{ fontSize: 10, fill: '#8B5A3A' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, 'Đơn hàng']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8D5C4', background: '#FBF7F4' }}
                />
                <Line type="monotone" dataKey="orders" stroke="#6B3F2A" strokeWidth={2} dot={{ r: 3, fill: '#6B3F2A' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top products */}
          {data.topProducts?.length > 0 && (
            <div className="card">
              <div className="card-title">Top sản phẩm bán chạy</div>
              <table className="table-auto w-full">
                <thead>
                  <tr>
                    <th>#</th><th>Sản phẩm</th><th>Số lượng bán</th><th>Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p, i) => (
                    <tr key={p._id}>
                      <td>
                        <span className={`font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-brown-400'}`}>
                          #{i + 1}
                        </span>
                      </td>
                      <td className="font-medium">{p.name}</td>
                      <td>{p.quantity} phần</td>
                      <td className="font-semibold">{formatVND(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
