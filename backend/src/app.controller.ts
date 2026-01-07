import { Controller, Get, Post, Body } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppService } from './app.service'
import { PrismaService } from './database/prisma.service'
import { ApiTags, ApiOperation } from '@nestjs/swagger'

@ApiTags('app')
@Controller() // Global prefix 'api' is set in main.ts, so route will be /api/hello
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService
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

    @Post('seed/restaurant')
    @ApiOperation({
        summary: 'Create a restaurant (for development/testing)',
    })
    async seedRestaurant(@Body() body?: { name?: string; address?: string }) {
        const restaurant = await this.prisma.restaurant.create({
            data: {
                name: body?.name || 'Default Restaurant',
                address: body?.address || null,
                isActive: true,
            },
        })
        return {
            message: 'Restaurant created successfully',
            restaurant,
        }
    }
}
