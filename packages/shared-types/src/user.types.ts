import { UserRole } from './common.types'

export interface User {
  id: number
  restaurantId?: number | null
  email: string
  passwordHash: string
  fullName: string
  role: UserRole
  refreshToken?: string | null
  createdAt: Date
  updatedAt: Date
  restaurant?: {
    id: number
    name: string
  } | null
}

export interface UserPublic {
  id: number
  restaurantId?: number | null
  email: string
  fullName: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
  restaurant?: {
    id: number
    name: string
  } | null
}

