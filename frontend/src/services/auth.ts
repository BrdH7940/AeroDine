import { apiClient } from './api'

/**
 * Auth Service
 * Handles authentication-related API calls
 */

export interface LoginCredentials {
    email: string
    password: string
}

export interface LoginResponse {
    access_token: string
    user?: {
        id: number
        email: string
        fullName: string
        role: string
    }
}

/**
 * Login and store token
 */
export const authApi = {
    /**
     * Login with email and password
     */
    login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
        const response = await apiClient.post('/auth/login', credentials)
        const data = response.data

        // Store tokens in localStorage
        if (data.access_token) {
            localStorage.setItem('token', data.access_token)
        }
        if (data.refresh_token) {
            localStorage.setItem('refreshToken', data.refresh_token)
        }

        return data
    },

    /**
     * Logout (clear tokens and invalidate refresh token on server)
     */
    logout: async () => {
        try {
            // Call logout endpoint to invalidate refresh token on server
            await apiClient.post('/auth/logout')
        } catch (error) {
            // Continue with local logout even if server call fails
            console.error('Logout error:', error)
        } finally {
            // Always clear local storage
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
        }
    },

    /**
     * Get current token
     */
    getToken: (): string | null => {
        return localStorage.getItem('token')
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated: (): boolean => {
        return !!localStorage.getItem('token')
    },

    /**
     * Auto-login with admin credentials (development only)
     * This should only be used in development mode for convenience
     */
    autoLoginDev: async (): Promise<boolean> => {
        if (import.meta.env.PROD) {
            return false
        }

        try {
            // Try to login with default admin credentials from seed
            const response = await authApi.login({
                email: 'admin@aerodine.com',
                password: 'password123',
            })
            return !!response.access_token
        } catch {
            return false
        }
    },
}
