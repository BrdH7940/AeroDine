import { useState, useEffect, useCallback } from 'react'
import { useWaiterEvents, useBillRequested } from '../../../hooks/useSocket'
import { orderService } from '../../../services/order.service'
import OrderCard from '../../../components/staff/OrderCard'
import type {
    OrderCreatedEvent,
    OrderItemStatusChangedEvent,
} from '@aerodine/shared-types'

/**
 * Waiter Orders Dashboard
 * Shows pending orders that need to be accepted/rejected
 * and ready items that need to be served
 *
 * @author Dev 2 - Operations Team
 */

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

interface OrderItem {
    id: number
    name: string
    quantity: number
    status: string
    pricePerUnit: number
    note?: string
    modifiers: { name: string; priceAdjustment: number }[]
}

export default function WaiterOrdersPage() {
    // TODO: Get from auth context
    const restaurantId = 4 // AeroDine Signature restaurant
    const userId = 12 // Waiter User ID (waiter@aerodine.com)

    const [pendingOrders, setPendingOrders] = useState<Order[]>([])
    const [activeOrders, setActiveOrders] = useState<Order[]>([])
    const [readyItems, setReadyItems] = useState<
        {
            orderId: number
            itemId: number
            itemName: string
            tableName: string
        }[]
    >([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'ready'>(
        'pending'
    )

    // Sound notification
    const playNotificationSound = useCallback(() => {
        const audio = new Audio('/sounds/notification.mp3')
        audio.play().catch(() => {
            // Ignore autoplay errors
        })
    }, [])

    // Fetch initial data
    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true)
            // Use getPendingOrders() which includes both PENDING_REVIEW and PENDING orders
            const [pendingOrdersData, activeRes] = await Promise.all([
                orderService.getPendingOrders(restaurantId),
                orderService.getOrders({
                    restaurantId,
                    status: 'IN_PROGRESS' as any,
                }),
            ])

            // Map pending orders (includes PENDING_REVIEW and PENDING)
            setPendingOrders(
                pendingOrdersData.map((o: any) => ({
                    id: o.id,
                    tableId: o.tableId,
                    tableName: o.table?.name || `Table ${o.tableId}`,
                    status: o.status,
                    totalAmount: Number(o.totalAmount),
                    guestCount: o.guestCount,
                    note: o.note,
                    createdAt: o.createdAt,
                    items: o.items.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        status: item.status,
                        pricePerUnit: Number(item.pricePerUnit),
                        note: item.note,
                        modifiers: item.modifiers || [],
                    })),
                }))
            )

            setActiveOrders(
                activeRes.orders.map((o: any) => ({
                    id: o.id,
                    tableId: o.tableId,
                    tableName: o.table?.name || `Table ${o.tableId}`,
                    status: o.status,
                    totalAmount: Number(o.totalAmount),
                    guestCount: o.guestCount,
                    note: o.note,
                    createdAt: o.createdAt,
                    items: o.items.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        status: item.status,
                        pricePerUnit: Number(item.pricePerUnit),
                        note: item.note,
                        modifiers: item.modifiers || [],
                    })),
                }))
            )

            // Find ready items from active orders
            const ready: typeof readyItems = []
            activeRes.orders.forEach((order: any) => {
                order.items.forEach((item: any) => {
                    if (item.status === 'READY') {
                        ready.push({
                            orderId: order.id,
                            itemId: item.id,
                            itemName: item.name,
                            tableName:
                                order.table?.name || `Table ${order.tableId}`,
                        })
                    }
                })
            })
            setReadyItems(ready)
        } catch {
            setError('Failed to load orders')
        } finally {
            setLoading(false)
        }
    }, [restaurantId])

    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    // Handle new order created
    const handleOrderCreated = useCallback(
        (event: OrderCreatedEvent) => {
            setPendingOrders((prev) => [
                {
                    id: event.order.id,
                    tableId: event.tableId,
                    tableName: event.order.tableName,
                    status: event.order.status,
                    totalAmount: event.order.totalAmount,
                    guestCount: event.order.guestCount,
                    note: event.order.note,
                    createdAt: event.order.createdAt,
                    items: event.order.items.map((item) => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        status: item.status,
                        pricePerUnit: item.pricePerUnit,
                        note: item.note,
                        modifiers: item.modifiers,
                    })),
                },
                ...prev,
            ])
            playNotificationSound()
        },
        [playNotificationSound]
    )

    // Handle item ready
    const handleItemReady = useCallback(
        (event: OrderItemStatusChangedEvent) => {
            if (event.newStatus === 'READY') {
                // Find the table name from active or pending orders
                setActiveOrders((currentActiveOrders) => {
                    setPendingOrders((currentPendingOrders) => {
                        const activeOrder = currentActiveOrders.find(o => o.id === event.orderId)
                        const pendingOrder = currentPendingOrders.find(o => o.id === event.orderId)
                        const tableName = activeOrder?.tableName || pendingOrder?.tableName || `Order #${event.orderId}`
                        
                        setReadyItems((prev) => {
                            // Avoid duplicates
                            if (prev.some(item => item.orderId === event.orderId && item.itemId === event.orderItemId)) {
                                return prev
                            }
                            return [
                                ...prev,
                                {
                                    orderId: event.orderId,
                                    itemId: event.orderItemId,
                                    itemName: event.itemName,
                                    tableName,
                                },
                            ]
                        })
                        
                        return currentPendingOrders // No change
                    })
                    return currentActiveOrders // No change
                })
                playNotificationSound()
            }
        },
        [playNotificationSound]
    )

    // Handle item status changed (real-time sync with KDS)
    const handleItemStatusChanged = useCallback(
        (event: OrderItemStatusChangedEvent) => {
            console.log('🔔 Item status changed:', event)
            // Update item status in active orders
            setActiveOrders((prev) =>
                prev.map((order) => {
                    if (order.id !== event.orderId) return order
                    return {
                        ...order,
                        items: order.items.map((item) => {
                            if (item.id !== event.orderItemId) return item
                            return { ...item, status: event.newStatus }
                        }),
                    }
                })
            )
        },
        []
    )

    // Handle bill requested
    const handleBillRequested = useCallback(
        (event: { orderId: number; tableId: number; tableName: string }) => {
            // Show notification or modal
            alert(`Bill requested for ${event.tableName}`)
            playNotificationSound()
        },
        [playNotificationSound]
    )

    // Setup socket event listeners
    useWaiterEvents(restaurantId, userId, {
        onOrderCreated: handleOrderCreated,
        onItemStatusChanged: handleItemStatusChanged,
        onOrderItemReady: handleItemReady,
    })

    useBillRequested(handleBillRequested)

    // Accept order
    const handleAcceptOrder = async (orderId: number) => {
        try {
            console.log('🔄 Accepting order:', orderId)
            const result = await orderService.acceptOrder(orderId, userId)
            console.log('📦 Accept order result:', result)
            
            // Check if needs confirmation (table has existing active order)
            if (result.needsConfirmation) {
                console.log('⚠️ Table has existing order, showing confirmation dialog')
                const confirmed = window.confirm(
                    `Bàn ${result.existingOrder.tableName} đã có đơn hàng #${result.existingOrder.id} đang hoạt động.\n` +
                    `Đơn hiện tại: ${result.existingOrder.itemCount} món - ${Number(result.existingOrder.totalAmount).toLocaleString()}đ\n` +
                    `Đơn mới: ${result.newOrder.itemCount} món\n\n` +
                    `Bạn có muốn gộp đơn mới vào đơn cũ không?\n` +
                    `(Các món mới sẽ được thêm vào đơn hàng hiện tại)`
                )
                
                if (confirmed) {
                    console.log('✅ User confirmed merge, calling API again...')
                    // Merge orders
                    const mergeResult = await orderService.acceptOrder(
                        orderId, 
                        userId, 
                        result.existingOrder.id
                    )
                    console.log('🔗 Merge result:', mergeResult)
                    
                    if (mergeResult.merged) {
                        // Remove from pending
                        setPendingOrders((prev) => prev.filter((o) => o.id !== orderId))
                        
                        // Update existing order in active orders
                        setActiveOrders((prev) => 
                            prev.map((o) => 
                                o.id === result.existingOrder.id 
                                    ? {
                                        ...o,
                                        totalAmount: Number(mergeResult.targetOrder.totalAmount),
                                        items: mergeResult.targetOrder.items.map((item: any) => ({
                                            id: item.id,
                                            name: item.name,
                                            quantity: item.quantity,
                                            status: item.status,
                                            pricePerUnit: Number(item.pricePerUnit),
                                            note: item.note,
                                            modifiers: item.modifiers || [],
                                        })),
                                    }
                                    : o
                            )
                        )
                        
                        alert('Đã gộp đơn hàng thành công!')
                    }
                } else {
                    console.log('❌ User declined merge')
                    // User declined merge, reject the order
                    await handleRejectOrder(orderId, 'Khách không muốn đặt thêm')
                }
                return
            }
            
            // Normal flow: no existing order on table
            console.log('✅ No existing order on table, proceeding normally')
            const order = pendingOrders.find((o) => o.id === orderId)
            if (order) {
                setPendingOrders((prev) => prev.filter((o) => o.id !== orderId))
                setActiveOrders((prev) => [
                    { ...order, status: 'IN_PROGRESS' },
                    ...prev,
                ])
            }
        } catch (error: any) {
            console.error('❌ Accept order error:', error)
            alert(error?.response?.data?.message || 'Failed to accept order')
        }
    }

    // Reject order
    const handleRejectOrder = async (orderId: number, reason?: string) => {
        try {
            await orderService.rejectOrder(orderId, userId, reason)
            setPendingOrders((prev) => prev.filter((o) => o.id !== orderId))
        } catch {
            alert('Failed to reject order')
        }
    }

    // Mark order as served
    const handleMarkServed = async (orderId: number) => {
        try {
            await orderService.markOrderServed(orderId)
            // Remove ready items for this order
            setReadyItems((prev) =>
                prev.filter((item) => item.orderId !== orderId)
            )
            // Update order status
            setActiveOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId
                        ? {
                              ...o,
                              items: o.items.map((item) =>
                                  item.status === 'READY'
                                      ? { ...item, status: 'SERVED' }
                                      : item
                              ),
                          }
                        : o
                )
            )
        } catch {
            alert('Failed to mark as served')
        }
    }

    // Handle cash payment
    const handleCashPayment = async (orderId: number) => {
        try {
            await orderService.processCashPayment(orderId)
            // Remove order from active orders
            setActiveOrders((prev) => prev.filter((o) => o.id !== orderId))
            // Remove any ready items for this order
            setReadyItems((prev) =>
                prev.filter((item) => item.orderId !== orderId)
            )
            alert('Payment successful! Order completed.')
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to process payment')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading orders...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-500">{error}</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Waiter Dashboard
                        </h1>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">
                                {new Date().toLocaleDateString()}
                            </span>
                            <button
                                onClick={fetchOrders}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex space-x-4 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`pb-4 px-4 font-medium ${
                            activeTab === 'pending'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Pending Orders
                        {pendingOrders.length > 0 && (
                            <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                                {pendingOrders.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`pb-4 px-4 font-medium ${
                            activeTab === 'active'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Active Orders
                        {activeOrders.length > 0 && (
                            <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                                {activeOrders.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('ready')}
                        className={`pb-4 px-4 font-medium ${
                            activeTab === 'ready'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Ready to Serve
                        {readyItems.length > 0 && (
                            <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                                {readyItems.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 py-4">
                {/* Pending Orders Tab */}
                {activeTab === 'pending' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingOrders.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                No pending orders
                            </div>
                        ) : (
                            pendingOrders.map((order) => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    type="pending"
                                    onAccept={() => handleAcceptOrder(order.id)}
                                    onReject={(reason) =>
                                        handleRejectOrder(order.id, reason)
                                    }
                                />
                            ))
                        )}
                    </div>
                )}

                {/* Active Orders Tab */}
                {activeTab === 'active' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeOrders.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                No active orders
                            </div>
                        ) : (
                            activeOrders.map((order) => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    type="active"
                                    onServe={() => handleMarkServed(order.id)}
                                    onCashPayment={() => handleCashPayment(order.id)}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* Ready to Serve Tab */}
                {activeTab === 'ready' && (
                    <div className="space-y-4">
                        {readyItems.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No items ready to serve
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Table
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Item
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Order #
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {readyItems.map((item, index) => (
                                            <tr
                                                key={`${item.orderId}-${item.itemId}`}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-medium text-gray-900">
                                                        {item.tableName ||
                                                            'Unknown'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                    {item.itemName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                    #{item.orderId}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={() =>
                                                            handleMarkServed(
                                                                item.orderId
                                                            )
                                                        }
                                                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                                                    >
                                                        Mark Served
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
