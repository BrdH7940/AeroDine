import { useState, useRef } from 'react'
import { formatVND } from '../../utils/currency'

/**
 * Order Card Component for Waiter Dashboard
 *
 * @author Dev 2 - Operations Team
 */

interface OrderItem {
    id: number
    name: string
    quantity: number
    status: string
    pricePerUnit: number
    note?: string
    modifiers: { name: string; priceAdjustment: number }[]
}

interface Order {
    id: number
    tableId: number
    tableName: string
    status: string
    totalAmount: number
    guestCount: number
    note?: string
    createdAt: string
    items: OrderItem[]
}

interface OrderCardProps {
    order: Order
    type: 'pending' | 'active'
    onAccept?: () => void
    onReject?: (reason?: string) => void
    onServe?: () => void
    onCashPayment?: () => void
    restaurantName?: string
}

export default function OrderCard({
    order,
    type,
    onAccept,
    onReject,
    onServe,
    onCashPayment,
    restaurantName = 'Smart Restaurant',
}: OrderCardProps) {
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const billRef = useRef<HTMLDivElement>(null)

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const getElapsedTime = (dateString: string) => {
        const created = new Date(dateString).getTime()
        const now = Date.now()
        const diffMinutes = Math.floor((now - created) / 60000)
        if (diffMinutes < 1) return 'Just now'
        if (diffMinutes < 60) return `${diffMinutes}m ago`
        const hours = Math.floor(diffMinutes / 60)
        return `${hours}h ${diffMinutes % 60}m ago`
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800'
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-800'
            case 'QUEUED':
                return 'bg-gray-100 text-gray-800'
            case 'PREPARING':
                return 'bg-orange-100 text-orange-800'
            case 'READY':
                return 'bg-green-100 text-green-800'
            case 'SERVED':
                return 'bg-purple-100 text-purple-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const handleAccept = async () => {
        setIsProcessing(true)
        try {
            await onAccept?.()
        } finally {
            setIsProcessing(false)
        }
    }

    const handleReject = async () => {
        setIsProcessing(true)
        try {
            await onReject?.(rejectReason || undefined)
            setShowRejectModal(false)
            setRejectReason('')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleServe = async () => {
        setIsProcessing(true)
        try {
            await onServe?.()
        } finally {
            setIsProcessing(false)
        }
    }

    const handleCashPayment = async () => {
        if (!window.confirm(`Xác nhận thanh toán tiền mặt ${formatVND(order.totalAmount)} cho ${order.tableName}?`)) {
            return
        }
        setIsProcessing(true)
        try {
            await onCashPayment?.()
            setShowPaymentModal(false)
        } finally {
            setIsProcessing(false)
        }
    }

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const getCurrentTime = () => {
        return new Date().toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    // Calculate subtotal (before VAT)
    const subtotal = order.totalAmount
    const vatRate = 0.1 // 10% VAT
    const vatAmount = subtotal * vatRate
    const grandTotal = subtotal + vatAmount

    // Download bill as PDF
    const handleDownloadBill = async () => {
        try {
            const { default: jsPDF } = await import('jspdf')
            
            // Create PDF document
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a5', // Smaller format for receipt
            })
            
            const pageWidth = doc.internal.pageSize.getWidth()
            let y = 15
            
            // Restaurant name
            doc.setFontSize(18)
            doc.setFont('helvetica', 'bold')
            doc.text(restaurantName, pageWidth / 2, y, { align: 'center' })
            y += 8
            
            // Table name
            doc.setFontSize(14)
            doc.setTextColor(59, 130, 246) // Blue color
            doc.text(order.tableName, pageWidth / 2, y, { align: 'center' })
            y += 10
            
            // Line separator
            doc.setDrawColor(200, 200, 200)
            doc.line(10, y, pageWidth - 10, y)
            y += 8
            
            // Bill title
            doc.setTextColor(0, 0, 0)
            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.text('HOA DON THANH TOAN', pageWidth / 2, y, { align: 'center' })
            y += 5
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text('BILL', pageWidth / 2, y, { align: 'center' })
            y += 10
            
            // Order info
            doc.setFontSize(10)
            doc.text(`Ma don hang: #${order.id}`, 15, y)
            doc.text(`So khach: ${order.guestCount}`, pageWidth / 2 + 10, y)
            y += 6
            doc.text(`Gio dat: ${formatDateTime(order.createdAt)}`, 15, y)
            y += 6
            doc.text(`Gio thanh toan: ${getCurrentTime()}`, 15, y)
            y += 10
            
            // Table header
            doc.setFillColor(245, 245, 245)
            doc.rect(10, y - 4, pageWidth - 20, 8, 'F')
            doc.setFont('helvetica', 'bold')
            doc.text('Ten mon', 15, y)
            doc.text('Don gia', pageWidth / 2 - 5, y, { align: 'center' })
            doc.text('SL', pageWidth / 2 + 20, y, { align: 'center' })
            doc.text('Thanh tien', pageWidth - 15, y, { align: 'right' })
            y += 8
            
            // Table rows
            doc.setFont('helvetica', 'normal')
            order.items.forEach((item) => {
                const itemName = item.name.length > 18 ? item.name.substring(0, 18) + '...' : item.name
                doc.text(itemName, 15, y)
                doc.text(formatVND(item.pricePerUnit), pageWidth / 2 - 5, y, { align: 'center' })
                doc.text(String(item.quantity), pageWidth / 2 + 20, y, { align: 'center' })
                doc.text(formatVND(item.pricePerUnit * item.quantity), pageWidth - 15, y, { align: 'right' })
                y += 6
            })
            
            y += 5
            doc.line(10, y, pageWidth - 10, y)
            y += 8
            
            // Totals
            doc.text('Tong tien hang:', 15, y)
            doc.text(formatVND(subtotal), pageWidth - 15, y, { align: 'right' })
            y += 6
            
            doc.text(`VAT (${vatRate * 100}%):`, 15, y)
            doc.text(formatVND(vatAmount), pageWidth - 15, y, { align: 'right' })
            y += 8
            
            // Grand total
            doc.line(10, y - 2, pageWidth - 10, y - 2)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(12)
            doc.text('TONG CONG:', 15, y + 4)
            doc.setTextColor(59, 130, 246)
            doc.text(formatVND(grandTotal), pageWidth - 15, y + 4, { align: 'right' })
            y += 15
            
            // Thank you message
            doc.setTextColor(100, 100, 100)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'italic')
            doc.text('Cam on quy khach!', pageWidth / 2, y, { align: 'center' })
            
            // Save PDF
            doc.save(`bill-${order.tableName}-${order.id}-${Date.now()}.pdf`)
        } catch (error) {
            console.error('Failed to download bill as PDF:', error)
            alert('Không thể tải hóa đơn. Vui lòng thử lại.')
        }
    }

    const readyItemsCount = order.items.filter(
        (item) => item.status === 'READY',
    ).length
    const hasReadyItems = readyItemsCount > 0

    return (
        <>
            <div
                className={`bg-white rounded-lg shadow-md overflow-hidden ${
                    type === 'pending' ? 'border-l-4 border-yellow-500' : ''
                } ${hasReadyItems ? 'ring-2 ring-green-500' : ''}`}
            >
                {/* Header */}
                <div className="px-4 py-3 bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                {order.tableName}
                            </h3>
                            <p className="text-sm text-gray-500">
                                Order #{order.id}
                            </p>
                        </div>
                        <div className="text-right">
                            <span
                                className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                    order.status,
                                )}`}
                            >
                                {order.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                                {getElapsedTime(order.createdAt)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Order Info */}
                <div className="px-4 py-2 bg-blue-50 border-b text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">
                            👥 {order.guestCount} guests
                        </span>
                        <span className="text-gray-600">
                            🕐 {formatTime(order.createdAt)}
                        </span>
                    </div>
                </div>

                {/* Items */}
                <div className="px-4 py-3 max-h-60 overflow-y-auto">
                    <ul className="space-y-2">
                        {order.items.map((item) => (
                            <li
                                key={item.id}
                                className={`flex items-start justify-between py-2 ${
                                    item.status === 'READY'
                                        ? 'bg-green-50 -mx-2 px-2 rounded'
                                        : ''
                                }`}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center">
                                        <span className="font-medium text-gray-900">
                                            {item.quantity}x {item.name}
                                        </span>
                                        <span
                                            className={`ml-2 px-1.5 py-0.5 text-xs rounded ${getStatusColor(
                                                item.status,
                                            )}`}
                                        >
                                            {item.status}
                                        </span>
                                    </div>
                                    {item.modifiers.length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {item.modifiers
                                                .map((m) => m.name)
                                                .join(', ')}
                                        </div>
                                    )}
                                    {item.note && (
                                        <div className="text-xs text-orange-600 mt-1">
                                            📝 {item.note}
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm text-gray-600 ml-2">
                                    {formatVND(item.pricePerUnit)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Note */}
                {order.note && (
                    <div className="px-4 py-2 bg-yellow-50 border-t text-sm">
                        <span className="text-yellow-800">📝 {order.note}</span>
                    </div>
                )}

                {/* Footer */}
                <div className="px-4 py-3 bg-gray-50 border-t">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-600">Total</span>
                        <span className="text-xl font-bold text-gray-900">
                            {formatVND(order.totalAmount)}
                        </span>
                    </div>

                    {/* Actions */}
                    {type === 'pending' && (
                        <div className="flex space-x-2">
                            <button
                                onClick={handleAccept}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Processing...' : 'Accept'}
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Reject
                            </button>
                        </div>
                    )}

                    {type === 'active' && hasReadyItems && (
                        <button
                            onClick={handleServe}
                            disabled={isProcessing}
                            className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                        >
                            {isProcessing
                                ? 'Processing...'
                                : `Serve ${readyItemsCount} Ready Item${
                                      readyItemsCount > 1 ? 's' : ''
                                  }`}
                        </button>
                    )}

                    {type === 'active' && onCashPayment && (
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            disabled={isProcessing}
                            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            💳 Pay
                        </button>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed top-0 right-0 h-full z-50 flex shadow-2xl">
                    <div className="bg-white h-full w-[900px] max-w-[90vw] overflow-hidden flex">
                        {/* Left Side - Bill */}
                        <div className="flex-1 bg-gray-50 p-6 overflow-y-auto border-r">
                            {/* Action buttons */}
                            <div className="flex justify-end gap-2 mb-4">
                                <button
                                    onClick={() => alert('Đang phát triển tính năng in...')}
                                    className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    title="In hóa đơn"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleDownloadBill}
                                    className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    title="Tải hóa đơn"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            </div>
                            <div ref={billRef} className="bg-white rounded-lg shadow-md p-6">
                                {/* Restaurant Header */}
                                <div className="text-center border-b pb-4 mb-4">
                                    <h2 className="text-2xl font-bold text-gray-800">{restaurantName}</h2>
                                    <p className="text-lg text-blue-600 font-semibold mt-2">{order.tableName}</p>
                                </div>

                                {/* Bill Title */}
                                <div className="text-center mb-4">
                                    <h3 className="text-xl font-bold text-gray-700">HÓA ĐƠN THANH TOÁN</h3>
                                    <p className="text-sm text-gray-500">BILL</p>
                                </div>

                                {/* Order Info */}
                                <div className="grid grid-cols-2 gap-2 text-sm mb-4 bg-gray-50 p-3 rounded-lg">
                                    <div>
                                        <span className="text-gray-500">Mã đơn hàng:</span>
                                        <span className="ml-2 font-medium">#{order.id}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Số khách:</span>
                                        <span className="ml-2 font-medium">{order.guestCount}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Giờ đặt:</span>
                                        <span className="ml-2 font-medium">{formatDateTime(order.createdAt)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Giờ thanh toán:</span>
                                        <span className="ml-2 font-medium">{getCurrentTime()}</span>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="border rounded-lg overflow-hidden mb-4">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="text-left py-2 px-3 font-medium text-gray-700">Tên món</th>
                                                <th className="text-right py-2 px-3 font-medium text-gray-700">Đơn giá</th>
                                                <th className="text-center py-2 px-3 font-medium text-gray-700">SL</th>
                                                <th className="text-right py-2 px-3 font-medium text-gray-700">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {order.items.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="py-2 px-3 text-gray-800">{item.name}</td>
                                                    <td className="py-2 px-3 text-right text-gray-600">{formatVND(item.pricePerUnit)}</td>
                                                    <td className="py-2 px-3 text-center text-gray-600">{item.quantity}</td>
                                                    <td className="py-2 px-3 text-right font-medium text-gray-800">{formatVND(item.pricePerUnit * item.quantity)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals */}
                                <div className="space-y-2 border-t pt-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Tổng tiền hàng:</span>
                                        <span className="font-medium">{formatVND(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">VAT ({vatRate * 100}%):</span>
                                        <span className="font-medium">{formatVND(vatAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                                        <span className="text-gray-800">TỔNG CỘNG:</span>
                                        <span className="text-blue-600">{formatVND(grandTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Payment Methods */}
                        <div className="w-80 p-6 flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-800">Phương thức thanh toán</h3>
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="flex-1 space-y-4">
                                {/* Cash Payment */}
                                <button
                                    onClick={handleCashPayment}
                                    disabled={isProcessing}
                                    className="w-full py-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg transition-colors"
                                >
                                    💵 {isProcessing ? 'Đang xử lý...' : 'Cash Payment'}
                                </button>

                                {/* Other Payment Methods - Coming Soon */}
                                <div className="border-t pt-4 mt-4">
                                    <p className="text-sm text-gray-500 mb-3">Phương thức khác:</p>
                                    <button
                                        disabled
                                        className="w-full py-3 bg-gray-100 text-gray-400 font-medium rounded-lg cursor-not-allowed flex items-center justify-center gap-2 mb-2"
                                    >
                                        💳 Card Payment (Coming soon)
                                    </button>
                                    <button
                                        disabled
                                        className="w-full py-3 bg-gray-100 text-gray-400 font-medium rounded-lg cursor-not-allowed flex items-center justify-center gap-2 mb-2"
                                    >
                                        📱 Momo (Coming soon)
                                    </button>
                                    <button
                                        disabled
                                        className="w-full py-3 bg-gray-100 text-gray-400 font-medium rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        🏦 Bank Transfer (Coming soon)
                                    </button>
                                </div>
                            </div>

                            {/* Cancel Button */}
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 mt-4 transition-colors"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Reject Order #{order.id}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to reject this order? Please
                            provide a reason (optional).
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                            rows={3}
                        />
                        <div className="flex space-x-2">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false)
                                    setRejectReason('')
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
