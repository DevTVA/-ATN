import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { formatVND, formatDateTime } from '../utils/format'
import { Spinner, Badge, Modal } from '../components/ui'
import { useAuthStore } from '../store/authStore'

const getDiscountAmount = (subTotal, type, val) => {
  return type === 'percent'
    ? Math.round((subTotal * Number(val || 0)) / 100)
    : Number(val || 0)
}

export default function POS() {
  const { user } = useAuthStore()
  const [tables, setTables] = useState([])
  const [takeawayOrders, setTakeawayOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [leftTab, setLeftTab] = useState('all') // 'all', 'takeaway', 'empty', 'occupied'
  const [leftSearchQuery, setLeftSearchQuery] = useState('')
  
  const [selectedTable, setSelectedTable] = useState({ _id: 'takeaway', number: 0, name: 'Mang về' })
  const [currentOrder, setCurrentOrder] = useState(null)
  
  const [items, setItems] = useState([])
  const [note, setNote] = useState('')
  
  // State giảm giá mới
  const [discountType, setDiscountType] = useState('percent') // 'percent' hoặc 'amount'
  const [discountValue, setDiscountValue] = useState(0)
  
  const [saving, setSaving] = useState(false)
  const [receiptData, setReceiptData] = useState(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Các state bổ sung
  const [isEditingOrder, setIsEditingOrder] = useState(false)
  const [showMoveTableModal, setShowMoveTableModal] = useState(false)

  // State cho món tự thêm ngoài menu (món custom)
  const [showCustomProductModal, setShowCustomProductModal] = useState(false)
  const [customProductForm, setCustomProductForm] = useState({ name: '', price: '', quantity: 1 })

  // State cho giảm giá nhanh và ghép bàn
  const [showQuickDiscountModal, setShowQuickDiscountModal] = useState(false)
  const [quickDiscountType, setQuickDiscountType] = useState('percent')
  const [quickDiscountValue, setQuickDiscountValue] = useState(0)
  const [showMergeTableModal, setShowMergeTableModal] = useState(false)

  // State cho QR Code Modal
  const [showPrintModal, setShowPrintModal] = useState(false)


  const CAT_LABELS = {
    all: 'Tất cả',
    'nuoc-ep': 'Nước ép',
    'tra-sua': 'Trà sữa',
    'tra-hoa-qua': 'Trà hoa quả',
    'do-da-xay': 'Đồ đá xay',
    'cafe': 'Cà phê',
    'sinh-to': 'Sinh tố',
    'banh-ngot': 'Bánh ngọt',
    'khac': 'Đồ khác...'
  }

  const fetchTakeawayOrders = async () => {
    try {
      const { data } = await api.get('/orders?type=takeaway&status=processing')
      setTakeawayOrders(data)
    } catch (err) {
      toast.error('Không thể lấy danh sách đơn mang về')
    }
  }

  const fetchTables = async () => {
    const { data } = await api.get('/tables')
    // Lọc bỏ bàn số 0 (mang về) khỏi sơ đồ bàn vật lý
    const activeTables = data.filter(t => t.number !== 0).sort((a, b) => a.number - b.number)
    setTables(activeTables)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      await fetchTables()
      await fetchTakeawayOrders()
      const pRes = await api.get('/products?available=true')
      setProducts(pRes.data)
    } finally {
      setLoading(false)
    }
  }

  const [notifiedOrders, setNotifiedOrders] = useState(new Set())
  const [isFirstPoll, setIsFirstPoll] = useState(true)

  const resetCartAndSetTakeaway = () => {
    setItems([])
    setNote('')
    setDiscountType('percent')
    setDiscountValue(0)
    setSelectedTable({ _id: 'takeaway', number: 0, name: 'Mang về' })
    setCurrentOrder(null)
    setIsEditingOrder(false)
  }

  useEffect(() => {
    fetchData()
    resetCartAndSetTakeaway()
  }, [])

  // useEffect để gán document.title phục vụ đặt tên file PDF tự động khi in
  useEffect(() => {
    if (showPrintModal && receiptData) {
      const originalTitle = document.title;
      const billCode = receiptData.orderCode.replace('#', '');
      document.title = `HoaDon_${billCode}`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [showPrintModal, receiptData]);

  // useEffect chạy ngầm kiểm tra các đơn hàng thanh toán QR thành công từ Webhook SePay
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Thêm _t để chống cache 304 Not Modified của trình duyệt
        const { data } = await api.get(`/orders?status=paid&sort=updatedAt&limit=10&_t=${Date.now()}`);
        if (data && data.length > 0) {
          let hasNewQrPaid = false;
          let matchedOrder = null;

          setNotifiedOrders(prev => {
            const newSet = new Set(prev);
            for (const order of data) {
              if (!newSet.has(order._id)) {
                newSet.add(order._id);
                if (!isFirstPoll) {
                  const paymentMethod = order.payment?.paymentMethod || order.paymentMethod;
                  if (paymentMethod === 'QR_CODE') {
                    hasNewQrPaid = true;
                    matchedOrder = order;
                    const nameText = order.type === 'dine-in' ? `Bàn ${order.tableNumber}` : 'Đơn mang về';
                    toast.success(
                      <div className="font-sans text-center">
                        <p className="font-extrabold text-emerald-800 text-lg uppercase tracking-wide">💰 Thanh toán QR thành công 💰</p>
                        <p className="font-bold text-emerald-700 text-2xl my-2">{nameText}</p>
                        <p className="text-sm font-semibold text-emerald-600">Đơn hàng: {order.orderCode} • Tổng tiền: {formatVND(order.total)}</p>
                      </div>,
                      { 
                        duration: 10000, 
                        position: 'top-center',
                        style: {
                          border: '3px solid #10B981',
                          padding: '24px',
                          color: '#065F46',
                          background: '#ECFDF5',
                          minWidth: '420px',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                          borderRadius: '16px',
                        }
                      }
                    );
                    playSuccessSound();
                  }
                }
              }
            }
            return newSet;
          });

          if (hasNewQrPaid) {
            fetchTables();
            fetchTakeawayOrders();
            if (currentOrder && matchedOrder && currentOrder._id === matchedOrder._id) {
              // Cập nhật trạng thái hiển thị của đơn hàng hiện tại thành paid và gán paymentMethod là QR_CODE
              setCurrentOrder(prev => ({
                ...prev,
                status: 'paid',
                paymentMethod: 'QR_CODE',
                payment: matchedOrder.payment || { paymentMethod: 'QR_CODE', paidAt: new Date() }
              }));
            }
          }
          if (isFirstPoll) setIsFirstPoll(false);
        }
      } catch (err) {
        console.error("Lỗi polling kiểm tra đơn PAID ngầm:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isFirstPoll, currentOrder]);

  // useEffect chuyên biệt để gọi API kiểm tra trạng thái thanh toán của riêng đơn hàng đang mở ở POS
  useEffect(() => {
    if (!currentOrder || currentOrder.status === 'paid' || currentOrder.status === 'cancelled') return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/orders/${currentOrder._id}?_t=${Date.now()}`);
        if (data && data.status === 'paid') {
          const paymentMethod = data.payment?.paymentMethod || data.paymentMethod;
          if (paymentMethod === 'QR_CODE') {
            const nameText = data.type === 'dine-in' ? `Bàn ${data.tableNumber}` : 'Đơn mang về';
            toast.success(
              <div className="font-sans text-center">
                <p className="font-extrabold text-emerald-800 text-lg uppercase tracking-wide">💰 Thanh toán QR thành công 💰</p>
                <p className="font-bold text-emerald-700 text-2xl my-2">{nameText}</p>
                <p className="text-sm font-semibold text-emerald-600">Đơn hàng: {data.orderCode} • Tổng tiền: {formatVND(data.total)}</p>
              </div>,
              { 
                duration: 10000, 
                position: 'top-center',
                style: {
                  border: '3px solid #10B981',
                  padding: '24px',
                  color: '#065F46',
                  background: '#ECFDF5',
                  minWidth: '420px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                  borderRadius: '16px',
                }
              }
            );
            playSuccessSound();
            
            // Cập nhật trạng thái hiển thị của đơn hàng hiện tại thành paid và gán payment
            setCurrentOrder(prev => {
              if (!prev || prev._id !== data._id) return prev;
              return {
                ...prev,
                status: 'paid',
                paymentMethod: 'QR_CODE',
                payment: data.payment || { paymentMethod: 'QR_CODE', paidAt: new Date() }
              };
            });
            
            fetchTables();
            fetchTakeawayOrders();
          }
        }
      } catch (err) {
        console.error("Lỗi gọi API kiểm tra trạng thái webhook cho đơn hiện tại:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentOrder?._id, currentOrder?.status]);

  // Tự động hoàn tất giao dịch nếu đơn hàng hiện tại được thanh toán QR thành công từ xa (SePay webhook)
  useEffect(() => {
    if (currentOrder && currentOrder.status === 'paid') {
      const isQr = currentOrder.payment?.paymentMethod === 'QR_CODE' || currentOrder.paymentMethod === 'QR_CODE';
      if (isQr) {
        handleFinishTransaction();
        handleDirectPrint(currentOrder);
      }
    }
  }, [currentOrder?.status, currentOrder?.payment?.paymentMethod, currentOrder?.paymentMethod]);

  // Khi chọn bàn
  const handleSelectTable = async (t) => {
    setSelectedTable(t)
    setCurrentOrder(null)
    setReceiptData(null)
    setIsEditingOrder(false)
    
    if ((t.status === 'occupied' || t.status === 'reserved') && t.currentOrder) {
      setItems([])
      setNote('')
      setDiscountType('percent')
      setDiscountValue(0)
      try {
        const { data } = await api.get(`/orders/${t.currentOrder._id || t.currentOrder}`)
        setCurrentOrder(data)
      } catch (err) {
        toast.error('Không thể lấy thông tin đơn hàng')
      }
    }
  }

  // Khi chọn đơn mang về từ danh sách chờ
  const handleSelectTakeawayOrder = async (order) => {
    setSelectedTable({ _id: 'takeaway', number: 0, name: 'Mang về' })
    setItems([])
    setNote('')
    setDiscountType('percent')
    setDiscountValue(0)
    setReceiptData(null)
    setIsEditingOrder(false)
    try {
      const { data } = await api.get(`/orders/${order._id}`)
      setCurrentOrder(data)
    } catch (err) {
      setCurrentOrder(order)
    }
  }

  // Khi tạo đơn mang về mới
  const handleNewTakeawayOrder = () => {
    setSelectedTable({ _id: 'takeaway', number: 0, name: 'Mang về' })
    setCurrentOrder(null)
    setReceiptData(null)
    setIsEditingOrder(false)
  }



  // Chuyển bàn hiện tại thành đơn mang về
  const handleConvertToTakeaway = async () => {
    if (!currentOrder) return
    if (!confirm('Bạn có chắc muốn chuyển đơn này thành mang về? Bàn hiện tại sẽ được giải phóng.')) return
    setSaving(true)
    try {
      const { data } = await api.put(`/orders/${currentOrder._id}/change-table`, { toTakeaway: true })
      toast.success('Đã chuyển thành đơn mang về')
      await fetchTables()
      await fetchTakeawayOrders()
      setSelectedTable({ _id: 'takeaway', number: 0, name: 'Mang về' })
      setCurrentOrder(data.order || data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi chuyển sang mang về')
    } finally { setSaving(false) }
  }

  // Âm thanh báo thanh toán thành công
  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.log('Audio Context Error:', e);
    }
  }

  const handleFinishTransaction = async () => {
    await fetchTables()
    await fetchTakeawayOrders()
    resetCartAndSetTakeaway()
  }

  // In hóa đơn trực tiếp không qua modal trung gian
  const handleDirectPrint = (order) => {
    if (!order) return;
    const originalTitle = document.title;
    const billCode = order.orderCode.replace('#', '');
    document.title = `HoaDon_${billCode}`;

    setReceiptData({ ...order, paidAt: order.payment?.paidAt || order.paidAt || new Date() });
    setTimeout(() => {
      printReceipt(order);
      // Khôi phục lại tiêu đề gốc sau 1 giây (đủ để trình duyệt gợi ý tên file PDF)
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 150);
  }

  // In hóa đơn trực tiếp từ DOM chính - chờ ảnh QR tải xong
  const printReceipt = (order) => {
    // Tìm ảnh QR trong khu vực #print-receipt của DOM
    const printDiv = document.getElementById('print-receipt');
    if (!printDiv) {
      // Nếu không tìm thấy div in, thử in bằng window.print() ngay
      window.print();
      return;
    }

    const img = printDiv.querySelector('img');

    const triggerPrint = () => {
      // Đợi thêm một nhịp render ngắn rồi mới gọi in
      setTimeout(() => {
        window.print();
      }, 300);
    };

    if (img && order.status !== 'paid') {
      // Đơn chưa thanh toán và có ảnh QR, ta phải chờ ảnh load xong
      if (img.complete) {
        triggerPrint();
      } else {
        img.onload = () => {
          triggerPrint();
        };
        img.onerror = () => {
          // Lỗi load ảnh cũng phải in
          triggerPrint();
        };
        // Phòng hờ ảnh load quá lâu, sau 3.5s tự động in
        setTimeout(triggerPrint, 3500);
      }
    } else {
      // Đơn đã thanh toán (không có QR), in ngay
      triggerPrint();
    }
  }

  // Xác nhận thanh toán trực tiếp (Mặc định tiền mặt, không tự động in bill)
  const handleCheckoutDirect = async () => {
    if (!currentOrder) return
    setSaving(true)
    try {
      // Fetch thông tin mới nhất của đơn hàng từ DB để kiểm tra xem đã chuyển khoản QR thành công chưa
      const { data: latestOrder } = await api.get(`/orders/${currentOrder._id}`)
      
      if (latestOrder.status === 'paid') {
        // Đã thanh toán trước đó (do Webhook SePay ghi nhận và lưu)
        toast.success('Đã nhận chuyển khoản QR thành công!');
      } else {
        // Chưa thanh toán -> Gửi yêu cầu cập nhật thanh toán trực tiếp (mặc định cash)
        await api.put(`/orders/${currentOrder._id}`, { status: 'paid', paymentMethod: 'cash' })
        toast.success('Thanh toán thành công!');
      }
      
      // GIẢI PHÓNG BÀN & GIỎ HÀNG LẬP TỨC TRÊN POS
      await handleFinishTransaction()
    } catch (err) {
      toast.error('Lỗi thanh toán: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
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
      const calculatedDiscount = getDiscountAmount(subtotal, discountType, discountValue)
      const isTakeaway = selectedTable._id === 'takeaway'
      
      await api.post('/orders', {
        type: isTakeaway ? 'takeaway' : 'dine-in',
        tableId: isTakeaway ? undefined : selectedTable._id,
        items: items.map(i => ({
          productId: i.isCustom ? undefined : i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          isCustom: i.isCustom
        })),
        note,
        discount: calculatedDiscount
      })
      toast.success('Đã tạo đơn hàng')
      await fetchTables()
      await fetchTakeawayOrders()
      resetCartAndSetTakeaway()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo đơn')
    } finally { setSaving(false) }
  }

  const handleStartEditOrder = () => {
    if (!currentOrder) return
    setIsEditingOrder(true)
    setItems(currentOrder.items.map((item, index) => ({
      productId: item.product?._id || item.product || `custom-${Date.now()}-${index}`,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      note: item.note || '',
      isCustom: !item.product
    })))
    setNote(currentOrder.note || '')
    setDiscountType('amount')
    setDiscountValue(currentOrder.discount || 0)
  }

  const handleUpdateOrder = async () => {
    if (items.length === 0) return toast.error('Vui lòng chọn món')
    setSaving(true)
    try {
      const calculatedDiscount = getDiscountAmount(subtotal, discountType, discountValue)
      await api.put(`/orders/${currentOrder._id}`, {
        items: items.map(i => ({
          productId: i.isCustom || i.productId?.startsWith('custom-') ? undefined : i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          isCustom: i.isCustom || i.productId?.startsWith('custom-'),
          note: i.note || ''
        })),
        note,
        discount: calculatedDiscount
      })
      toast.success('Đã cập nhật đơn hàng')
      setIsEditingOrder(false)
      await fetchTables()
      await fetchTakeawayOrders()
      // Tải lại chi tiết đơn hàng
      const { data } = await api.get(`/orders/${currentOrder._id}`)
      setCurrentOrder(data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật đơn')
    } finally { setSaving(false) }
  }

  const handleCancelOrder = async () => {
    if (!currentOrder) return
    if (!confirm(`Bạn có chắc chắn muốn hủy đơn hàng ${currentOrder.orderCode}?`)) return
    setSaving(true)
    try {
      await api.put(`/orders/${currentOrder._id}`, { status: 'cancelled' })
      toast.success('Đã hủy đơn hàng')
      await fetchTables()
      await fetchTakeawayOrders()
      resetCartAndSetTakeaway()
    } catch (err) {
      toast.error('Lỗi khi hủy đơn hàng')
    } finally { setSaving(false) }
  }

  const handleMoveTable = async (targetTableId) => {
    if (!currentOrder) return
    setSaving(true)
    try {
      const { data } = await api.put(`/orders/${currentOrder._id}/change-table`, { newTableId: targetTableId })
      toast.success('Chuyển bàn thành công')
      setShowMoveTableModal(false)
      
      // Load lại tables và cập nhật state selectedTable sang bàn mới
      const updatedTables = await api.get('/tables')
      const sorted = updatedTables.data.filter(t => t.number !== 0).sort((a, b) => a.number - b.number)
      setTables(sorted)
      
      const newTable = sorted.find(t => t._id === targetTableId)
      setSelectedTable(newTable)
      
      // Gán lại currentOrder từ kết quả trả về
      setCurrentOrder(data.order || data)

      // Tải lại đơn mang về để đồng bộ giao diện
      await fetchTakeawayOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi chuyển bàn')
    } finally { setSaving(false) }
  }

  const handleOpenQuickDiscount = () => {
    if (!currentOrder) return
    setQuickDiscountType('amount')
    setQuickDiscountValue(currentOrder.discount || 0)
    setShowQuickDiscountModal(true)
  }

  const handleUpdateQuickDiscount = async () => {
    if (!currentOrder) return
    setSaving(true)
    try {
      const calculatedDiscount = quickDiscountType === 'percent'
        ? Math.round((currentOrder.subtotal * Number(quickDiscountValue || 0)) / 100)
        : Number(quickDiscountValue || 0)

      await api.put(`/orders/${currentOrder._id}`, { discount: calculatedDiscount })
      toast.success('Đã cập nhật giảm giá')
      setShowQuickDiscountModal(false)
      await fetchTables()
      await fetchTakeawayOrders()
      // Tải lại chi tiết đơn hàng
      const { data } = await api.get(`/orders/${currentOrder._id}`)
      setCurrentOrder(data)
    } catch (err) {
      toast.error('Lỗi khi cập nhật giảm giá')
    } finally { setSaving(false) }
  }

  const handleMergeTable = async (sourceTableId) => {
    if (!currentOrder) return
    if (!confirm('Bạn có chắc chắn muốn ghép đơn từ bàn này vào bàn hiện tại không? Tất cả món ăn sẽ được gộp chung.')) return
    setSaving(true)
    try {
      await api.put(`/orders/${currentOrder._id}/merge-table`, { sourceTableId })
      toast.success('Ghép bàn thành công')
      setShowMergeTableModal(false)
      
      // Load lại tables
      const updatedTables = await api.get('/tables')
      const sorted = updatedTables.data.sort((a, b) => {
        if (a.number === 0) return -1
        if (b.number === 0) return 1
        return a.number - b.number
      })
      setTables(sorted)
      
      // Cập nhật selectedTable
      const currentTable = sorted.find(t => t._id === selectedTable._id)
      setSelectedTable(currentTable)
      
      // Load lại order hiện tại
      const { data: orderData } = await api.get(`/orders/${currentOrder._id}`)
      setCurrentOrder(orderData)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi ghép bàn')
    } finally { setSaving(false) }
  }

  const handleAddCustomProduct = () => {
    const { name, price, quantity } = customProductForm
    if (!name.trim()) return toast.error('Vui lòng nhập tên món')
    if (!price || Number(price) <= 0) return toast.error('Vui lòng nhập giá hợp lệ')
    if (!quantity || Number(quantity) < 1) return toast.error('Vui lòng nhập số lượng hợp lệ')

    const newItem = {
      productId: `custom-${Date.now()}`,
      name: name.trim(),
      price: Number(price),
      quantity: Number(quantity),
      isCustom: true
    }

    setItems(prev => {
      const ex = prev.find(i => i.isCustom && i.name.toLowerCase() === newItem.name.toLowerCase() && i.price === newItem.price)
      if (ex) {
        return prev.map(i => (i.isCustom && i.name.toLowerCase() === newItem.name.toLowerCase() && i.price === newItem.price)
          ? { ...i, quantity: i.quantity + newItem.quantity }
          : i)
      }
      return [...prev, newItem]
    })

    toast.success(`Đã thêm món "${name}" ngoài thực đơn`)
    setShowCustomProductModal(false)
    setCustomProductForm({ name: '', price: '', quantity: 1 })
  }

  if (loading) return <div className="flex justify-center pt-20"><Spinner /></div>

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const discountAmount = getDiscountAmount(subtotal, discountType, discountValue)
  const total = subtotal - discountAmount

  const categories = ['all', ...new Set(products.map(p => p.category?.slug || p.category).filter(Boolean))]
  const filteredProducts = products.filter(p => {
    const pCatSlug = p.category?.slug || p.category
    if (categoryFilter !== 'all' && pCatSlug !== categoryFilter) return false
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const filteredTakeawayOrders = leftTab === 'empty' || leftTab === 'occupied'
    ? []
    : takeawayOrders.filter(order => {
        if (!leftSearchQuery) return true
        const query = leftSearchQuery.toLowerCase()
        return (
          order.orderCode.toLowerCase().includes(query) ||
          (order.note && order.note.toLowerCase().includes(query)) ||
          (order.staffName && order.staffName.toLowerCase().includes(query))
        )
      })

  const filteredTables = tables.filter(t => {
    // Lọc theo tìm kiếm ở cột trái
    if (leftSearchQuery) {
      const query = leftSearchQuery.toLowerCase()
      const matchesNumber = String(t.number).includes(query)
      const matchesName = t.name && t.name.toLowerCase().includes(query)
      const matchesOrderCode = t.currentOrder?.orderCode && t.currentOrder.orderCode.toLowerCase().includes(query)
      if (!matchesNumber && !matchesName && !matchesOrderCode) return false
    }
    // Lọc theo bộ lọc status bàn (Trống / Đang dùng / Đặt trước) thông qua leftTab
    if (leftTab === 'empty' && t.status !== 'empty') return false
    if (leftTab === 'occupied' && t.status !== 'occupied') return false
    if (leftTab === 'reserved' && t.status !== 'reserved') return false
    return true
  })

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-6 bg-brown-50">
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Tables & Takeaway */}
        <div className="w-2/3 p-6 overflow-y-auto border-r border-brown-200 flex flex-col gap-6">
          {/* Thanh tìm kiếm và Tabs lọc */}
          <div className="bg-white p-4 rounded-2xl border border-brown-100 shadow-sm space-y-4">
            <div className="relative">
              <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" />
              <input
                className="input pl-9 text-xs py-2 bg-brown-50 border-none rounded-lg"
                placeholder="Tìm nhanh bàn, mã đơn hoặc khách hàng..."
                value={leftSearchQuery}
                onChange={(e) => setLeftSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex justify-between items-center border-t border-brown-100 pt-3">
              <div className="flex gap-4 flex-wrap">
                <button
                  onClick={() => setLeftTab('all')}
                  className={`pb-1 text-xs font-bold border-b-2 transition-all ${leftTab === 'all' ? 'border-sky-600 text-sky-600' : 'border-transparent text-brown-500 hover:text-brown-900'}`}
                >
                  Tất cả ({takeawayOrders.length + tables.length})
                </button>
                <button
                  onClick={() => setLeftTab('takeaway')}
                  className={`pb-1 text-xs font-bold border-b-2 transition-all ${leftTab === 'takeaway' ? 'border-sky-600 text-sky-600' : 'border-transparent text-brown-500 hover:text-brown-900'}`}
                >
                  Đơn mang về ({takeawayOrders.length})
                </button>
                <button
                  onClick={() => setLeftTab('empty')}
                  className={`pb-1 text-xs font-bold border-b-2 transition-all ${leftTab === 'empty' ? 'border-sky-600 text-sky-600' : 'border-transparent text-brown-500 hover:text-brown-900'}`}
                >
                  Bàn trống ({tables.filter(t => t.status === 'empty').length})
                </button>
                <button
                  onClick={() => setLeftTab('occupied')}
                  className={`pb-1 text-xs font-bold border-b-2 transition-all ${leftTab === 'occupied' ? 'border-sky-600 text-sky-600' : 'border-transparent text-brown-500 hover:text-brown-900'}`}
                >
                  Bàn đang phục vụ ({tables.filter(t => t.status === 'occupied').length})
                </button>
                <button
                  onClick={() => setLeftTab('reserved')}
                  className={`pb-1 text-xs font-bold border-b-2 transition-all ${leftTab === 'reserved' ? 'border-sky-600 text-sky-600' : 'border-transparent text-brown-500 hover:text-brown-900'}`}
                >
                  Đã đặt ({tables.filter(t => t.status === 'reserved').length})
                </button>
              </div>
            </div>
          </div>

          {/* Unified Grid Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-serif font-bold text-brown-900 flex items-center gap-2">
                <span>☕</span> Trạng thái phục vụ
              </h2>
            </div>

            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {/* 1. Render các đơn mang về đang chờ (nếu tab là 'all' hoặc 'takeaway') */}
              {(leftTab === 'all' || leftTab === 'takeaway') && filteredTakeawayOrders.map(order => {
                const minutesElapsed = Math.round((new Date() - new Date(order.createdAt)) / 60000)
                const timeDisplay = minutesElapsed > 0 ? `${minutesElapsed}'` : '0\''
                const isSelected = currentOrder?._id === order._id

                return (
                  <div
                    key={order._id}
                    onClick={() => handleSelectTakeawayOrder(order)}
                    className={`rounded-2xl border-2 p-3.5 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between min-h-[145px] relative ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/20 ring-2 ring-sky-300 ring-opacity-30 shadow-sm'
                        : 'bg-white border-sky-100 hover:border-sky-300'
                    }`}
                  >
                    {/* Top info row */}
                    <div className="flex justify-between items-start w-full mb-1">
                      <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">
                        🥡
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-bold text-orange-500 block uppercase tracking-wide">Đang làm</span>
                        <span className="text-[10px] font-extrabold text-orange-600 block">{timeDisplay}</span>
                      </div>
                    </div>

                    {/* Middle info */}
                    <div className="text-center my-2">
                      <div className="text-xs font-extrabold text-brown-900 truncate">
                        {order.orderCode}
                      </div>
                      {order.note && (
                        <div className="text-[10px] text-brown-500 truncate max-w-full px-1">
                          {order.note}
                        </div>
                      )}
                    </div>

                    {/* Bottom price */}
                    <div className="text-center border-t border-brown-50 pt-2 mt-auto">
                      <span className="text-[9px] text-brown-400 block uppercase font-medium">Tổng cộng</span>
                      <span className="text-xs font-extrabold text-sky-700 block">
                        {formatVND(order.total)}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* 2. Render các bàn phục vụ (nếu tab là 'all' hoặc 'empty' hoặc 'occupied' hoặc 'reserved') */}
              {(leftTab === 'all' || leftTab === 'empty' || leftTab === 'occupied' || leftTab === 'reserved') && filteredTables.map(t => {
                const status = t.status
                const isActiveSelected = selectedTable?._id === t._id && selectedTable?._id !== 'takeaway'

                if (status === 'empty') {
                  return (
                    <div
                      key={t._id}
                      onClick={() => handleSelectTable(t)}
                      className={`rounded-2xl border-2 bg-white p-3 cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center min-h-[145px] text-center ${
                        isActiveSelected
                          ? 'border-sky-500 ring-2 ring-sky-300 ring-opacity-30'
                          : 'border-brown-100 hover:border-brown-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-brown-50 flex items-center justify-center text-brown-400 mb-2">
                        <i className="ti ti-plus text-sm" />
                      </div>
                      <div className="text-xs font-bold text-brown-850">Bàn {t.number}</div>
                      <div className="text-[10px] text-green-600 font-bold uppercase mt-1">Còn trống</div>
                    </div>
                  )
                } else if (status === 'reserved') {
                  let timeDisplay = ''
                  if (t.currentOrder && t.currentOrder.createdAt) {
                    const minutesElapsed = Math.round((new Date() - new Date(t.currentOrder.createdAt)) / 60000)
                    if (minutesElapsed < 60) {
                      timeDisplay = `${minutesElapsed}'`
                    } else {
                      const hours = Math.floor(minutesElapsed / 60)
                      const mins = minutesElapsed % 60
                      timeDisplay = `${hours}h ${mins}'`
                    }
                  }

                  return (
                    <div
                      key={t._id}
                      onClick={() => handleSelectTable(t)}
                      className={`rounded-2xl border-2 p-3 cursor-pointer transition-all hover:shadow-md flex flex-col min-h-[145px] justify-between relative ${
                        isActiveSelected
                          ? 'border-sky-500 bg-sky-50/20 ring-2 ring-sky-300 ring-opacity-30 shadow-sm'
                          : 'bg-amber-50/20 border-amber-200 hover:border-amber-400'
                      }`}
                    >
                      {/* Top info row */}
                      <div className="flex justify-between items-start w-full mb-1">
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {t.number}
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-bold text-amber-600 block uppercase tracking-wide">Đặt trước</span>
                          {timeDisplay && <span className="text-[10px] font-extrabold text-amber-600 block">{timeDisplay}</span>}
                        </div>
                      </div>

                      {/* Middle info */}
                      <div className="text-center my-2">
                        <div className="text-xs font-extrabold text-brown-900">Bàn {t.number}</div>
                      </div>

                      {/* Bottom price */}
                      <div className="text-center border-t border-brown-50 pt-2 mt-auto">
                        <span className="text-[9px] text-brown-400 block uppercase font-medium">Tổng cộng</span>
                        <span className="text-xs font-extrabold text-brown-900 block">
                          {t.currentOrder?.total ? formatVND(t.currentOrder.total) : '—'}
                        </span>
                      </div>
                    </div>
                  )
                } else {
                  let timeDisplay = ''
                  if (t.currentOrder && t.currentOrder.createdAt) {
                    const minutesElapsed = Math.round((new Date() - new Date(t.currentOrder.createdAt)) / 60000)
                    if (minutesElapsed < 60) {
                      timeDisplay = `${minutesElapsed}'`
                    } else {
                      const hours = Math.floor(minutesElapsed / 60)
                      const mins = minutesElapsed % 60
                      timeDisplay = `${hours}h ${mins}'`
                    }
                  }

                  return (
                    <div
                      key={t._id}
                      onClick={() => handleSelectTable(t)}
                      className={`rounded-2xl border-2 p-3 cursor-pointer transition-all hover:shadow-md flex flex-col min-h-[145px] justify-between relative ${
                        isActiveSelected
                          ? 'border-sky-500 bg-sky-50/20 ring-2 ring-sky-300 ring-opacity-30 shadow-sm'
                          : 'bg-white border-sky-200 hover:border-sky-400'
                      }`}
                    >
                      {/* Top info row */}
                      <div className="flex justify-between items-start w-full mb-1">
                        <div className="w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {t.number}
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-bold text-red-500 block uppercase tracking-wide">Đã ngồi</span>
                          <span className="text-[10px] font-extrabold text-red-600 block">{timeDisplay || '0\''}</span>
                        </div>
                      </div>

                      {/* Middle info */}
                      <div className="text-center my-2">
                        <div className="text-xs font-extrabold text-brown-900">Bàn {t.number}</div>
                      </div>

                      {/* Bottom price */}
                      <div className="text-center border-t border-brown-50 pt-2 mt-auto">
                        <span className="text-[9px] text-brown-400 block uppercase font-medium">Tổng cộng</span>
                        <span className="text-xs font-extrabold text-brown-900 block">
                          {t.currentOrder?.total ? formatVND(t.currentOrder.total) : '0đ'}
                        </span>
                      </div>
                    </div>
                  )
                }
              })}
            </div>

            {/* Empty State */}
            {((leftTab === 'takeaway' && filteredTakeawayOrders.length === 0) ||
              (leftTab === 'empty' && filteredTables.length === 0) ||
              (leftTab === 'occupied' && filteredTables.length === 0) ||
              (leftTab === 'all' && filteredTakeawayOrders.length === 0 && filteredTables.length === 0)) && (
              <div className="text-center text-brown-400 text-xs py-12 bg-white rounded-2xl border border-brown-100 shadow-sm">
                Không tìm thấy bàn hoặc đơn hàng nào phù hợp
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Order / Cart */}
        <div className="w-1/3 bg-white flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
          {(!currentOrder || isEditingOrder) ? (
            // NEW ORDER FORM & EDIT ORDER FORM
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-brown-100 bg-brown-50 flex justify-between items-center">
                <div>
                  <div className="font-serif text-lg font-bold text-brown-900">
                    {isEditingOrder 
                      ? `Sửa đơn ${currentOrder?.orderCode}` 
                      : (selectedTable?._id === 'takeaway' ? 'Đơn Mang Về' : selectedTable?._id === 'counter' ? 'Đơn Tại Quầy' : `Bàn ${selectedTable?.number || ''}`)}
                  </div>
                  <div className="text-xs text-brown-500">
                    {isEditingOrder ? 'Chỉnh sửa đơn hàng đang phục vụ' : 'Tạo đơn mới'}
                  </div>
                </div>
                <button className="text-brown-400 hover:text-brown-700" onClick={resetCartAndSetTakeaway}><i className="ti ti-x" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {!isEditingOrder && (
                  <div className="bg-brown-50 p-3.5 rounded-xl border border-brown-100 space-y-2">
                    <label className="text-xs font-bold text-brown-700 flex items-center gap-1.5 uppercase tracking-wide">
                      <span>🥡</span> LOẠI PHỤC VỤ / BÀN
                    </label>
                    <select
                      className="select select-sm w-full text-xs font-medium bg-white border border-brown-200 rounded-lg"
                      value={selectedTable?._id || 'takeaway'}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === 'takeaway') {
                          handleNewTakeawayOrder()
                        } else {
                          const tbl = tables.find(t => t._id === val)
                          if (tbl) handleSelectTable(tbl)
                        }
                      }}
                    >
                      <option value="takeaway">🥡 Mang về / Tại quầy</option>
                      {tables.length > 0 && (
                        <optgroup label="Chọn bàn trống">
                          {tables
                            .filter(t => t.status === 'empty')
                            .map(t => (
                              <option key={t._id} value={t._id}>☕ Bàn {t.number}</option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                )}
                {/* Search & Categories */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" />
                      <input className="input text-sm pl-9" placeholder="Tìm tên món..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCustomProductModal(true)}
                      className="btn bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 text-xs py-2 px-3 flex items-center gap-1 shrink-0 font-medium shadow-sm transition-all"
                    >
                      <i className="ti ti-plus text-xs" /> Thêm món
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {categories.map(c => (
                      <button key={c} onClick={() => setCategoryFilter(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${categoryFilter === c ? 'bg-brown-800 text-brown-100' : 'bg-brown-100 text-brown-700 hover:bg-brown-200'}`}>
                        {CAT_LABELS[c] || products.find(p => (p.category?.slug || p.category) === c)?.category?.name || c}
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
                
                <div className="mt-auto space-y-2 pt-2 border-t border-brown-100">


                  <div className="text-xs font-semibold text-brown-500 uppercase">Thông tin thêm</div>
                  <input className="input text-xs py-1.5" placeholder="Ghi chú đơn hàng..." value={note} onChange={e => setNote(e.target.value)} />
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-brown-600">Giảm giá:</span>
                      <div className="flex bg-brown-100 p-0.5 rounded-lg text-[10px]">
                        <button
                          type="button"
                          onClick={() => setDiscountType('percent')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-all ${discountType === 'percent' ? 'bg-white text-brown-950 shadow-sm' : 'text-brown-500'}`}
                        >
                          Phần trăm (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountType('amount')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-all ${discountType === 'amount' ? 'bg-white text-brown-950 shadow-sm' : 'text-brown-500'}`}
                        >
                          Số tiền (đ)
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        className="input text-xs py-1.5 flex-1"
                        type="number"
                        min="0"
                        max={discountType === 'percent' ? 100 : undefined}
                        placeholder={discountType === 'percent' ? 'Mức giảm % (0 - 100)' : 'Số tiền giảm...'}
                        value={discountValue || ''}
                        onChange={e => setDiscountValue(Math.max(0, Number(e.target.value)))}
                      />
                      <span className="text-xs font-bold text-brown-600 w-8 text-right">
                        {discountType === 'percent' ? '%' : 'đ'}
                      </span>
                    </div>
                    {discountType === 'percent' && (
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {[0, 5, 10, 15, 20, 50].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDiscountValue(val)}
                            className={`px-2 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap transition-colors ${discountValue === val ? 'bg-brown-800 text-white border-brown-800' : 'bg-white text-brown-700 border-brown-200 hover:bg-brown-50'}`}
                          >
                            {val}%
                          </button>
                        ))}
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="text-[10px] text-green-600 text-right font-medium">
                        Thực tế giảm: -{formatVND(discountAmount)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-brown-100 bg-white">
                <div className="flex justify-between items-center font-bold text-lg mb-3">
                  <span>Tổng tiền:</span>
                  <span className="text-brown-800">{formatVND(Math.max(0, total))}</span>
                </div>
                {isEditingOrder ? (
                  <div className="flex gap-2">
                    <button className="btn w-1/3 py-3 text-base justify-center" onClick={() => setIsEditingOrder(false)}>
                      Huỷ bỏ
                    </button>
                    <button className="btn btn-primary w-2/3 py-3 text-base justify-center" onClick={handleUpdateOrder} disabled={saving || items.length === 0}>
                      {saving ? 'Đang cập nhật...' : 'Cập nhật đơn'}
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-primary w-full py-3 text-base justify-center" onClick={handleCreateOrder} disabled={saving || items.length === 0}>
                    {saving ? 'Đang xử lý...' : 'Tạo đơn'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            // CURRENT ORDER VIEW
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-brown-100 bg-brown-800 text-brown-50 flex justify-between items-center">
                <div>
                  <div className="font-serif text-lg font-bold">
                    {selectedTable?._id === 'takeaway' ? 'Đơn Mang Về' : `Bàn ${selectedTable?.number || ''}`}
                  </div>
                  <div className="text-xs opacity-80">Đang phục vụ</div>
                </div>
                <button className="text-brown-200 hover:text-white" onClick={resetCartAndSetTakeaway}><i className="ti ti-x" /></button>
              </div>

              {!currentOrder ? (
                <div className="flex-1 flex justify-center items-center"><Spinner /></div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-brown-100">
                      <span className="text-xs text-brown-500">Mã đơn: <span className="font-mono font-bold text-brown-900">{currentOrder.orderCode}</span></span>
                      {currentOrder.status !== 'processing' && <Badge status={currentOrder.status} />}
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
                      <div className="flex justify-between text-green-600 items-center">
                        <span>Giảm giá</span>
                        <div className="flex items-center gap-1">
                          <span>- {formatVND(currentOrder.discount)}</span>
                          <button
                            onClick={handleOpenQuickDiscount}
                            className="p-1 text-brown-400 hover:text-brown-700 transition-colors"
                            title="Sửa giảm giá nhanh"
                          >
                            <i className="ti ti-edit text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-brown-100 bg-white">
                    <div className="flex justify-between items-end mb-4">
                      <span className="text-sm font-medium text-brown-600">Tổng thanh toán</span>
                      <span className="text-2xl font-bold font-serif text-brown-900">{formatVND(currentOrder.total)}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Nút in hóa đơn độc lập */}
                      <button
                        className="btn bg-amber-600 hover:bg-amber-700 text-white border-amber-600 py-3 text-base justify-center flex items-center gap-1.5 font-bold shadow-sm transition-all rounded-xl cursor-pointer"
                        onClick={() => {
                          if (currentOrder) {
                            handleDirectPrint(currentOrder);
                          }
                        }}
                        disabled={saving || !currentOrder}
                      >
                        <i className="ti ti-printer text-base" /> In hóa đơn
                      </button>

                      {/* Nút xác nhận thanh toán (Gộp tiền mặt & QR) */}
                      <button
                        className={`btn py-3 text-base justify-center flex items-center gap-1.5 font-bold shadow-sm transition-all rounded-xl cursor-pointer ${
                          currentOrder?.status === 'paid'
                            ? '!bg-blue-600 hover:!bg-blue-700 text-white !border-blue-600'
                            : '!bg-green-600 hover:!bg-green-700 text-white !border-green-600'
                        }`}
                        onClick={handleCheckoutDirect}
                        disabled={saving || !currentOrder}
                      >
                        <i className="ti ti-circle-check text-base" />
                        {currentOrder?.status === 'paid' ? 'Xác nhận thanh toán (Đã nhận QR)' : 'Xác nhận thanh toán'}
                      </button>
                    </div>

                    {currentOrder?.status !== 'paid' && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button className="btn btn-sm text-xs justify-center" onClick={handleStartEditOrder} disabled={saving}>
                          <i className="ti ti-edit" /> Sửa đơn
                        </button>
                        <button className="btn btn-sm btn-danger text-xs justify-center" onClick={handleCancelOrder} disabled={saving}>
                          <i className="ti ti-trash" /> Huỷ đơn
                        </button>
                        
                        {/* Chuyển bàn / Chuyển vào bàn */}
                        <button className="btn btn-sm text-xs justify-center bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200 font-semibold" onClick={() => setShowMoveTableModal(true)} disabled={saving}>
                          <i className="ti ti-arrows-exchange" /> {currentOrder?.type === 'takeaway' ? 'Chuyển vào bàn' : 'Chuyển bàn'}
                        </button>
                        
                        {/* Chuyển mang về hoặc Ghép bàn */}
                        {currentOrder?.type === 'dine-in' ? (
                          <div className="grid grid-cols-2 gap-1 col-span-1">
                            <button className="btn btn-sm text-[10px] px-1 justify-center bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 font-semibold" onClick={handleConvertToTakeaway} disabled={saving} title="Chuyển sang mang về">
                              <i className="ti ti-shopping-cart-x text-xs" /> Mang về
                            </button>
                            <button className="btn btn-sm text-[10px] px-1 justify-center bg-brown-600 text-white hover:bg-brown-700 border-brown-600 font-semibold" onClick={() => setShowMergeTableModal(true)} disabled={saving} title="Ghép bàn">
                              <i className="ti ti-git-merge text-xs" /> Ghép
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn-sm text-xs justify-center bg-brown-50 text-brown-400 border-brown-200 cursor-not-allowed" disabled>
                            <i className="ti ti-git-merge" /> Ghép bàn
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Chuyển bàn */}
      <Modal
        open={showMoveTableModal}
        onClose={() => setShowMoveTableModal(false)}
        title={selectedTable?._id === 'takeaway' ? 'Chuyển đơn mang về vào bàn phục vụ' : `Chuyển đơn từ Bàn ${selectedTable?.number} sang bàn khác`}
        footer={
          <button className="btn" onClick={() => setShowMoveTableModal(false)}>Đóng</button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-brown-600">Chọn bàn trống để chuyển đơn hàng sang:</p>
          <div className="grid grid-cols-3 gap-2">
            {tables
              .filter(t => t._id !== selectedTable?._id && t.number !== 0 && t.status !== 'occupied')
              .map(t => (
                <button
                  key={t._id}
                  onClick={() => handleMoveTable(t._id)}
                  disabled={saving}
                  className="p-3 text-center rounded-lg border-2 border-brown-200 hover:border-brown-500 bg-brown-50 hover:bg-brown-100 transition-all font-semibold text-brown-800 text-sm"
                >
                  Bàn {t.number}
                </button>
              ))}
          </div>
          {tables.filter(t => t._id !== selectedTable?._id && t.number !== 0 && t.status !== 'occupied').length === 0 && (
            <p className="text-sm text-red-500 italic text-center py-2">Không có bàn nào đang trống</p>
          )}
        </div>
      </Modal>

      {/* Modal Giảm giá nhanh */}
      <Modal
        open={showQuickDiscountModal}
        onClose={() => setShowQuickDiscountModal(false)}
        title={`Chỉnh sửa giảm giá cho đơn hàng ${currentOrder?.orderCode}`}
        footer={
          <div className="flex gap-2 justify-end w-full">
            <button className="btn" onClick={() => setShowQuickDiscountModal(false)} disabled={saving}>Hủy</button>
            <button className="btn btn-primary" onClick={handleUpdateQuickDiscount} disabled={saving}>Cập nhật</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-brown-50 p-3 rounded-lg border border-brown-100 text-sm">
            <span className="text-brown-600">Tổng tạm tính:</span>
            <span className="font-bold text-brown-900">{formatVND(currentOrder?.subtotal || 0)}</span>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-brown-600">Loại giảm giá:</span>
              <div className="flex bg-brown-100 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setQuickDiscountType('percent')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${quickDiscountType === 'percent' ? 'bg-white text-brown-950 shadow-sm' : 'text-brown-500'}`}
                >
                  Phần trăm (%)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDiscountType('amount')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${quickDiscountType === 'amount' ? 'bg-white text-brown-950 shadow-sm' : 'text-brown-500'}`}
                >
                  Số tiền (đ)
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                className="input py-2 flex-1"
                type="number"
                min="0"
                max={quickDiscountType === 'percent' ? 100 : undefined}
                placeholder={quickDiscountType === 'percent' ? 'Mức giảm % (0 - 100)' : 'Số tiền giảm...'}
                value={quickDiscountValue || ''}
                onChange={e => setQuickDiscountValue(Math.max(0, Number(e.target.value)))}
              />
              <span className="font-bold text-brown-600 w-8 text-right">
                {quickDiscountType === 'percent' ? '%' : 'đ'}
              </span>
            </div>
            
            {quickDiscountType === 'percent' && (
              <div className="flex gap-1 overflow-x-auto pb-1">
                {[0, 5, 10, 15, 20, 50].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQuickDiscountValue(val)}
                    className={`px-3 py-1 rounded border text-xs font-medium whitespace-nowrap transition-colors ${quickDiscountValue === val ? 'bg-brown-800 text-white border-brown-800' : 'bg-white text-brown-700 border-brown-200 hover:bg-brown-50'}`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            )}
            
            {quickDiscountValue > 0 && (
              <div className="text-sm text-green-600 text-right font-medium pt-1">
                Giảm thực tế: -{formatVND(quickDiscountType === 'percent' ? Math.round(((currentOrder?.subtotal || 0) * quickDiscountValue) / 100) : quickDiscountValue)}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal Ghép bàn */}
      <Modal
        open={showMergeTableModal}
        onClose={() => setShowMergeTableModal(false)}
        title={`Ghép bàn khác vào Bàn ${selectedTable?.number}`}
        footer={
          <button className="btn" onClick={() => setShowMergeTableModal(false)}>Đóng</button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-brown-600">Chọn bàn có khách khác để gộp tất cả món ăn vào <b>Bàn {selectedTable?.number}</b>:</p>
          <div className="grid grid-cols-3 gap-2">
            {tables
              .filter(t => t._id !== selectedTable?._id && t.number !== 0 && t.status === 'occupied')
              .map(t => (
                <button
                  key={t._id}
                  onClick={() => handleMergeTable(t._id)}
                  disabled={saving}
                  className="p-3 text-center rounded-lg border-2 border-red-200 hover:border-red-500 bg-red-50 hover:bg-red-100 transition-all font-semibold text-red-800 text-sm flex flex-col items-center justify-center gap-1"
                >
                  <span>Bàn {t.number}</span>
                  <span className="text-[10px] text-red-600 opacity-80">{t.currentOrder?.total ? formatVND(t.currentOrder.total) : 'Có đơn'}</span>
                </button>
              ))}
          </div>
          {tables.filter(t => t._id !== selectedTable?._id && t.number !== 0 && t.status === 'occupied').length === 0 && (
            <p className="text-sm text-red-500 italic text-center py-2">Không có bàn nào khác đang có khách</p>
          )}
        </div>
      </Modal>

      {/* Modal Thêm món ngoài thực đơn */}
      <Modal
        open={showCustomProductModal}
        onClose={() => setShowCustomProductModal(false)}
        title="Thêm tên món"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <button className="btn" onClick={() => setShowCustomProductModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={handleAddCustomProduct}>Thêm vào đơn</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Tên món/sản phẩm khác *</label>
            <input
              type="text"
              className="input text-sm"
              placeholder="Ví dụ: Thuốc lá Jet, Đồ khô mix..."
              value={customProductForm.name}
              onChange={e => setCustomProductForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Giá bán (VNĐ) *</label>
              <input
                type="number"
                min="0"
                className="input text-sm"
                placeholder="Ví dụ: 30000"
                value={customProductForm.price || ''}
                onChange={e => setCustomProductForm(f => ({ ...f, price: Math.max(0, Number(e.target.value)) }))}
              />
            </div>
            <div>
              <label className="label">Số lượng *</label>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setCustomProductForm(f => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                  className="w-8 h-8 rounded bg-brown-100 border border-brown-200 flex items-center justify-center font-bold text-brown-800"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  className="input text-sm text-center py-1 flex-1"
                  value={customProductForm.quantity}
                  onChange={e => setCustomProductForm(f => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))}
                />
                <button
                  type="button"
                  onClick={() => setCustomProductForm(f => ({ ...f, quantity: f.quantity + 1 }))}
                  className="w-8 h-8 rounded bg-brown-100 border border-brown-200 flex items-center justify-center font-bold text-brown-800"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* PRINT RECEIPT (Hidden on screen but preloaded by browser) */}
      <div id="print-receipt" className="absolute left-[-9999px] top-[-9999px] opacity-0 pointer-events-none">
        {receiptData && (
          <div className="w-[80mm] mx-auto text-black font-sans text-[12px] leading-tight p-4">
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold font-serif mb-1">Tí</h1>
              <p className="text-[10px]">Liên Minh, Đan Phượng Hà Nội</p>
              <p className="text-[10px]">ĐT: 0963664924</p>
              <h2 className="text-lg font-bold mt-3 uppercase border-b border-dashed border-black pb-2">Hóa Đơn Thanh Toán</h2>
            </div>
            
            <div className="mb-3">
              <p>Ngày: {formatDateTime(receiptData.paidAt || new Date())}</p>
              <p>Mã đơn: <b>{receiptData.orderCode}</b></p>
              <p>Bàn: <b>{(receiptData.tableNumber === 0 || receiptData.type === 'takeaway' || !receiptData.tableNumber) ? 'Mang về' : receiptData.tableNumber}</b></p>
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

            {/* QR Code thanh toán trực tiếp tự động tích hợp trên hóa đơn */}
            <div className="flex flex-col items-center justify-center my-4 border-t border-b border-dashed border-black py-3 text-center">
              <p className="text-[9px] mb-1.5 font-bold uppercase tracking-wider">Quét mã QR để chuyển khoản</p>
              <img
                src={`https://img.vietqr.io/image/MB-0963664924-qr_only.png?amount=${receiptData.total}&addInfo=Thanh%20toan%20don%20hang%20${receiptData.orderCode.replace('#', '')}&accountName=TRAN%20VAN%20ANH`}
                alt="VietQR Code"
                className="w-32 h-32 object-contain mx-auto"
              />
              <p className="text-[8px] mt-1 font-semibold">MB Bank - 0963664924 - Trần Văn Anh</p>
            </div>

            <div className="text-center text-[10px] italic mt-4">
              <p>Cảm ơn quý khách và hẹn gặp lại!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
