// Menu types
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