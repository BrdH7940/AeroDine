import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        proxy: {
            '/api': {
                target:
                    process.env.VITE_API_BASE_URL?.replace('/api', '') ||
                    'http://localhost:3000',
                changeOrigin: true,
                secure: false,
                timeout: 10000,
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, _res) => {
                        // Silently handle proxy errors to avoid console spam
                        // Backend connection errors are expected when backend is not running
                    })
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        // Optional: log requests in development
                        if (process.env.DEBUG) {
                            console.log(`[Proxy] ${req.method} ${req.url}`)
                        }
                    })
                },
            },
            '/socket.io': {
                target: process.env.VITE_SOCKET_URL || 'http://localhost:3000',
                changeOrigin: true,
                ws: true,
                timeout: 10000,
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, _res) => {
                        // Silently handle WebSocket proxy errors
                    })
                },
            },
        },
    },
})
