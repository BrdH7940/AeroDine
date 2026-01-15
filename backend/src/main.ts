import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        rawBody: true, // Enable raw body for Stripe webhook
    })
    const configService = app.get(ConfigService)

    // Enable CORS from configuration
    const corsConfig = configService.get('cors')
    app.enableCors(corsConfig)

    // Enable global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    )

    // Set global API prefix
    app.setGlobalPrefix('api')

    const port = configService.get<number>('port') || 3000
    const nodeEnv = configService.get<string>('nodeEnv') || 'development'

    await app.listen(port)

    console.log(`Application is running on: http://localhost:${port}/api`)
    console.log(`Environment: ${nodeEnv}`)
}
bootstrap()
