import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PaymentsService } from './payments.service'
import { PaymentsController } from './payments.controller'
import { StripeStrategy } from './strategies/stripe.strategy'

@Module({
    imports: [ConfigModule],
    controllers: [PaymentsController],
    providers: [PaymentsService, StripeStrategy],
    exports: [PaymentsService],
})
export class PaymentsModule {}

