/**
 * Centralized API Configuration
 * Uses environment variables that are set at build time (Vite)
 */
const getApiBaseUrl = (): string => {
    // In development, Vite proxy handles this
    // In production, use the environment variable
    if (import.meta.env.DEV) {
        return '/api'
    }
    return import.meta.env.VITE_API_BASE_URL || '/api'
}

const getSocketUrl = (): string => {
    // In development, use relative path for Vite proxy
    // In production, use the environment variable
    if (import.meta.env.DEV) {
        return ''
    }
    const socketUrl = import.meta.env.VITE_SOCKET_URL || ''
    // Ensure WebSocket uses wss:// in production if URL is https://
    if (socketUrl.startsWith('https://')) {
        return socketUrl.replace('https://', 'wss://')
    }
    if (socketUrl.startsWith('http://')) {
        return socketUrl.replace('http://', 'ws://')
    }
    return socketUrl
}

export const apiConfig = {
    baseUrl: getApiBaseUrl(),
    socketUrl: getSocketUrl(),
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
} as const
