import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts'
import api from '../api/axios'
import { formatVND } from '../utils/format'
import { Spinner, PageHeader } from '../components/ui'

const PERIODS = [
  { value: 'day', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'custom', label: 'Khoảng thời gian' },
]

const COLORS = ['#6B3F2A', '#8B5A3A', '#C4956A', '#D4A373', '#E9C46A', '#E76F51', '#A8A8A8']

export default function Revenue() {
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'products'
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState(null)
  const [productData, setProductData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('revenue') // 'revenue' | 'quantity'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' | 'desc'

  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const fetchOverview = async () => {
    setLoading(true)
    try {
      let url = `/revenue?period=${period}`
      if (period === 'custom') {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }
      const { data: d } = await api.get(url)
      setData(d)
    } catch (err) {
      console.error(err)
    } finally { setLoading(false) }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      let url = `/revenue/products?period=${period}`
      if (period === 'custom') {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }
      const { data: d } = await api.get(url)
      setProductData(d)
    } catch (err) {
      console.error(err)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverview()
    } else {
      fetchProducts()
    }
  }, [activeTab, period, startDate, endDate])

  const handleRefresh = () => {
    if (activeTab === 'overview') {
      fetchOverview()
    } else {
      fetchProducts()
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Biểu đồ cột Doanh thu / Line chart Đơn hàng
  const chartData = data?.chartData || []

  // Xử lý dữ liệu biểu đồ tròn cho Sản phẩm
  const getPieData = () => {
    if (!productData || !productData.products) return []
    const list = productData.products
    if (list.length <= 5) {
      return list.map(p => ({ name: p.name, value: p.revenue }))
    }
    const top5 = list.slice(0, 5)
    const otherRevenue = list.slice(5).reduce((sum, p) => sum + p.revenue, 0)
    return [
      ...top5.map(p => ({ name: p.name, value: p.revenue })),
      { name: 'Khác', value: otherRevenue }
    ]
  }

  // Lọc và Sắp xếp danh sách sản phẩm
  const filteredProducts = (productData?.products || []).filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const valA = a[sortField]
    const valB = b[sortField]
    if (sortOrder === 'asc') {
      return valA > valB ? 1 : -1
    } else {
      return valA < valB ? 1 : -1
    }
  })

  return (
    <div>
      <PageHeader
        title="Báo cáo thống kê"
        subtitle="Thống kê hoạt động kinh doanh và hiệu suất bán hàng"
        action={
          <button className="btn flex items-center gap-2" onClick={handleRefresh}>
            <i className="ti ti-refresh" /> Làm mới
          </button>
        }
      />

      {/* Main Tabs */}
      <div className="flex border-b border-brown-200 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-3 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-brown-800 text-brown-900 font-semibold'
              : 'border-transparent text-brown-500 hover:text-brown-700'
          }`}
        >
          <i className="ti ti-chart-bar text-lg" />
          Doanh thu & Đơn hàng
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-5 py-3 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'products'
              ? 'border-brown-800 text-brown-900 font-semibold'
              : 'border-transparent text-brown-500 hover:text-brown-700'
          }`}
        >
          <i className="ti ti-coffee text-lg" />
          Hiệu suất Sản phẩm
        </button>
      </div>

      {/* Filters: Period tabs & Custom range */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                period === p.value
                  ? 'bg-brown-800 text-brown-100 border-brown-800 shadow-sm'
                  : 'bg-white text-brown-600 border-brown-200 hover:bg-brown-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-brown-200 shadow-sm">
            <span className="text-xs text-brown-500 font-medium">Từ</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input text-xs py-1 px-2 border-0 focus:ring-0 w-32" />
            <span className="text-xs text-brown-500 font-medium">đến</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input text-xs py-1 px-2 border-0 focus:ring-0 w-32" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center pt-20"><Spinner /></div>
      ) : activeTab === 'overview' ? (
        /* Tab 1: OVERVIEW DOANH THU & ĐƠN HÀNG */
        !data ? null : (
          <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card shadow-sm border border-brown-100">
                <div className="text-xs text-brown-500 font-medium mb-1">Tổng doanh thu</div>
                <div className="text-2xl font-serif font-semibold text-brown-900">{formatVND(data.summary.totalRevenue)}</div>
              </div>
              <div className="card shadow-sm border border-brown-100">
                <div className="text-xs text-brown-500 font-medium mb-1">Tổng đơn đã thanh toán</div>
                <div className="text-2xl font-serif font-semibold text-brown-900">{data.summary.totalOrders} đơn</div>
              </div>
              <div className="card shadow-sm border border-brown-100">
                <div className="text-xs text-brown-500 font-medium mb-1">Giá trị trung bình / đơn</div>
                <div className="text-2xl font-serif font-semibold text-brown-900">{formatVND(data.summary.avgOrder)}</div>
              </div>
            </div>

            {/* Revenue bar chart */}
            <div className="card shadow-sm border border-brown-100">
              <div className="card-title text-brown-900 font-semibold mb-4">Biểu đồ doanh thu</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5EDE3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8B5A3A' }} axisLine={false} tickLine={false} interval={period === 'month' || period === 'custom' ? 'preserveEnd' : 0} />
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
            <div className="card shadow-sm border border-brown-100">
              <div className="card-title text-brown-900 font-semibold mb-4">Số đơn hàng</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5EDE3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8B5A3A' }} axisLine={false} tickLine={false} interval={period === 'month' || period === 'custom' ? 'preserveEnd' : 0} />
                  <YAxis tick={{ fontSize: 10, fill: '#8B5A3A' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [v, 'Đơn hàng']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8D5C4', background: '#FBF7F4' }}
                  />
                  <Line type="monotone" dataKey="orders" stroke="#6B3F2A" strokeWidth={2} dot={{ r: 3, fill: '#6B3F2A' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top products quick list */}
            {data.topProducts?.length > 0 && (
              <div className="card shadow-sm border border-brown-100">
                <div className="card-title text-brown-900 font-semibold mb-4">Top sản phẩm bán chạy nhất</div>
                <table className="table-auto w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2 font-semibold text-brown-800 text-sm">Thứ hạng</th>
                      <th className="text-left py-2 font-semibold text-brown-800 text-sm">Sản phẩm</th>
                      <th className="text-left py-2 font-semibold text-brown-800 text-sm">Số lượng bán</th>
                      <th className="text-left py-2 font-semibold text-brown-800 text-sm">Doanh thu thu về</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p, i) => (
                      <tr key={p._id} className="border-b border-brown-50 last:border-0 hover:bg-brown-50/50">
                        <td className="py-2">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-amber-100 text-amber-700' :
                            i === 1 ? 'bg-slate-100 text-slate-700' :
                            i === 2 ? 'bg-orange-100 text-orange-700' : 'text-brown-500'
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-2 font-medium text-brown-800">{p.name}</td>
                        <td className="py-2 text-brown-600">{p.quantity} phần</td>
                        <td className="py-2 font-semibold text-brown-900">{formatVND(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      ) : (
        /* Tab 2: PRODUCT STATISTICS */
        !productData ? null : (
          <div className="space-y-6">
            {/* Product summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card shadow-sm border border-brown-100">
                <div className="text-xs text-brown-500 font-medium mb-1">Tổng doanh số sản phẩm</div>
                <div className="text-2xl font-serif font-semibold text-brown-900">{formatVND(productData.summary.totalRevenue)}</div>
              </div>
              <div className="card shadow-sm border border-brown-100">
                <div className="text-xs text-brown-500 font-medium mb-1">Tổng số lượng bán ra</div>
                <div className="text-2xl font-serif font-semibold text-brown-900">{productData.summary.totalQuantity} phần</div>
              </div>
              <div className="card shadow-sm border border-brown-100">
                <div className="text-xs text-brown-500 font-medium mb-1">Số lượng mặt hàng phát sinh đơn</div>
                <div className="text-2xl font-serif font-semibold text-brown-900">{productData.summary.productCount} sản phẩm</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Product Pie Chart */}
              <div className="card shadow-sm border border-brown-100 lg:col-span-2 flex flex-col justify-between">
                <div className="card-title text-brown-900 font-semibold mb-4">Cơ cấu doanh thu sản phẩm</div>
                <div className="flex-1 flex items-center justify-center min-h-[220px]">
                  {getPieData().length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={getPieData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {getPieData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatVND(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-brown-400 text-sm">Chưa có dữ liệu</div>
                  )}
                </div>
                {/* Custom Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-brown-600">
                  {getPieData().map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span className="truncate" title={entry.name}>{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Product Table */}
              <div className="card shadow-sm border border-brown-100 lg:col-span-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="card-title text-brown-900 font-semibold">Danh sách chi tiết sản phẩm</div>
                  {/* Search input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tìm sản phẩm..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="input py-1.5 pl-8 pr-3 text-xs w-full sm:w-48 bg-brown-50 border-brown-200 focus:bg-white text-brown-800"
                    />
                    <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-brown-400 text-sm" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="table-auto w-full text-sm">
                    <thead>
                      <tr className="border-b border-brown-100">
                        <th className="text-left py-2 font-semibold text-brown-800 text-xs uppercase tracking-wider">Sản phẩm</th>
                        <th
                          className="text-right py-2 font-semibold text-brown-800 text-xs uppercase tracking-wider cursor-pointer hover:text-brown-600 transition-colors"
                          onClick={() => handleSort('quantity')}
                        >
                          Số lượng {sortField === 'quantity' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </th>
                        <th
                          className="text-right py-2 font-semibold text-brown-800 text-xs uppercase tracking-wider cursor-pointer hover:text-brown-600 transition-colors"
                          onClick={() => handleSort('revenue')}
                        >
                          Doanh thu {sortField === 'revenue' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </th>
                        <th className="text-right py-2 font-semibold text-brown-800 text-xs uppercase tracking-wider">% Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedProducts.length > 0 ? (
                        sortedProducts.map((p) => (
                          <tr key={p._id} className="border-b border-brown-50 last:border-0 hover:bg-brown-50/50 transition-colors">
                            <td className="py-2.5 font-medium text-brown-800">{p.name}</td>
                            <td className="py-2.5 text-right text-brown-600 font-semibold">{p.quantity} phần</td>
                            <td className="py-2.5 text-right font-semibold text-brown-900">{formatVND(p.revenue)}</td>
                            <td className="py-2.5 text-right">
                              <span className="inline-block bg-brown-100/50 text-brown-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                                {p.percentage}%
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-brown-400 text-sm">Không tìm thấy sản phẩm nào</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
