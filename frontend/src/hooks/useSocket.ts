import { useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { getSocket, disconnectSocket } from '../services/socket'

/**
 * React hook for managing socket connection
 */
export const useSocket = () => {
    const socketRef = useRef<Socket | null>(null)

    useEffect(() => {
        socketRef.current = getSocket()

        return () => {
            // Cleanup on unmount - but keep connection alive for other components
            // Only disconnect if no other components are using it
            // For now, we'll keep it connected. Adjust based on your needs.
        }
    }, [])

    return socketRef.current
}

/**
 * Hook to disconnect socket when component unmounts
 * Use this if you want to disconnect on unmount
 */
export const useSocketWithCleanup = () => {
    useEffect(() => {
        getSocket()

        return () => {
            disconnectSocket()
        }
    }, [])
}
