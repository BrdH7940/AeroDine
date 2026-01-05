import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppService } from './app.service'

@Controller() // Global prefix 'api' is set in main.ts, so route will be /api/hello
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly configService: ConfigService
    ) {}

    @Get('hello') // Endpoint will be /api/hello (global prefix + this route)
    getHello(): { message: string } {
        return { message: 'Hello from Backend!' }
    }

    @Get('health') // Endpoint will be /api/health
    getHealth() {
        const nodeEnv = this.configService.get<string>('nodeEnv')
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: nodeEnv,
            uptime: process.uptime(),
        }
    }
}
