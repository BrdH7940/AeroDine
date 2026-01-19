import { useState, useEffect, useCallback } from 'react'
import { Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { orderService } from '../../../services/order.service'
import { authService } from '../../../services/auth.service'
import { OrderItemStatus } from '@aerodine/shared-types'
import { useKitchenEvents } from '../../../hooks/useSocket'
import type { KitchenOrderEvent, OrderItemStatusChangedEvent } from '@aerodine/shared-types'

interface OrderItem {
    id: number
    menuItemId: number
    quantity: number
    pricePerUnit: number
    status: OrderItemStatus
    name: string
    menuItem?: {
        id: number
        name: string
        description?: string
    }
    modifiers?: Array<{
        id: number
        modifierOption?: {
            name: string
        }
        modifierName?: string
    }>
}

interface Order {
    id: number
    tableId: number
    totalAmount: number
    status: string
    createdAt: string
    table: {
        name: string
    }
    items: OrderItem[]
}

interface TicketCardProps {
    order: Order
    onStatusChange: (orderId: number, itemId: number, newStatus: OrderItemStatus) => void
}

function TicketCard({ order, onStatusChange }: TicketCardProps) {
    const getElapsedMinutes = () => {
        const now = new Date()
        const createdAt = new Date(order.createdAt)
        return Math.floor((now.getTime() - createdAt.getTime()) / 60000)
    }

    const elapsedMinutes = getElapsedMinutes()
    const isOverdue = elapsedMinutes > 20

    // Get the overall status based on items
    const getOverallStatus = (): 'pending' | 'preparing' | 'ready' => {
        const allReady = order.items.every(item => item.status === OrderItemStatus.READY || item.status === OrderItemStatus.SERVED)
        const anyPreparing = order.items.some(item => item.status === OrderItemStatus.PREPARING)
        
        if (allReady) return 'ready'
        if (anyPreparing) return 'preparing'
        return 'pending'
    }

    const overallStatus = getOverallStatus()

    const handleItemStatusChange = async (itemId: number, newStatus: OrderItemStatus) => {
        await onStatusChange(order.id, itemId, newStatus)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                        {order.table.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                        Order #{order.id} • {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                </div>
                <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                        isOverdue
                            ? 'bg-red-100 text-red-700'
                            : overallStatus === 'ready'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                    }`}
                >
                    <Clock size={14} />
                    <span className="text-sm font-medium">
                        {elapsedMinutes} min
                    </span>
                </div>
            </div>

            {/* Items */}
            <div className="space-y-3 mb-4">
                {order.items.map((item) => (
                    <div key={item.id} className="border-b border-slate-100 pb-2">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <span className="font-medium text-slate-900">
                                    <span className="bg-gray-700 text-yellow-400 px-1.5 py-0.5 rounded mr-1.5">
                                        {item.quantity}x
                                    </span>
                                    {item.menuItem?.name || item.name}
                                </span>
                                {item.modifiers && item.modifiers.length > 0 && (
                                    <div className="mt-1 ml-8 space-y-0.5">
                                        {item.modifiers.map((modifier) => (
                                            <p
                                                key={modifier.id}
                                                className="text-sm text-slate-500"
                                            >
                                                + {modifier.modifierOption?.name || modifier.modifierName}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Item status buttons */}
                            <div className="flex gap-1 ml-2">
                                {item.status === OrderItemStatus.QUEUED && (
                                    <button
                                        onClick={() => handleItemStatusChange(item.id, OrderItemStatus.PREPARING)}
                                        className="text-sm px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                                    >
                                        Start
                                    </button>
                                )}
                                {item.status === OrderItemStatus.PREPARING && (
                                    <button
                                        onClick={() => handleItemStatusChange(item.id, OrderItemStatus.READY)}
                                        className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                    >
                                        Ready
                                    </button>
                                )}
                                {(item.status === OrderItemStatus.READY || item.status === OrderItemStatus.SERVED) && (
                                    <span className="text-sm px-2 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded">
                                        {item.status === OrderItemStatus.READY ? 'Ready' : 'Served'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    )
}

export default function KDSPage() {
    // TODO: Get from auth context
    const restaurantId = 4 // AeroDine Signature restaurant
    const userId = 13 // Kitchen Staff ID (kitchen@aerodine.com)

    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch orders function - KDS only shows orders that have been accepted (IN_PROGRESS)
    const fetchOrders = useCallback(async () => {
        try {
            const ordersData = await orderService.getOrders({ restaurantId })
            const ordersArray = Array.isArray(ordersData) ? ordersData : (ordersData.orders || [])
            // Only show IN_PROGRESS orders (waiter has already accepted)
            const activeOrders = ordersArray.filter(
                (order: any) => order.status === 'IN_PROGRESS'
            )
            setOrders(activeOrders)
        } catch (err: any) {
            console.error('Error fetching orders:', err)
            if (err.response?.status === 401) {
                setError('Authentication required. Please login.')
            } else if (err.response?.status === 404) {
                setError('Backend endpoint not found. Please check if backend is running.')
            } else {
                setError(`Unable to load orders: ${err.response?.data?.message || err.message || 'Unknown error'}`)
            }
        }
    }, [restaurantId])

    // Socket.IO: Handle new order received
    const handleOrderReceived = useCallback((event: KitchenOrderEvent) => {
        console.log('🔔 New order received via Socket:', event)
        // Add new order to the list
        setOrders(prev => {
            if (prev.some(o => o.id === event.order.id)) return prev
            // Map KitchenOrderView to Order format
            const newOrder: Order = {
                id: event.order.id,
                tableId: 0, // Not available in KitchenOrderView
                totalAmount: 0,
                status: 'PENDING',
                createdAt: event.order.createdAt,
                table: { name: event.order.tableName },
                items: event.order.items.map(item => ({
                    id: item.id,
                    menuItemId: 0,
                    quantity: item.quantity,
                    pricePerUnit: 0,
                    status: item.status as OrderItemStatus,
                    name: item.name,
                    modifiers: item.modifiers.map((m, idx) => ({
                        id: idx,
                        modifierName: m
                    }))
                }))
            }
            return [newOrder, ...prev]
        })
    }, [])

    // Socket.IO: Handle order accepted (refresh to get full data)
    const handleOrderAccepted = useCallback(() => {
        console.log('🔔 Order accepted, refreshing...')
        fetchOrders()
    }, [fetchOrders])

    // Socket.IO: Handle item status changed
    const handleItemStatusChanged = useCallback((event: OrderItemStatusChangedEvent) => {
        console.log('🔔 Item status changed via Socket:', event)
        setOrders(prev => prev.map(order => {
            if (order.id !== event.orderId) return order
            return {
                ...order,
                items: order.items.map(item => {
                    if (item.id !== event.orderItemId) return item
                    return { ...item, status: event.newStatus as OrderItemStatus }
                })
            }
        }))
    }, [])

    // Socket.IO: Handle order ready (remove from KDS)
    const handleOrderReady = useCallback((event: { orderId: number }) => {
        console.log('🔔 Order ready, removing from KDS:', event)
        setOrders(prev => prev.filter(o => o.id !== event.orderId))
    }, [])

    // Socket.IO: Handle order served (remove from KDS when all items served)
    const handleOrderServed = useCallback((event: { orderId: number }) => {
        console.log('🔔 Order served, removing from KDS:', event)
        setOrders(prev => prev.filter(o => o.id !== event.orderId))
    }, [])

    // Setup Socket.IO event listeners
    useKitchenEvents(restaurantId, userId, {
        onOrderReceived: handleOrderReceived,
        onOrderAccepted: handleOrderAccepted,
        onItemStatusChanged: handleItemStatusChanged,
        onOrderReady: handleOrderReady,
        onOrderServed: handleOrderServed,
    })

    // Initial fetch + fallback polling every 30s (in case socket misses something)
    useEffect(() => {
        initializeAndFetchOrders()
        const interval = setInterval(fetchOrders, 30000) // Fallback polling every 30s
        return () => clearInterval(interval)
    }, [fetchOrders])

    const initializeAndFetchOrders = async () => {
        try {
            setLoading(true)
            setError(null)

            // Auto-login in development mode if not authenticated
            if (import.meta.env.DEV && !authService.isAuthenticated()) {
                try {
                    await authService.autoLoginDev()
                } catch (loginError) {
                    console.warn('Auto-login failed, continuing without auth:', loginError)
                }
            }

            await fetchOrders()
        } catch (err: any) {
            console.error('Error initializing KDS:', err)
            setError('Unable to load orders. Please check if backend is running.')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (orderId: number, itemId: number, newStatus: OrderItemStatus) => {
        try {
            await orderService.updateItemStatus(itemId, newStatus)
            // Refresh orders after update
            await fetchOrders()
        } catch (err: any) {
            console.error('Error updating order item status:', err)
            alert('Unable to update status. Please try again.')
        }
    }

    const getOrdersByStatus = (status: 'pending' | 'preparing' | 'ready') => {
        return orders.filter((order) => {
            // Filter out items that are already served
            const activeItems = order.items.filter(item => item.status !== OrderItemStatus.SERVED)
            
            // Skip orders where all items are served
            if (activeItems.length === 0) return false
            
            const allReady = activeItems.every(item => item.status === OrderItemStatus.READY)
            const anyPreparing = activeItems.some(item => item.status === OrderItemStatus.PREPARING)
            
            if (status === 'ready' && allReady) return true
            if (status === 'preparing' && anyPreparing && !allReady) return true
            if (status === 'pending' && !anyPreparing && !allReady) return true
            return false
        })
    }

    const columns = [
        {
            title: 'Pending',
            status: 'pending' as const,
            borderColor: 'border-t-amber-500',
            headerBgColor: 'bg-amber-500',
            bgColor: 'bg-amber-50',
            count: getOrdersByStatus('pending').length,
        },
        {
            title: 'Preparing',
            status: 'preparing' as const,
            borderColor: 'border-t-blue-500',
            headerBgColor: 'bg-blue-500',
            bgColor: 'bg-blue-50',
            count: getOrdersByStatus('preparing').length,
        },
        {
            title: 'Ready',
            status: 'ready' as const,
            borderColor: 'border-t-emerald-500',
            headerBgColor: 'bg-emerald-500',
            bgColor: 'bg-emerald-50',
            count: getOrdersByStatus('ready').length,
        },
    ]

    if (loading) {
        return (
            <div className="p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                        <p className="mt-4 text-slate-500">Loading orders...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-semibold text-slate-900">
                    Kitchen display system
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Manage and track order preparation
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Kanban Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {columns.map((column) => (
                    <div key={column.status} className="flex flex-col">
                        {/* Column Header */}
                        <div
                            className={`${column.headerBgColor} rounded-t-lg border-t-4 ${column.borderColor} p-4 shadow-sm relative`}
                        >
                            <div className="flex items-center justify-center">
                                <h2 className="text-xl font-semibold text-white">
                                    {column.title}
                                </h2>
                                <span className="absolute right-4 px-2 py-1 bg-white/20 text-white rounded-full text-sm font-semibold">
                                    {column.count}
                                </span>
                            </div>
                        </div>

                        {/* Tickets */}
                        <div className={`flex-1 ${column.bgColor} rounded-b-lg min-h-[600px] p-4`}>
                            {getOrdersByStatus(column.status).length === 0 ? (
                                <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                                    No orders
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {getOrdersByStatus(column.status).map(
                                        (order) => (
                                            <TicketCard
                                                key={order.id}
                                                order={order}
                                                onStatusChange={
                                                    handleStatusChange
                                                }
                                            />
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
