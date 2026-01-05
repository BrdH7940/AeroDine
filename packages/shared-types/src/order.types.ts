// Order types
export interface Order {
    id?: string
    userId?: string
    items?: OrderItem[]
    total?: number
    status?: OrderStatus
    createdAt?: Date
    updatedAt?: Date
}

export interface OrderItem {
    menuId?: string
    quantity?: number
    price?: number
}

export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'completed'
    | 'cancelled'
