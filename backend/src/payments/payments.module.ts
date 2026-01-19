import { Module, forwardRef } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PaymentsService } from './payments.service'
import { PaymentsController } from './payments.controller'
import { StripeStrategy } from './strategies/stripe.strategy'
import { OrdersModule } from '../orders/orders.module'

@Module({
    imports: [ConfigModule, forwardRef(() => OrdersModule)],
    controllers: [PaymentsController],
    providers: [PaymentsService, StripeStrategy],
    exports: [PaymentsService],
})
export class PaymentsModule {}

