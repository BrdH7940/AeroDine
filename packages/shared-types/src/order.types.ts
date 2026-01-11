/**
 * Order Types - Comprehensive order data structures
 * Matching Prisma schema definitions
 *
 * @author Dev 2 - Operations Team
 */

// ============================================================================
// ENUMS (Matching Prisma)
// ============================================================================

export enum OrderStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum OrderItemStatus {
    QUEUED = 'QUEUED',
    PREPARING = 'PREPARING',
    READY = 'READY',
    SERVED = 'SERVED',
    CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
    CASH = 'CASH',
    QR_CODE = 'QR_CODE',
    E_WALLET = 'E_WALLET',
    CARD = 'CARD',
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

// ============================================================================
// ORDER INTERFACES
// ============================================================================

export interface Order {
    id: number
    restaurantId: number
    tableId: number
    userId?: number | null
    waiterId?: number | null
    status: OrderStatus
    totalAmount: number
    guestCount: number
    note?: string | null
    createdAt: Date | string
    updatedAt: Date | string

    // Relations (optional, populated when included)
    table?: TableInfo
    customer?: UserInfo
    waiter?: UserInfo
    items?: OrderItem[]
    payment?: Payment
}

export interface OrderItem {
    id: number
    orderId: number
    menuItemId: number
    name: string
    quantity: number
    pricePerUnit: number
    status: OrderItemStatus
    note?: string | null
    createdAt: Date | string
    updatedAt: Date | string

    // Relations
    menuItem?: MenuItemInfo
    modifiers?: OrderItemModifier[]
}

export interface OrderItemModifier {
    id: number
    orderItemId: number
    modifierOptionId?: number | null
    modifierName: string
    priceAdjustment: number
}

export interface Payment {
    id: number
    orderId: number
    amount: number
    method: PaymentMethod
    status: PaymentStatus
    createdAt: Date | string
    updatedAt: Date | string
}

// ============================================================================
// RELATED INFO TYPES (Minimal data for display)
// ============================================================================

export interface TableInfo {
    id: number
    name: string
    capacity: number
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'
}

export interface UserInfo {
    id: number
    fullName: string
    email: string
    role: 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CUSTOMER'
}

export interface MenuItemInfo {
    id: number
    name: string
    basePrice: number
    status: 'AVAILABLE' | 'SOLD_OUT' | 'HIDDEN'
}

// ============================================================================
// DTO TYPES (Data Transfer Objects)
// ============================================================================

export interface CreateOrderDto {
    restaurantId: number
    tableId: number
    userId?: number
    guestCount?: number
    note?: string
    items: CreateOrderItemDto[]
}

export interface CreateOrderItemDto {
    menuItemId: number
    quantity: number
    note?: string
    modifiers?: CreateOrderItemModifierDto[]
}

export interface CreateOrderItemModifierDto {
    modifierOptionId: number
    modifierName: string
    priceAdjustment: number
}

export interface UpdateOrderDto {
    status?: OrderStatus
    waiterId?: number
    note?: string
    guestCount?: number
}

export interface UpdateOrderItemStatusDto {
    status: OrderItemStatus
}

export interface AddItemsToOrderDto {
    items: CreateOrderItemDto[]
}

// ============================================================================
// QUERY/FILTER TYPES
// ============================================================================

export interface OrderFilters {
    restaurantId?: number
    tableId?: number
    waiterId?: number
    status?: OrderStatus | OrderStatus[]
    fromDate?: Date | string
    toDate?: Date | string
}

export interface OrderItemFilters {
    orderId?: number
    status?: OrderItemStatus | OrderItemStatus[]
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface OrderWithDetails extends Order {
    table: TableInfo
    items: OrderItemWithModifiers[]
    waiter?: UserInfo
    customer?: UserInfo
    payment?: Payment
}

export interface OrderItemWithModifiers extends OrderItem {
    modifiers: OrderItemModifier[]
    totalPrice: number // pricePerUnit * quantity + modifiers
}

export interface OrderListResponse {
    orders: Order[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

// ============================================================================
// KITCHEN/WAITER VIEW TYPES
// ============================================================================

export interface KitchenOrderCard {
    id: number
    tableName: string
    orderNumber: string // e.g., "#001"
    status: OrderStatus
    note?: string
    createdAt: string
    elapsedTime: number // in seconds
    isOverdue: boolean
    items: KitchenOrderItemCard[]
}

export interface KitchenOrderItemCard {
    id: number
    name: string
    quantity: number
    status: OrderItemStatus
    note?: string
    modifiers: string[] // Display names
    prepTimeEstimate?: number // in minutes
    startedAt?: string
    isOverdue: boolean
}

export interface WaiterOrderCard {
    id: number
    tableId: number
    tableName: string
    orderNumber: string
    status: OrderStatus
    totalAmount: number
    guestCount: number
    note?: string
    createdAt: string
    items: WaiterOrderItemCard[]
    canAccept: boolean
    canReject: boolean
    canServe: boolean
}

export interface WaiterOrderItemCard {
    id: number
    name: string
    quantity: number
    status: OrderItemStatus
    pricePerUnit: number
    note?: string
    modifiers: ModifierDisplay[]
    isReady: boolean
}

export interface ModifierDisplay {
    name: string
    priceAdjustment: number
}

// ============================================================================
// ORDER STATE MACHINE
// ============================================================================

export const OrderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
    [OrderStatus.IN_PROGRESS]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [], // Terminal state
    [OrderStatus.CANCELLED]: [], // Terminal state
}

export const OrderItemStatusTransitions: Record<
    OrderItemStatus,
    OrderItemStatus[]
> = {
    [OrderItemStatus.QUEUED]: [
        OrderItemStatus.PREPARING,
        OrderItemStatus.CANCELLED,
    ],
    [OrderItemStatus.PREPARING]: [
        OrderItemStatus.READY,
        OrderItemStatus.CANCELLED,
    ],
    [OrderItemStatus.READY]: [OrderItemStatus.SERVED],
    [OrderItemStatus.SERVED]: [], // Terminal state
    [OrderItemStatus.CANCELLED]: [], // Terminal state
}

/**
 * Check if a status transition is valid
 */
export function canTransitionOrderStatus(
    from: OrderStatus,
    to: OrderStatus
): boolean {
    return OrderStatusTransitions[from]?.includes(to) ?? false
}

export function canTransitionOrderItemStatus(
    from: OrderItemStatus,
    to: OrderItemStatus
): boolean {
    return OrderItemStatusTransitions[from]?.includes(to) ?? false
}
