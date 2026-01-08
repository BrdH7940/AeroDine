import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PaymentsService } from './payments.service'
import { PaymentsController } from './payments.controller'
// import { MomoStrategy } from './strategies/momo.strategy' // FROZEN: MoMo temporarily disabled
import { StripeStrategy } from './strategies/stripe.strategy'

@Module({
    imports: [ConfigModule],
    controllers: [PaymentsController],
    providers: [
        PaymentsService,
        StripeStrategy,
        // MomoStrategy, // FROZEN: MoMo temporarily disabled - uncomment when credentials are available
    ],
    exports: [PaymentsService],
})
export class PaymentsModule {}

