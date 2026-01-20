import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'
import { getSocket, disconnectSocket } from '../services/socket'
import { SocketEvents } from '@aerodine/shared-types'
import type {
    JoinRestaurantPayload,
    JoinTablePayload,
    JoinKitchenPayload,
    JoinWaiterPayload,
    OrderCreatedEvent,
    OrderUpdatedEvent,
    OrderStatusChangedEvent,
    OrderItemStatusChangedEvent,
    KitchenOrderEvent,
    NotificationEvent,
    TableStatusEvent,
    MenuItemStatusChangedEvent,
} from '@aerodine/shared-types'

/**
 * React hook for managing socket connection
 *
 * @author Dev 2 - Operations Team
 */
export const useSocket = () => {
    const socketRef = useRef<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        socketRef.current = getSocket()

        const handleConnect = () => setIsConnected(true)
        const handleDisconnect = () => setIsConnected(false)

        socketRef.current.on('connect', handleConnect)
        socketRef.current.on('disconnect', handleDisconnect)

        // Set initial state
        setIsConnected(socketRef.current.connected)

        return () => {
            socketRef.current?.off('connect', handleConnect)
            socketRef.current?.off('disconnect', handleDisconnect)
        }
    }, [])

    return { socket: socketRef.current, isConnected }
}

/**
 * Hook to disconnect socket when component unmounts
 */
export const useSocketWithCleanup = () => {
    useEffect(() => {
        getSocket()

        return () => {
            disconnectSocket()
        }
    }, [])
}

// ============================================================================
// ROOM HOOKS
// ============================================================================

/**
 * Hook to join restaurant room
 */
export const useRestaurantRoom = (restaurantId: number, userId?: number) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected || !restaurantId) return

        const payload: JoinRestaurantPayload = { restaurantId, userId }
        socket.emit(SocketEvents.JOIN_RESTAURANT, payload)

        return () => {
            socket.emit(SocketEvents.LEAVE_RESTAURANT, { restaurantId })
        }
    }, [socket, isConnected, restaurantId, userId])

    return { socket, isConnected }
}

/**
 * Hook to join table room (for customers)
 */
export const useTableRoom = (
    restaurantId: number,
    tableId: number,
    tableToken: string
) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected || !tableId) return

        const payload: JoinTablePayload = { restaurantId, tableId, tableToken }
        socket.emit(SocketEvents.JOIN_TABLE, payload)

        return () => {
            socket.emit(SocketEvents.LEAVE_TABLE, { tableId })
        }
    }, [socket, isConnected, restaurantId, tableId, tableToken])

    return { socket, isConnected }
}

/**
 * Hook to join kitchen room
 */
export const useKitchenRoom = (restaurantId: number, userId: number) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected || !restaurantId) return

        const payload: JoinKitchenPayload = { restaurantId, userId }
        socket.emit(SocketEvents.JOIN_KITCHEN, payload)

        return () => {
            // Leave handled by disconnect
        }
    }, [socket, isConnected, restaurantId, userId])

    return { socket, isConnected }
}

/**
 * Hook to join waiter room
 */
export const useWaiterRoom = (restaurantId: number, userId: number) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected || !restaurantId) return

        const payload: JoinWaiterPayload = { restaurantId, userId }
        socket.emit(SocketEvents.JOIN_WAITER, payload)

        return () => {
            // Leave handled by disconnect
        }
    }, [socket, isConnected, restaurantId, userId])

    return { socket, isConnected }
}

// ============================================================================
// EVENT LISTENER HOOKS
// ============================================================================

/**
 * Hook for listening to order created events
 */
export const useOrderCreated = (
    callback: (event: OrderCreatedEvent) => void
) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected) return

        socket.on(SocketEvents.ORDER_CREATED, callback)

        return () => {
            socket.off(SocketEvents.ORDER_CREATED, callback)
        }
    }, [socket, isConnected, callback])
}

/**
 * Hook for listening to order updated events
 */
export const useOrderUpdated = (
    callback: (event: OrderUpdatedEvent) => void
) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected) return

        socket.on(SocketEvents.ORDER_UPDATED, callback)

        return () => {
            socket.off(SocketEvents.ORDER_UPDATED, callback)
        }
    }, [socket, isConnected, callback])
}

/**
 * Hook for listening to order status change events
 */
export const useOrderStatusChanged = (
    callback: (event: OrderStatusChangedEvent) => void
) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected) return

        socket.on(SocketEvents.ORDER_STATUS_CHANGED, callback)

        return () => {
            socket.off(SocketEvents.ORDER_STATUS_CHANGED, callback)
        }
    }, [socket, isConnected, callback])
}

/**
 * Hook for listening to order item status change events
 */
export const useOrderItemStatusChanged = (
    callback: (event: OrderItemStatusChangedEvent) => void
) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected) return

        socket.on(SocketEvents.ORDER_ITEM_STATUS_CHANGED, callback)

        return () => {
            socket.off(SocketEvents.ORDER_ITEM_STATUS_CHANGED, callback)
        }
    }, [socket, isConnected, callback])
}

/**
 * Hook for kitchen order events
 */
export const useKitchenOrderReceived = (
    callback: (event: KitchenOrderEvent) => void
) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected) return

        socket.on(SocketEvents.KITCHEN_ORDER_RECEIVED, callback)

        return () => {
            socket.off(SocketEvents.KITCHEN_ORDER_RECEIVED, callback)
        }
    }, [socket, isConnected, callback])
}

/**
 * Hook for kitchen order ready events
 */
export const useKitchenOrderReady = (
    callback: (event: { orderId: number; tableName: string }) => void
) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected) return

        socket.on(SocketEvents.KITCHEN_ORDER_READY, callback)

        return () => {
            socket.off(SocketEvents.KITCHEN_ORDER_READY, callback)
        }
    }, [socket, isConnected, callback])
}

/**
 * Hook for notification events
 */
export const useNotification = (
    callback: (event: NotificationEvent) => void
) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected) return

        socket.on(SocketEvents.NOTIFICATION, callback)

        return () => {
            socket.off(SocketEvents.NOTIFICATION, callback)
        }
    }, [socket, isConnected, callback])
}

/**
 * Hook for bill requested events (for waiters)
 */
export const useBillRequested = (
    callback: (event: {
        orderId: number
        tableId: number
        tableName: string
    }) => void
) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected) return

        socket.on(SocketEvents.BILL_REQUESTED, callback)

        return () => {
            socket.off(SocketEvents.BILL_REQUESTED, callback)
        }
    }, [socket, isConnected, callback])
}

/**
 * Hook to listen for menu item status changes (for customer menu page)
 */
export const useMenuItemStatusChanges = (
    restaurantId: number,
    onMenuItemStatusChanged?: (event: MenuItemStatusChangedEvent) => void
) => {
    const { socket, isConnected } = useRestaurantRoom(restaurantId, undefined)

    useEffect(() => {
        if (!socket || !isConnected || !onMenuItemStatusChanged) return

        socket.on(SocketEvents.MENU_ITEM_STATUS_CHANGED, onMenuItemStatusChanged)
        socket.on(SocketEvents.MENU_ITEM_STOCK_UPDATED, onMenuItemStatusChanged)

        return () => {
            socket.off(SocketEvents.MENU_ITEM_STATUS_CHANGED)
            socket.off(SocketEvents.MENU_ITEM_STOCK_UPDATED)
        }
    }, [socket, isConnected, onMenuItemStatusChanged, restaurantId])

    return { socket, isConnected }
}

/**
 * Hook for listening to table status change events
 */
export const useTableStatusChanged = (
    callback: (event: TableStatusEvent) => void
) => {
    const { socket, isConnected } = useSocket()

    useEffect(() => {
        if (!socket || !isConnected) return

        socket.on(SocketEvents.TABLE_STATUS_CHANGED, callback)

        return () => {
            socket.off(SocketEvents.TABLE_STATUS_CHANGED, callback)
        }
    }, [socket, isConnected, callback])
}

// ============================================================================
// COMPREHENSIVE WAITER HOOK
// ============================================================================

interface WaiterOrderEvents {
    onOrderCreated?: (event: OrderCreatedEvent) => void
    onOrderAccepted?: (event: { orderId: number; waiterId: number }) => void
    onOrderRejected?: (event: { orderId: number; reason?: string }) => void
    onItemStatusChanged?: (event: OrderItemStatusChangedEvent) => void
    onOrderItemReady?: (event: OrderItemStatusChangedEvent) => void
    onBillRequested?: (event: {
        orderId: number
        tableId: number
        tableName: string
    }) => void
}

export const useWaiterEvents = (
    restaurantId: number,
    userId: number,
    events: WaiterOrderEvents
) => {
    const { socket, isConnected } = useWaiterRoom(restaurantId, userId)

    useEffect(() => {
        if (!socket || !isConnected) return

        if (events.onOrderCreated) {
            socket.on(SocketEvents.ORDER_CREATED, events.onOrderCreated)
        }
        if (events.onOrderAccepted) {
            socket.on(SocketEvents.ORDER_ACCEPTED, events.onOrderAccepted)
        }
        if (events.onOrderRejected) {
            socket.on(SocketEvents.ORDER_REJECTED, events.onOrderRejected)
        }
        if (events.onItemStatusChanged) {
            socket.on(SocketEvents.ORDER_ITEM_STATUS_CHANGED, events.onItemStatusChanged)
        }
        if (events.onOrderItemReady) {
            socket.on(SocketEvents.ORDER_ITEM_READY, events.onOrderItemReady)
        }
        if (events.onBillRequested) {
            socket.on(SocketEvents.BILL_REQUESTED, events.onBillRequested)
        }

        return () => {
            socket.off(SocketEvents.ORDER_CREATED)
            socket.off(SocketEvents.ORDER_ACCEPTED)
            socket.off(SocketEvents.ORDER_REJECTED)
            socket.off(SocketEvents.ORDER_ITEM_STATUS_CHANGED)
            socket.off(SocketEvents.ORDER_ITEM_READY)
            socket.off(SocketEvents.BILL_REQUESTED)
        }
    }, [socket, isConnected, events])

    return { socket, isConnected }
}

// ============================================================================
// COMPREHENSIVE KITCHEN HOOK
// ============================================================================

interface KitchenEvents {
    onOrderReceived?: (event: KitchenOrderEvent) => void
    onOrderAccepted?: (event: { orderId: number; waiterId: number }) => void
    onItemStatusChanged?: (event: OrderItemStatusChangedEvent) => void
    onOrderReady?: (event: { orderId: number; tableName: string }) => void
    onOrderServed?: (event: { orderId: number }) => void
}

export const useKitchenEvents = (
    restaurantId: number,
    userId: number,
    events: KitchenEvents
) => {
    const { socket, isConnected } = useKitchenRoom(restaurantId, userId)

    useEffect(() => {
        if (!socket || !isConnected) return

        if (events.onOrderReceived) {
            socket.on(
                SocketEvents.KITCHEN_ORDER_RECEIVED,
                events.onOrderReceived
            )
        }
        if (events.onOrderAccepted) {
            socket.on(SocketEvents.ORDER_ACCEPTED, events.onOrderAccepted)
        }
        if (events.onItemStatusChanged) {
            socket.on(
                SocketEvents.ORDER_ITEM_STATUS_CHANGED,
                events.onItemStatusChanged
            )
        }
        if (events.onOrderReady) {
            socket.on(SocketEvents.KITCHEN_ORDER_READY, events.onOrderReady)
        }
        if (events.onOrderServed) {
            socket.on(SocketEvents.ORDER_SERVED, events.onOrderServed)
        }

        return () => {
            socket.off(SocketEvents.KITCHEN_ORDER_RECEIVED)
            socket.off(SocketEvents.ORDER_ACCEPTED)
            socket.off(SocketEvents.ORDER_ITEM_STATUS_CHANGED)
            socket.off(SocketEvents.KITCHEN_ORDER_READY)
            socket.off(SocketEvents.ORDER_SERVED)
        }
    }, [socket, isConnected, events])

    return { socket, isConnected }
}

export default useSocket
