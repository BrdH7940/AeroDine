import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    constructor() {
        super({
            log: [],
        })
    }

    async onModuleInit() {
        await this.connectWithRetry()
    }

    async onModuleDestroy() {
        await this.$disconnect()
    }

    private async connectWithRetry(retries = 5, delay = 2000) {
        for (let i = 0; i < retries; i++) {
            try {
                await this.$connect()
                return
            } catch (error: any) {
                if (i < retries - 1) {
                    await new Promise((resolve) => setTimeout(resolve, delay))
                } else {
                    throw error
                }
            }
        }
    }

    /**
     * Handle connection errors and attempt to reconnect
     */
    async handleConnectionError() {
        try {
            await this.$disconnect()
            await this.connectWithRetry(3, 1000)
        } catch (error: any) {
            throw error
        }
    }
}
