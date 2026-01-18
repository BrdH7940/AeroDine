import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AiService } from './ai.service'
import { AiController } from './ai.controller'
import { DatabaseModule } from '../database/database.module'

@Module({
    imports: [ConfigModule, DatabaseModule],
    controllers: [AiController],
    providers: [AiService],
    exports: [AiService],
})
export class AiModule {}
