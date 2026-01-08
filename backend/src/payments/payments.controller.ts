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

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
    private readonly logger = new Logger(PaymentsController.name)

    constructor(private readonly paymentsService: PaymentsService) {}

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
        summary: 'Stripe Webhook callback (Public)',
        description:
            'Webhook endpoint for Stripe. This is called by Stripe server after payment. No authentication required. Requires raw body for signature verification.',
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
            `Received Stripe webhook with signature: ${signature?.substring(0, 20)}...`
        )

        if (!signature) {
            this.logger.warn('Stripe webhook signature missing')
            throw new Error('Missing stripe-signature header')
        }

        // Get raw body (must be Buffer or string)
        const rawBody = req.rawBody

        if (!rawBody) {
            this.logger.error('Raw body not available for Stripe webhook')
            throw new Error('Raw body required for Stripe webhook verification')
        }

        try {
            // Convert rawBody to string if it's a Buffer
            const payload =
                typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8')

            await this.paymentsService.handleStripeIPN(payload, signature)

            return { received: true }
        } catch (error) {
            this.logger.error(
                `Error handling Stripe webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
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
        // FROZEN: MoMo temporarily disabled
        this.logger.warn(
            `MoMo IPN callback received but MoMo is frozen: ${JSON.stringify(payload)}`
        )

        // Log for debugging but don't process
        // Return 204 to avoid MoMo retries
        return null

        // Original implementation (commented out):
        // try {
        //     await this.paymentsService.handleIPN(
        //         PaymentMethod.QR_CODE,
        //         payload
        //     )
        //     return null
        // } catch (error) {
        //     this.logger.error(
        //         `Error handling MoMo IPN: ${error instanceof Error ? error.message : 'Unknown error'}`
        //     )
        //     return null
        // }
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

