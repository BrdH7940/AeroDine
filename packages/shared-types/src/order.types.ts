import {
  OrderStatus,
  OrderItemStatus,
  PaymentMethod,
  PaymentStatus,
} from './common.types'

export interface Order {
  id: number
  restaurantId: number
  tableId: number
  userId?: number | null
  waiterId?: number | null
  status: OrderStatus
  totalAmount: number | string // Decimal from Prisma
  guestCount: number
  note?: string | null
  createdAt: Date
  updatedAt: Date
  restaurant?: {
    id: number
    name: string
  }
  table?: {
    id: number
    name: string
    token: string
  }
  customer?: {
    id: number
    email: string
    fullName: string
  } | null
  waiter?: {
    id: number
    email: string
    fullName: string
  } | null
  items?: OrderItem[]
  payment?: Payment | null
}

export interface OrderItem {
  id: number
  orderId: number
  menuItemId: number
  name: string
  quantity: number
  pricePerUnit: number | string // Decimal from Prisma
  status: OrderItemStatus
  note?: string | null
  createdAt: Date
  updatedAt: Date
  order?: Order
  menuItem?: {
    id: number
    name: string
  }
  modifiers?: OrderItemModifier[]
}

export interface OrderItemModifier {
  id: number
  orderItemId: number
  modifierOptionId?: number | null
  modifierName: string
  priceAdjustment: number | string // Decimal from Prisma
  orderItem?: OrderItem
  modifierOption?: {
    id: number
    name: string
  } | null
}

export interface Payment {
  id: number
  orderId: number
  amount: number | string // Decimal from Prisma
  method: PaymentMethod
  status: PaymentStatus
  createdAt: Date
  updatedAt: Date
  order?: Order
}

export interface Review {
  id: number
  userId: number
  menuItemId: number
  rating: number
  comment?: string | null
  createdAt: Date
  user?: {
    id: number
    email: string
    fullName: string
  }
  menuItem?: {
    id: number
    name: string
  }
}
