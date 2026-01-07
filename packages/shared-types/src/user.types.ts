import { UserRole } from './common.types'

export interface User {
  id: number
  email: string
  passwordHash: string
  fullName: string
  role: UserRole
  refreshToken?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface UserPublic {
  id: number
  email: string
  fullName: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

