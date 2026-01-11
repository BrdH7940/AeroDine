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
            // Keep connection alive for other components
        }
    }, [])

    return socketRef.current
}

/**
 * Hook to disconnect socket when component unmounts
 */
export const useSocketWithCleanup = () => {
    useEffect(() => {
        getSocket()

        return () => {
            disconnectSocket()
        }
    }, [])
}
