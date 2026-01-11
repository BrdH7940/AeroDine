// Enums matching Prisma schema
export enum UserRole {
    ADMIN = 'ADMIN',
    WAITER = 'WAITER',
    KITCHEN = 'KITCHEN',
    CUSTOMER = 'CUSTOMER',
}

export enum TableStatus {
    AVAILABLE = 'AVAILABLE',
    OCCUPIED = 'OCCUPIED',
    RESERVED = 'RESERVED',
}

export enum ItemStatus {
    AVAILABLE = 'AVAILABLE',
    SOLD_OUT = 'SOLD_OUT',
    HIDDEN = 'HIDDEN',
}
