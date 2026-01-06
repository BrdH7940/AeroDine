import { UserRole } from './common.types'

export interface Restaurant {
  id: number
  name: string
  address?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Table {
  id: number
  restaurantId: number
  name: string
  capacity: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'
  token: string
  isActive: boolean
  restaurant?: Restaurant
}

export interface Category {
  id: number
  restaurantId: number
  name: string
  image?: string | null
  rank: number
  restaurant?: Restaurant
}

