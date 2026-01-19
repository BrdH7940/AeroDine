import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    HttpCode,
    HttpStatus,
    Logger,
    Req,
    RawBodyRequest,
    Inject,
    forwardRef,
} from '@nestjs/common'
import { Request } from 'express'
import { PaymentsService } from './payments.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody,
    ApiHeader,
} from '@nestjs/swagger'
import { PaymentMethod } from '@aerodine/shared-types'
import { OrdersService } from '../orders/orders.service'

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
    private readonly logger = new Logger(PaymentsController.name)

    constructor(
        private readonly paymentsService: PaymentsService,
        @Inject(forwardRef(() => OrdersService))
        private readonly ordersService: OrdersService
    ) {}

    @Post('create')
    @ApiOperation({
        summary: 'Create payment transaction',
        description:
            'Creates a payment transaction for an order and returns the payment URL. Supports Stripe (CARD/QR_CODE/E_WALLET).',
    })
    @ApiResponse({
        status: 201,
        description: 'Payment created successfully',
        schema: {
            example: {
                payUrl: 'https://checkout.stripe.com/...',
                paymentId: 1,
                orderId: 1,
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request (invalid order, payment already exists, etc.)',
    })
    @ApiResponse({
        status: 404,
        description: 'Order not found',
    })
    async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
        return this.paymentsService.createPayment(
            createPaymentDto.orderId,
            createPaymentDto.method
        )
    }

    @Post('callback/stripe')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Stripe Webhook callback (Public) - Redirects to orders webhook',
        description:
            'Webhook endpoint for Stripe. This endpoint redirects to the orders webhook handler which includes full order completion logic (socket events, table reset, etc.). No authentication required. Requires raw body for signature verification.',
    })
    @ApiHeader({
        name: 'stripe-signature',
        description: 'Stripe webhook signature',
        required: true,
    })
    @ApiResponse({
        status: 200,
        description: 'Webhook processed successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid webhook payload or signature',
    })
    async handleStripeCallback(
        @Req() req: RawBodyRequest<Request>
    ): Promise<{ received: boolean }> {
        const signature = req.headers['stripe-signature'] as string

        // Log webhook request for debugging
        this.logger.log(
            `🔔 Received Stripe webhook at /payments/callback/stripe`
        )
        this.logger.log(`Headers: ${JSON.stringify(Object.keys(req.headers))}`)
        this.logger.log(`Raw body type: ${typeof req.rawBody}, length: ${req.rawBody ? (req.rawBody as Buffer).length : 0}`)

        if (!signature) {
            this.logger.error('❌ Stripe webhook signature missing')
            throw new Error('Missing stripe-signature header')
        }

        // Get raw body (must be Buffer or string)
        const rawBody = req.rawBody

        if (!rawBody) {
            this.logger.error('❌ Raw body not available for Stripe webhook')
            this.logger.error('Make sure rawBody: true is set in NestFactory.create()')
            throw new Error('Raw body required for Stripe webhook verification')
        }

        // Convert to Buffer if it's a string
        const bodyBuffer = typeof rawBody === 'string' 
            ? Buffer.from(rawBody, 'utf-8')
            : rawBody as Buffer

        try {
            // Redirect to orders webhook handler which has full logic
            // (socket events, table reset, etc.)
            this.logger.log('Forwarding to orders webhook handler...')
            const result = await this.ordersService.handleStripeWebhook(
                signature,
                bodyBuffer
            )
            this.logger.log('✅ Webhook processed successfully')
            return result
        } catch (error) {
            this.logger.error(
                `❌ Error handling Stripe webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            if (error instanceof Error) {
                this.logger.error(`Error stack: ${error.stack}`)
            }
            throw error
        }
    }

    @Post('callback/momo')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'MoMo IPN callback (Public - FROZEN)',
        description:
            'Instant Payment Notification endpoint for MoMo. Currently frozen. This is called by MoMo server after payment. No authentication required.',
    })
    @ApiBody({
        description: 'MoMo IPN payload',
        schema: {
            type: 'object',
            properties: {
                partnerCode: { type: 'string' },
                orderId: { type: 'string' },
                requestId: { type: 'string' },
                amount: { type: 'number' },
                orderInfo: { type: 'string' },
                orderType: { type: 'string' },
                transId: { type: 'string' },
                resultCode: { type: 'number' },
                message: { type: 'string' },
                payType: { type: 'string' },
                responseTime: { type: 'number' },
                extraData: { type: 'string' },
                signature: { type: 'string' },
            },
        },
    })
    @ApiResponse({
        status: 204,
        description: 'IPN processed successfully (no content)',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid IPN payload',
    })
    async handleMomoCallback(@Body() payload: any) {
        // MoMo temporarily disabled
        this.logger.warn(
            `MoMo IPN callback received but MoMo is disabled: ${JSON.stringify(payload)}`
        )
        return null
    }

    @Get('order/:orderId')
    @ApiOperation({
        summary: 'Get payment by order ID',
        description: 'Retrieves payment information for a specific order',
    })
    @ApiParam({ name: 'orderId', type: Number, description: 'Order ID' })
    @ApiResponse({
        status: 200,
        description: 'Payment information',
    })
    @ApiResponse({
        status: 404,
        description: 'Payment not found',
    })
    async getPaymentByOrderId(@Param('orderId') orderId: string) {
        return this.paymentsService.getPaymentByOrderId(Number(orderId))
    }
}

