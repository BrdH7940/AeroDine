/**
 * Socket.IO Event Types for Real-time Communication
 * Shared between frontend and backend
 *
 * @author Dev 2 - Operations Team
 */

// ============================================================================
// SOCKET EVENT NAMES (Constants)
// ============================================================================

export const SocketEvents = {
    // Connection events
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',

    // Room events
    JOIN_RESTAURANT: 'join_restaurant',
    LEAVE_RESTAURANT: 'leave_restaurant',
    JOIN_TABLE: 'join_table',
    LEAVE_TABLE: 'leave_table',
    JOIN_KITCHEN: 'join_kitchen',
    JOIN_WAITER: 'join_waiter',

    // Order events (from client)
    NEW_ORDER: 'new_order',
    ADD_ITEMS_TO_ORDER: 'add_items_to_order',
    CANCEL_ORDER: 'cancel_order',
    REQUEST_BILL: 'request_bill',

    // Order events (from server)
    ORDER_CREATED: 'order_created',
    ORDER_UPDATED: 'order_updated',
    ORDER_STATUS_CHANGED: 'order_status_changed',
    ORDER_ITEMS_ADDED: 'order_items_added',
    ORDER_CANCELLED: 'order_cancelled',
    BILL_REQUESTED: 'bill_requested',

    // Order item events
    ORDER_ITEM_STATUS_CHANGED: 'order_item_status_changed',
    ORDER_ITEM_READY: 'order_item_ready',

    // Waiter events
    WAITER_ASSIGNED: 'waiter_assigned',
    ORDER_ACCEPTED: 'order_accepted',
    ORDER_REJECTED: 'order_rejected',
    ORDER_SERVED: 'order_served',

    // Kitchen events
    KITCHEN_ORDER_RECEIVED: 'kitchen_order_received',
    KITCHEN_ITEM_START: 'kitchen_item_start',
    KITCHEN_ITEM_READY: 'kitchen_item_ready',
    KITCHEN_ORDER_READY: 'kitchen_order_ready',

    // Table events
    TABLE_STATUS_CHANGED: 'table_status_changed',
    TABLE_SESSION_STARTED: 'table_session_started',
    TABLE_SESSION_ENDED: 'table_session_ended',

    // Notification events
    NOTIFICATION: 'notification',
    ALERT: 'alert',

    // Error events
    ERROR: 'error',
} as const

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents]

// ============================================================================
// PAYLOAD TYPES
// ============================================================================

// Room join payloads
export interface JoinRestaurantPayload {
    restaurantId: number
    userId?: number
    role?: 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CUSTOMER'
}

export interface JoinTablePayload {
    restaurantId: number
    tableId: number
    tableToken: string
}

export interface JoinKitchenPayload {
    restaurantId: number
    userId: number
}

export interface JoinWaiterPayload {
    restaurantId: number
    userId: number
}

// Order payloads
export interface NewOrderPayload {
    restaurantId: number
    tableId: number
    items: OrderItemPayload[]
    guestCount?: number
    note?: string
    userId?: number
}

export interface OrderItemPayload {
    menuItemId: number
    quantity: number
    note?: string
    modifiers?: OrderItemModifierPayload[]
}

export interface OrderItemModifierPayload {
    modifierOptionId: number
    name: string
    priceAdjustment: number
}

export interface AddItemsToOrderPayload {
    orderId: number
    items: OrderItemPayload[]
}

export interface OrderStatusChangePayload {
    orderId: number
    status: OrderStatusType
    updatedBy?: number
}

export interface OrderItemStatusChangePayload {
    orderId: number
    orderItemId: number
    status: OrderItemStatusType
    updatedBy?: number
}

export interface WaiterAssignPayload {
    orderId: number
    waiterId: number
}

export interface OrderAcceptRejectPayload {
    orderId: number
    waiterId: number
    reason?: string // For rejection
}

export interface RequestBillPayload {
    orderId: number
    tableId: number
}

// ============================================================================
// RESPONSE/BROADCAST TYPES
// ============================================================================

export interface OrderCreatedEvent {
    order: OrderSummary
    tableId: number
    restaurantId: number
}

export interface OrderUpdatedEvent {
    order: OrderSummary
    updatedFields: string[]
}

export interface OrderStatusChangedEvent {
    orderId: number
    previousStatus: OrderStatusType
    newStatus: OrderStatusType
    updatedAt: string
    updatedBy?: number
}

export interface OrderItemStatusChangedEvent {
    orderId: number
    orderItemId: number
    itemName: string
    previousStatus: OrderItemStatusType
    newStatus: OrderItemStatusType
    updatedAt: string
}

export interface KitchenOrderEvent {
    order: KitchenOrderView
    priority: 'normal' | 'rush' | 'overdue'
}

export interface NotificationEvent {
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    orderId?: number
    tableId?: number
    timestamp: string
    sound?: boolean
}

export interface TableStatusEvent {
    tableId: number
    previousStatus: TableStatusType
    newStatus: TableStatusType
    orderId?: number
}

// ============================================================================
// VIEW TYPES (For real-time display)
// ============================================================================

export interface OrderSummary {
    id: number
    tableId: number
    tableName: string
    status: OrderStatusType
    totalAmount: number
    guestCount: number
    note?: string
    items: OrderItemSummary[]
    waiterName?: string
    createdAt: string
    updatedAt: string
}

export interface OrderItemSummary {
    id: number
    menuItemId: number
    name: string
    quantity: number
    pricePerUnit: number
    status: OrderItemStatusType
    note?: string
    modifiers: ModifierSummary[]
    createdAt: string
}

export interface ModifierSummary {
    id: number
    name: string
    priceAdjustment: number
}

export interface KitchenOrderView {
    id: number
    tableName: string
    items: KitchenItemView[]
    note?: string
    createdAt: string
    elapsedMinutes: number
    isOverdue: boolean
}

export interface KitchenItemView {
    id: number
    name: string
    quantity: number
    status: OrderItemStatusType
    note?: string
    modifiers: string[]
    prepTimeMinutes?: number
    startedAt?: string
    isOverdue?: boolean
}

// ============================================================================
// STATUS TYPES (Matching Prisma enums)
// ============================================================================

export type OrderStatusType = 'PENDING_REVIEW' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type OrderItemStatusType =
    | 'QUEUED'
    | 'PREPARING'
    | 'READY'
    | 'SERVED'
    | 'CANCELLED'

export type TableStatusType = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'

// ============================================================================
// SOCKET CLIENT/SERVER INTERFACES
// ============================================================================

export interface ServerToClientEvents {
    [SocketEvents.ORDER_CREATED]: (event: OrderCreatedEvent) => void
    [SocketEvents.ORDER_UPDATED]: (event: OrderUpdatedEvent) => void
    [SocketEvents.ORDER_STATUS_CHANGED]: (event: OrderStatusChangedEvent) => void
    [SocketEvents.ORDER_ITEMS_ADDED]: (event: OrderUpdatedEvent) => void
    [SocketEvents.ORDER_CANCELLED]: (event: { orderId: number; reason?: string }) => void
    [SocketEvents.ORDER_ITEM_STATUS_CHANGED]: (event: OrderItemStatusChangedEvent) => void
    [SocketEvents.ORDER_ITEM_READY]: (event: OrderItemStatusChangedEvent) => void
    [SocketEvents.WAITER_ASSIGNED]: (event: { orderId: number; waiterId: number; waiterName: string }) => void
    [SocketEvents.ORDER_ACCEPTED]: (event: { orderId: number; waiterId: number }) => void
    [SocketEvents.ORDER_REJECTED]: (event: { orderId: number; reason?: string }) => void
    [SocketEvents.ORDER_SERVED]: (event: { orderId: number }) => void
    [SocketEvents.KITCHEN_ORDER_RECEIVED]: (event: KitchenOrderEvent) => void
    [SocketEvents.KITCHEN_ITEM_READY]: (event: OrderItemStatusChangedEvent) => void
    [SocketEvents.KITCHEN_ORDER_READY]: (event: { orderId: number; tableName: string }) => void
    [SocketEvents.TABLE_STATUS_CHANGED]: (event: TableStatusEvent) => void
    [SocketEvents.BILL_REQUESTED]: (event: { orderId: number; tableId: number; tableName: string }) => void
    [SocketEvents.NOTIFICATION]: (event: NotificationEvent) => void
    [SocketEvents.ERROR]: (error: { code: string; message: string }) => void
}

export interface ClientToServerEvents {
    [SocketEvents.JOIN_RESTAURANT]: (payload: JoinRestaurantPayload) => void
    [SocketEvents.LEAVE_RESTAURANT]: (payload: { restaurantId: number }) => void
    [SocketEvents.JOIN_TABLE]: (payload: JoinTablePayload) => void
    [SocketEvents.LEAVE_TABLE]: (payload: { tableId: number }) => void
    [SocketEvents.JOIN_KITCHEN]: (payload: JoinKitchenPayload) => void
    [SocketEvents.JOIN_WAITER]: (payload: JoinWaiterPayload) => void
    [SocketEvents.NEW_ORDER]: (payload: NewOrderPayload) => void
    [SocketEvents.ADD_ITEMS_TO_ORDER]: (payload: AddItemsToOrderPayload) => void
    [SocketEvents.CANCEL_ORDER]: (payload: { orderId: number; reason?: string }) => void
    [SocketEvents.REQUEST_BILL]: (payload: RequestBillPayload) => void
}
