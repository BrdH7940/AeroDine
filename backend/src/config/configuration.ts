export default () => ({
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
        url: process.env.DATABASE_URL,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        // Access token expires in 60 minutes (short-lived for security)
        accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '60m',
        // Refresh token expires in 7 days (long-lived for user convenience)
        refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
        // Legacy support (defaults to access token expiration)
        expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '60m',
    },
    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:5173',
    },
    momo: {
        partnerCode: process.env.MOMO_PARTNER_CODE,
        accessKey: process.env.MOMO_ACCESS_KEY,
        secretKey: process.env.MOMO_SECRET_KEY,
        endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
        appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    mail: {
        host: process.env.MAIL_HOST,
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl:
            process.env.GOOGLE_CALLBACK_URL ||
            'http://localhost:3000/api/auth/google/callback',
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
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
})
