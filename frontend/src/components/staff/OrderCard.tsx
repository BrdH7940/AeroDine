import { useState } from 'react'

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
}

export default function OrderCard({
    order,
    type,
    onAccept,
    onReject,
    onServe,
    onCashPayment,
}: OrderCardProps) {
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

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
            case 'PENDING_REVIEW':
                return 'bg-orange-100 text-orange-800' // Highlight PENDING_REVIEW orders
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
        if (!window.confirm(`Confirm cash payment of $${order.totalAmount.toFixed(2)} for ${order.tableName}?`)) {
            return
        }
        setIsProcessing(true)
        try {
            await onCashPayment?.()
        } finally {
            setIsProcessing(false)
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
                    type === 'pending' 
                        ? order.status === 'PENDING_REVIEW'
                            ? 'border-l-4 border-orange-500' // Orange border for PENDING_REVIEW
                            : 'border-l-4 border-yellow-500' // Yellow border for PENDING
                        : ''
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
                                    ${item.pricePerUnit.toFixed(2)}
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
                            ${order.totalAmount.toFixed(2)}
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
                            onClick={handleCashPayment}
                            disabled={isProcessing}
                            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            💵 {isProcessing ? 'Processing...' : 'Cash Payment'}
                        </button>
                    )}
                </div>
            </div>

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
