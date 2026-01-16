import { ItemStatus } from './common.types'

export interface MenuItem {
  id: number
  restaurantId: number
  categoryId: number
  name: string
  description?: string | null
  basePrice: number | string // Decimal from Prisma
  status: ItemStatus
  createdAt: Date
  updatedAt: Date
  restaurant?: {
    id: number
    name: string
  }
  category?: {
    id: number
    name: string
  }
  images?: MenuItemImage[]
  modifierGroups?: ModifierGroup[]
}

export interface MenuItemImage {
  id: number
  menuItemId: number
  url: string
  rank: number
  menuItem?: MenuItem
}

export interface ModifierGroup {
  id: number
  restaurantId: number
  name: string
  minSelection: number
  maxSelection: number
  restaurant?: {
    id: number
    name: string
  }
  options?: ModifierOption[]
}

export interface ModifierOption {
  id: number
  groupId: number
  name: string
  priceAdjustment: number | string // Decimal from Prisma
  isAvailable: boolean
  group?: ModifierGroup
}

export interface ItemModifierGroup {
  itemId: number
  groupId: number
  menuItem?: MenuItem
  modifierGroup?: ModifierGroup
}

// Legacy interface for backward compatibility
export interface Menu {
  id?: string
  name?: string
  description?: string
  price?: number
  category?: string
  image?: string
  available?: boolean
}

// Modifier types
export interface ModifierOption {
    id?: number
    groupId?: number
    name: string
    priceAdjustment?: number
    isAvailable?: boolean
}

export interface ModifierGroup {
    id?: number
    restaurantId?: number
    name: string
    minSelection?: number
    maxSelection?: number
    options?: ModifierOption[]
}

export interface MenuItemWithModifiers extends Menu {
    modifierGroups?: ModifierGroup[]
}