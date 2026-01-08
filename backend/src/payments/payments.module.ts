import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PaymentsService } from './payments.service'
import { PaymentsController } from './payments.controller'
import { MomoStrategy } from './strategies/momo.strategy'

@Module({
    imports: [ConfigModule],
    controllers: [PaymentsController],
    providers: [PaymentsService, MomoStrategy],
    exports: [PaymentsService],
})
export class PaymentsModule {}

