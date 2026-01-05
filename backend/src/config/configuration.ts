export default () => ({
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
        url: process.env.DATABASE_URL,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    },
    socket: {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
            credentials: true,
        },
    },
})
