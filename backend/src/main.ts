import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        rawBody: true, // Enable raw body for Stripe webhooks
    })
    const configService = app.get(ConfigService)

    // Enable CORS - allow any origin for development
    app.enableCors({
        origin: '*',
        credentials: true,
    })

    // Set global API prefix
    app.setGlobalPrefix('api')

    // Global Validation Pipe with whitelist
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    )

    // Swagger Configuration
    const config = new DocumentBuilder()
        .setTitle('AeroDine API')
        .setDescription('QR Ordering System API Documentation')
        .setVersion('1.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
        )
        .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)

    const port = configService.get<number>('port') || 3000
    const nodeEnv = configService.get<string>('nodeEnv') || 'development'

    await app.listen(port)

    console.log(`Application is running on: http://localhost:${port}/api`)
    console.log(`Swagger documentation: http://localhost:${port}/api/docs`)
    console.log(`Environment: ${nodeEnv}`)
}
bootstrap()
