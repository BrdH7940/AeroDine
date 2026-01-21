import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import * as express from 'express'

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        rawBody: true, // Enable raw body for Stripe webhooks
    })
    const configService = app.get(ConfigService)

    // Configure body parser - exclude webhook endpoints from parsing
    // Webhooks need raw body for signature verification
    // Note: Path includes /api prefix because global prefix is set later
    const isWebhookEndpoint = (path: string) => {
        return path === '/api/payments/callback/stripe' || 
               path === '/api/orders/webhook' ||
               path === '/api/payments/callback/momo' ||
               path === '/payments/callback/stripe' ||  // Fallback: without prefix
               path === '/orders/webhook' ||
               path === '/payments/callback/momo'
    }
    
    // JSON parser - skip for webhook endpoints
    app.use((req, res, next) => {
        if (isWebhookEndpoint(req.path)) {
            console.log(`⏭️  Skipping body parser for webhook: ${req.path}`)
            return next()
        }
        express.json({ limit: '10mb' })(req, res, next)
    })
    
    // URL encoded parser - skip for webhook endpoints
    app.use((req, res, next) => {
        if (isWebhookEndpoint(req.path)) {
            return next()
        }
        express.urlencoded({ limit: '10mb', extended: true })(req, res, next)
    })

    // Enable CORS - use configured origin or allow localhost in development
    const nodeEnv = configService.get<string>('nodeEnv') || 'development'
    const corsOrigin = configService.get<string>('cors.origin')
    
    // In production, only allow configured origin
    // In development, allow localhost and configured origin
    const allowedOrigins = nodeEnv === 'production' 
        ? [corsOrigin].filter(Boolean)
        : [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            corsOrigin
          ].filter(Boolean)
    
    app.enableCors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true)
            
            if (allowedOrigins.includes(origin)) {
                callback(null, true)
            } else {
                callback(new Error('Not allowed by CORS'))
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })

    // Enable global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        })
    )

    // Swagger Configuration - create config first
    const swaggerConfig = new DocumentBuilder()
        .setTitle('AeroDine API')
        .setDescription('QR Ordering System API Documentation')
        .setVersion('1.0')
        .addServer('http://localhost:3000', 'Local development server')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth' // This name here is important for matching up with @ApiBearerAuth() in your controller!
        )
        .build()

    // Set global API prefix - exclude Swagger paths to set them up manually
    app.setGlobalPrefix('api', {
        exclude: ['docs', 'docs-json', 'docs-yaml'],
    })

    // Setup Swagger with full path (excluded from global prefix)
    const port = configService.get<number>('port') || 3000
    try {
        const document = SwaggerModule.createDocument(app, swaggerConfig)
        SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
            },
        })
        console.log(
            `✅ Swagger UI will be available at: http://localhost:${port}/api/docs`
        )
    } catch (error) {
        console.error('❌ Error setting up Swagger:', error)
        console.error('Error details:', error)
    }

    await app.listen(port)
    console.log(`🚀 Server is running on: http://localhost:${port}`)
    console.log(
        `📚 Swagger docs available at: http://localhost:${port}/api/docs`
    )
    console.log(`📋 API base URL: http://localhost:${port}/api`)
}
bootstrap()
