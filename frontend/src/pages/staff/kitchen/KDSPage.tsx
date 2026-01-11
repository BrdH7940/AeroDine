import { useState, useEffect, useCallback, useRef } from 'react'
import { useKitchenEvents } from '../../../hooks/useSocket'
import { orderService } from '../../../services/order.service'
import KitchenOrderCard from '../../../components/staff/KitchenOrderCard'
import {
    KitchenOrderEvent,
    OrderItemStatusChangedEvent,
    KitchenOrderView,
} from '@aerodine/shared-types'

/**
 * Kitchen Display System (KDS)
 * Real-time display of orders for kitchen staff
 * Features: Grid view, order cards, timer alerts, sound notifications
 *
 * @author Dev 2 - Operations Team
 */

export default function KDSPage() {
    // TODO: Get from auth context
    const restaurantId = 1
    const userId = 1 // Kitchen staff ID

    const [orders, setOrders] = useState<KitchenOrderView[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Timer to update elapsed times
    const [, setTick] = useState(0)
    useEffect(() => {
        const interval = setInterval(() => {
            setTick((t) => t + 1)
            // Update elapsed time for each order
            setOrders((prevOrders) =>
                prevOrders.map((order) => ({
                    ...order,
                    elapsedMinutes: Math.floor(
                        (Date.now() - new Date(order.createdAt).getTime()) /
                            60000,
                    ),
                    isOverdue:
                        Math.floor(
                            (Date.now() - new Date(order.createdAt).getTime()) /
                                60000,
                        ) > 30,
                })),
            )
        }, 30000) // Update every 30 seconds

        return () => clearInterval(interval)
    }, [])

    // Sound notification
    const playNotificationSound = useCallback(() => {
        if (!soundEnabled) return
        if (!audioRef.current) {
            audioRef.current = new Audio('/sounds/kitchen-bell.mp3')
        }
        audioRef.current.play().catch(() => {
            // Ignore autoplay errors
        })
    }, [soundEnabled])

    // Fetch initial orders
    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true)
            const data = await orderService.getKitchenOrders(restaurantId)
            setOrders(data)
        } catch (err) {
            setError('Failed to load orders')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [restaurantId])

    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    // Handle new order received
    const handleOrderReceived = useCallback(
        (event: KitchenOrderEvent) => {
            setOrders((prev) => {
                // Check if order already exists
                if (prev.some((o) => o.id === event.order.id)) {
                    return prev
                }
                return [event.order, ...prev]
            })
            playNotificationSound()
        },
        [playNotificationSound],
    )

    // Handle order accepted (sent to kitchen)
    const handleOrderAccepted = useCallback(
        (event: { orderId: number; waiterId: number }) => {
            // Refresh to get the order
            fetchOrders()
            playNotificationSound()
        },
        [fetchOrders, playNotificationSound],
    )

    // Handle item status changed
    const handleItemStatusChanged = useCallback(
        (event: OrderItemStatusChangedEvent) => {
            setOrders((prev) =>
                prev.map((order) => {
                    if (order.id !== event.orderId) return order

                    return {
                        ...order,
                        items: order.items.map((item) => {
                            if (item.id !== event.orderItemId) return item
                            return {
                                ...item,
                                status: event.newStatus as any,
                                startedAt:
                                    event.newStatus === 'PREPARING'
                                        ? new Date().toISOString()
                                        : item.startedAt,
                            }
                        }),
                    }
                }),
            )
        },
        [],
    )

    // Handle order ready (all items done)
    const handleOrderReady = useCallback(
        (event: { orderId: number; tableName: string }) => {
            // Remove from display or mark as complete
            setOrders((prev) => prev.filter((o) => o.id !== event.orderId))
        },
        [],
    )

    // Setup socket event listeners
    useKitchenEvents(restaurantId, userId, {
        onOrderReceived: handleOrderReceived,
        onOrderAccepted: handleOrderAccepted,
        onItemStatusChanged: handleItemStatusChanged,
        onOrderReady: handleOrderReady,
    })

    // Start preparing item
    const handleStartPreparing = async (itemId: number) => {
        try {
            await orderService.startPreparingItem(itemId)
        } catch (err) {
            console.error('Failed to start preparing:', err)
        }
    }

    // Mark item as ready
    const handleMarkReady = async (itemId: number) => {
        try {
            await orderService.markItemReady(itemId)
        } catch (err) {
            console.error('Failed to mark ready:', err)
        }
    }

    // Bump entire order (mark all items as ready)
    const handleBumpOrder = async (orderId: number) => {
        try {
            const order = orders.find((o) => o.id === orderId)
            if (!order) return

            // Mark all non-ready items as ready
            const itemsToMark = order.items.filter(
                (item) =>
                    item.status === 'QUEUED' || item.status === 'PREPARING',
            )

            for (const item of itemsToMark) {
                await orderService.markItemReady(item.id)
            }

            // Remove from display
            setOrders((prev) => prev.filter((o) => o.id !== orderId))
        } catch (err) {
            console.error('Failed to bump order:', err)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="text-lg text-white">Loading kitchen orders...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="text-red-400">{error}</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="bg-gray-800 shadow-lg">
                <div className="max-w-full mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-2xl font-bold text-white">
                                🍳 Kitchen Display
                            </h1>
                            <span className="text-sm text-gray-400">
                                {orders.length} active order
                                {orders.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* View Mode Toggle */}
                            <div className="flex bg-gray-700 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-1 rounded-md text-sm ${
                                        viewMode === 'grid'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    Grid
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1 rounded-md text-sm ${
                                        viewMode === 'list'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    List
                                </button>
                            </div>

                            {/* Sound Toggle */}
                            <button
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={`p-2 rounded-lg ${
                                    soundEnabled
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-600 text-gray-300'
                                }`}
                                title={
                                    soundEnabled
                                        ? 'Sound enabled'
                                        : 'Sound disabled'
                                }
                            >
                                {soundEnabled ? '🔔' : '🔕'}
                            </button>

                            {/* Refresh */}
                            <button
                                onClick={fetchOrders}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Refresh
                            </button>

                            {/* Clock */}
                            <div className="text-2xl font-mono text-gray-300">
                                {new Date().toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Orders Display */}
            <main className="p-4">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                        <div className="text-6xl mb-4">🍽️</div>
                        <div className="text-xl">No orders in queue</div>
                        <div className="text-sm">
                            Waiting for new orders...
                        </div>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {orders.map((order) => (
                            <KitchenOrderCard
                                key={order.id}
                                order={order}
                                onStartPreparing={handleStartPreparing}
                                onMarkReady={handleMarkReady}
                                onBump={() => handleBumpOrder(order.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <KitchenOrderCard
                                key={order.id}
                                order={order}
                                onStartPreparing={handleStartPreparing}
                                onMarkReady={handleMarkReady}
                                onBump={() => handleBumpOrder(order.id)}
                                listView
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Legend */}
            <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 px-4 py-2">
                <div className="flex items-center justify-center space-x-6 text-sm">
                    <div className="flex items-center">
                        <span className="w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                        <span className="text-gray-400">Queued</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-3 h-3 bg-orange-500 rounded-full mr-2 animate-pulse"></span>
                        <span className="text-gray-400">Preparing</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        <span className="text-gray-400">Ready</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                        <span className="text-gray-400">Overdue (&gt;30min)</span>
                    </div>
                </div>
            </footer>
        </div>
    )
}
