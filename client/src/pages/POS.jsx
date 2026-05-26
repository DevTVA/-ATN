import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { formatVND, formatDateTime } from '../utils/format'
import { Spinner, Badge } from '../components/ui'
import { useAuthStore } from '../store/authStore'

export default function POS() {
  const { user } = useAuthStore()
  const [tables, setTables] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [selectedTable, setSelectedTable] = useState(null)
  const [currentOrder, setCurrentOrder] = useState(null)
  
  const [items, setItems] = useState([])
  const [note, setNote] = useState('')
  const [discount, setDiscount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [receiptData, setReceiptData] = useState(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const CAT_LABELS = {
    all: 'Tất cả',
    cafe: 'Cà phê',
    'tra-sua': 'Trà sữa',
    'banh-ngot': 'Bánh ngọt',
    'nuoc-ep': 'Nước ép'
  }

  const fetchTables = async () => {
    const { data } = await api.get('/tables')
    // Đưa bàn "Mang về" lên đầu
    const sorted = data.sort((a, b) => {
      if (a.number === 0) return -1
      if (b.number === 0) return 1
      return a.number - b.number
    })
    setTables(sorted)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      await fetchTables()
      const pRes = await api.get('/products?available=true')
      setProducts(pRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Khi chọn bàn
  const handleSelectTable = async (t) => {
    setSelectedTable(t)
    setItems([])
    setNote('')
    setDiscount(0)
    setCurrentOrder(null)
    setReceiptData(null)
    
    if (t.status === 'occupied' && t.currentOrder) {
      try {
        const { data } = await api.get(`/orders/${t.currentOrder._id || t.currentOrder}`)
        setCurrentOrder(data)
      } catch (err) {
        toast.error('Không thể lấy thông tin đơn hàng')
      }
    }
  }

  // Thêm món (cho bàn trống)
  const addItem = (p) => {
    setItems(prev => {
      const ex = prev.find(i => i.productId === p._id)
      if (ex) return prev.map(i => i.productId === p._id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { productId: p._id, name: p.name, price: p.price, quantity: 1 }]
    })
  }
  const changeQty = (id, q) => {
    if (q < 1) setItems(prev => prev.filter(i => i.productId !== id))
    else setItems(prev => prev.map(i => i.productId === id ? { ...i, quantity: q } : i))
  }

  const handleCreateOrder = async () => {
    if (items.length === 0) return toast.error('Vui lòng chọn món')
    setSaving(true)
    try {
      await api.post('/orders', {
        tableId: selectedTable._id,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        note,
        discount: Number(discount)
      })
      toast.success('Đã tạo đơn hàng')
      await fetchTables()
      handleSelectTable(tables.find(t => t._id === selectedTable._id)) // refresh state
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo đơn')
    } finally { setSaving(false) }
  }

  const handleCheckout = async () => {
    if (!currentOrder) return
    setSaving(true)
    try {
      await api.put(`/orders/${currentOrder._id}`, { status: 'paid' })
      setReceiptData({ ...currentOrder, paidAt: new Date() })
      toast.success('Thanh toán thành công')
      await fetchTables()
      setSelectedTable(null)
      setCurrentOrder(null)
      
      // Mở hộp thoại in
      setTimeout(() => window.print(), 300)
    } catch (err) {
      toast.error('Lỗi thanh toán')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center pt-20"><Spinner /></div>

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const total = subtotal - Number(discount)

  const categories = ['all', ...new Set(products.map(p => p.category))]
  const filteredProducts = products.filter(p => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-6 bg-brown-50">
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Tables */}
        <div className="w-2/3 p-6 overflow-y-auto border-r border-brown-200">
          <h2 className="text-xl font-serif text-brown-900 mb-4">Sơ đồ bàn & Mang về</h2>
          <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {tables.map(t => (
              <div
                key={t._id}
                onClick={() => handleSelectTable(t)}
                className={`rounded-xl border-2 p-3 text-center cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center min-h-[100px] ${
                  selectedTable?._id === t._id ? 'ring-4 ring-brown-400 ring-opacity-50 ' : ''
                } ${
                  t.number === 0 ? 'bg-sky-50 border-sky-200' :
                  t.status === 'occupied' ? 'bg-red-50 border-red-200' :
                  t.status === 'reserved' ? 'bg-amber-50 border-amber-200' :
                  'bg-green-50 border-green-200'
                }`}
              >
                {t.number === 0 ? (
                  <div className="text-3xl mb-1">🥡</div>
                ) : (
                  <div className="text-2xl mb-1">
                    {t.status === 'occupied' ? '🔴' : t.status === 'reserved' ? '🟡' : '🟢'}
                  </div>
                )}
                <div className="font-bold text-brown-900 text-sm">
                  {t.number === 0 ? 'Mang về' : `Bàn ${t.number}`}
                </div>
                {t.status === 'occupied' && t.currentOrder?.total && (
                  <div className="text-[10px] font-semibold text-red-600 mt-1">{formatVND(t.currentOrder.total)}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Order / Cart */}
        <div className="w-1/3 bg-white flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
          {!selectedTable ? (
            <div className="flex-1 flex flex-col items-center justify-center text-brown-400 p-6 text-center">
              <i className="ti ti-hand-click text-5xl mb-4 opacity-50" />
              <p>Chọn một bàn hoặc "Mang về"<br/>để bắt đầu đặt món</p>
            </div>
          ) : selectedTable.status === 'empty' || selectedTable.status === 'reserved' ? (
            // NEW ORDER FORM
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-brown-100 bg-brown-50 flex justify-between items-center">
                <div>
                  <div className="font-serif text-lg font-bold text-brown-900">
                    {selectedTable.number === 0 ? 'Đơn Mang Về' : `Bàn ${selectedTable.number}`}
                  </div>
                  <div className="text-xs text-brown-500">Tạo đơn mới</div>
                </div>
                <button className="text-brown-400 hover:text-brown-700" onClick={() => setSelectedTable(null)}><i className="ti ti-x" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* Search & Categories */}
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" />
                    <input className="input text-sm pl-9" placeholder="Tìm tên món..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {categories.map(c => (
                      <button key={c} onClick={() => setCategoryFilter(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${categoryFilter === c ? 'bg-brown-800 text-brown-100' : 'bg-brown-100 text-brown-700 hover:bg-brown-200'}`}>
                        {CAT_LABELS[c] || c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product List */}
                <div>
                  <div className="text-xs font-semibold text-brown-500 uppercase mb-2">Thực đơn</div>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredProducts.map(p => (
                      <button key={p._id} onClick={() => addItem(p)} className="text-left p-2 rounded border border-brown-100 hover:bg-brown-50 hover:border-brown-300 transition-all">
                        <div className="text-lg leading-none mb-1">{p.emoji}</div>
                        <div className="text-xs font-medium text-brown-900 truncate">{p.name}</div>
                        <div className="text-[10px] text-brown-500">{formatVND(p.price)}</div>
                      </button>
                    ))}
                  </div>
                  {filteredProducts.length === 0 && (
                    <div className="text-center text-brown-400 text-sm py-4">Không tìm thấy món nào</div>
                  )}
                </div>

                {/* Cart */}
                {items.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-brown-500 uppercase mb-2">Món đã chọn</div>
                    <div className="space-y-1">
                      {items.map(item => (
                        <div key={item.productId} className="flex items-center gap-2 bg-brown-50 p-2 rounded text-sm">
                          <span className="flex-1 truncate font-medium">{item.name}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => changeQty(item.productId, item.quantity - 1)} className="w-6 h-6 rounded bg-white border border-brown-200 text-xs flex items-center justify-center font-bold">−</button>
                            <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                            <button onClick={() => changeQty(item.productId, item.quantity + 1)} className="w-6 h-6 rounded bg-white border border-brown-200 text-xs flex items-center justify-center font-bold">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-auto">
                  <div className="text-xs font-semibold text-brown-500 uppercase mb-2">Thông tin thêm</div>
                  <input className="input text-xs py-1.5 mb-2" placeholder="Ghi chú đơn hàng..." value={note} onChange={e => setNote(e.target.value)} />
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-16">Giảm giá:</span>
                    <input className="input text-xs py-1.5" type="number" placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-brown-100 bg-white">
                <div className="flex justify-between items-center font-bold text-lg mb-3">
                  <span>Tổng tiền:</span>
                  <span className="text-brown-800">{formatVND(Math.max(0, total))}</span>
                </div>
                <button className="btn btn-primary w-full py-3 text-base justify-center" onClick={handleCreateOrder} disabled={saving || items.length === 0}>
                  {saving ? 'Đang xử lý...' : 'Đặt món & Tạo đơn'}
                </button>
              </div>
            </div>
          ) : (
            // CURRENT ORDER VIEW
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-brown-100 bg-brown-800 text-brown-50 flex justify-between items-center">
                <div>
                  <div className="font-serif text-lg font-bold">
                    {selectedTable.number === 0 ? 'Đơn Mang Về' : `Bàn ${selectedTable.number}`}
                  </div>
                  <div className="text-xs opacity-80">Đang phục vụ</div>
                </div>
                <button className="text-brown-200 hover:text-white" onClick={() => setSelectedTable(null)}><i className="ti ti-x" /></button>
              </div>

              {!currentOrder ? (
                <div className="flex-1 flex justify-center items-center"><Spinner /></div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-brown-100">
                      <span className="text-xs text-brown-500">Mã đơn: <span className="font-mono font-bold text-brown-900">{currentOrder.orderCode}</span></span>
                      <Badge status={currentOrder.status} />
                    </div>
                    
                    <div className="flex justify-between text-xs text-brown-600 mb-4 bg-brown-50 px-3 py-2 rounded-lg border border-brown-100">
                      <div><span className="font-semibold text-brown-800">Vào:</span> {new Date(currentOrder.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</div>
                      <div><span className="font-semibold text-brown-800">Ra (dự kiến):</span> {new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      {currentOrder.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-start text-sm">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-brown-400">{formatVND(item.price)} × {item.quantity}</div>
                          </div>
                          <div className="font-semibold">{formatVND(item.price * item.quantity)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 text-sm text-brown-600 border-t border-brown-100 pt-3">
                      <div className="flex justify-between">
                        <span>Tạm tính</span><span>{formatVND(currentOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Giảm giá</span><span>- {formatVND(currentOrder.discount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-brown-100 bg-white">
                    <div className="flex justify-between items-end mb-4">
                      <span className="text-sm font-medium text-brown-600">Tổng thanh toán</span>
                      <span className="text-2xl font-bold font-serif text-brown-900">{formatVND(currentOrder.total)}</span>
                    </div>
                    <button className="btn w-full bg-green-600 text-white border-green-600 hover:bg-green-700 py-3 text-base justify-center" onClick={handleCheckout} disabled={saving}>
                      <i className="ti ti-check" /> {saving ? 'Đang xử lý...' : 'Thanh toán & In HĐ'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PRINT RECEIPT (Hidden on screen) */}
      <div id="print-receipt" className="hidden">
        {receiptData && (
          <div className="w-[80mm] mx-auto text-black font-sans text-[12px] leading-tight p-4">
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold font-serif mb-1">Brew & Co.</h1>
              <p className="text-[10px]">123 Đường Cà Phê, Quận 1, TP.HCM</p>
              <p className="text-[10px]">ĐT: 090 123 4567</p>
              <h2 className="text-lg font-bold mt-3 uppercase border-b border-dashed border-black pb-2">Hóa Đơn Thanh Toán</h2>
            </div>
            
            <div className="mb-3">
              <p>Ngày: {formatDateTime(receiptData.paidAt)}</p>
              <p>Mã đơn: <b>{receiptData.orderCode}</b></p>
              <p>Bàn: <b>{receiptData.tableNumber === 0 ? 'Mang về' : receiptData.tableNumber}</b></p>
              <p>Thu ngân: {receiptData.staffName}</p>
            </div>

            <table className="w-full mb-3 border-b border-dashed border-black pb-2">
              <thead>
                <tr className="border-b border-dashed border-black text-left">
                  <th className="pb-1 font-semibold w-1/2">Món</th>
                  <th className="pb-1 font-semibold text-center">SL</th>
                  <th className="pb-1 font-semibold text-right">TT</th>
                </tr>
              </thead>
              <tbody>
                {receiptData.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-1">{item.name}</td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right">{formatVND(item.price * item.quantity).replace('đ', '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 mb-4 border-b border-dashed border-black pb-3">
              <div className="flex justify-between">
                <span>Tạm tính:</span><span>{formatVND(receiptData.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Giảm giá:</span><span>{formatVND(receiptData.discount)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm mt-1">
                <span>Tổng tiền:</span><span>{formatVND(receiptData.total)}</span>
              </div>
            </div>

            <div className="text-center text-[10px] italic">
              <p>Cảm ơn quý khách và hẹn gặp lại!</p>
              <p>Wifi: BrewAndCo - Pass: 12345678</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
