import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    HttpCode,
    HttpStatus,
    Logger,
} from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody,
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
            'Creates a payment transaction for an order and returns the payment URL. Supports MoMo (QR_CODE/E_WALLET).',
    })
    @ApiResponse({
        status: 201,
        description: 'Payment created successfully',
        schema: {
            example: {
                payUrl: 'https://test-payment.momo.vn/...',
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

    @Post('callback/momo')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'MoMo IPN callback (Public)',
        description:
            'Instant Payment Notification endpoint for MoMo. This is called by MoMo server after payment. No authentication required.',
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
        // Log all IPN requests for debugging
        this.logger.log(
            `Received MoMo IPN callback: ${JSON.stringify(payload)}`
        )

        try {
            await this.paymentsService.handleIPN(
                PaymentMethod.QR_CODE, // MoMo supports both QR_CODE and E_WALLET
                payload
            )

            // Return 204 No Content as per MoMo requirements
            return null
        } catch (error) {
            this.logger.error(
                `Error handling MoMo IPN: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            // Still return 204 to MoMo to avoid retries for invalid requests
            return null
        }
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

