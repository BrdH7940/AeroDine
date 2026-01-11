import { io, Socket } from 'socket.io-client'
import { apiConfig } from '../config/api.config'

/**
 * Socket.io client instance
 * Automatically uses wss:// in production if URL is https://
 */
let socket: Socket | null = null

export const getSocket = (): Socket => {
    if (!socket) {
        const socketUrl =
            apiConfig.socketUrl ||
            (apiConfig.isDevelopment ? '' : window.location.origin)

        socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        })

        socket.on('connect', () => {
            // Socket connected
        })

        socket.on('disconnect', () => {
            // Socket disconnected
        })

        socket.on('connect_error', () => {
            // Socket connection error
        })
    }

    return socket
}

export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect()
        socket = null
    }
}

export type { Socket }
export default getSocket
