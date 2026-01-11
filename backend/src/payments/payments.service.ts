import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { IPaymentStrategy } from './strategies/payment.strategy.interface'
import { StripeStrategy } from './strategies/stripe.strategy'
import {
    PaymentMethod,
    PaymentStatus,
    OrderStatus,
} from '@aerodine/shared-types'

/**
 * Payment Service (Context in Strategy Pattern)
 * Manages different payment gateway strategies
 */
@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name)
    private readonly strategies: Map<PaymentMethod, IPaymentStrategy>

    constructor(
        private readonly prisma: PrismaService,
        private readonly stripeStrategy: StripeStrategy
    ) {
        // Initialize strategies map
        this.strategies = new Map()

        // Map CARD to Stripe
        this.strategies.set(PaymentMethod.CARD, this.stripeStrategy)

        // Temporarily map QR_CODE and E_WALLET to Stripe for testing
        this.strategies.set(PaymentMethod.QR_CODE, this.stripeStrategy)
        this.strategies.set(PaymentMethod.E_WALLET, this.stripeStrategy)
    }

    /**
     * Create payment and return payment URL
     */
    async createPayment(orderId: number, method: PaymentMethod) {
        // Verify order exists
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                payment: true,
            },
        })

        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found`)
        }

        // Check if payment already exists
        if (order.payment) {
            if (order.payment.status === PaymentStatus.SUCCESS) {
                throw new BadRequestException(
                    'Order has already been paid successfully'
                )
            }
            if (order.payment.status === PaymentStatus.PENDING) {
                throw new BadRequestException(
                    'Payment is already pending for this order'
                )
            }
        }

        // Get strategy for payment method
        const strategy = this.strategies.get(method)
        if (!strategy) {
            throw new BadRequestException(
                `Payment method ${method} is not supported`
            )
        }

        // Create payment record (if not exists)
        let payment = order.payment
        if (!payment) {
            payment = await this.prisma.payment.create({
                data: {
                    orderId: order.id,
                    amount: order.totalAmount,
                    method: method,
                    status: PaymentStatus.PENDING,
                },
            })
        } else {
            // Update existing payment
            payment = await this.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    method: method,
                    status: PaymentStatus.PENDING,
                },
            })
        }

        // Create transaction using strategy
        const orderWithPayment = {
            ...order,
            payment,
        }

        const transactionResult =
            await strategy.createTransaction(orderWithPayment)

        this.logger.log(
            `Payment created for order ${orderId}: ${transactionResult.payUrl}`
        )

        return {
            payUrl: transactionResult.payUrl,
            paymentId: payment.id,
            orderId: order.id,
        }
    }

    /**
     * Handle Stripe webhook IPN
     */
    async handleStripeIPN(
        payload: string | Buffer,
        signature: string
    ): Promise<{ success: boolean }> {
        const strategy = this.strategies.get(PaymentMethod.CARD)
        if (!strategy || !(strategy instanceof StripeStrategy)) {
            this.logger.error('Stripe strategy not found')
            return { success: false }
        }

        // Verify IPN with signature
        const verificationResult = await strategy.verifyIPN(payload, signature)

        if (!verificationResult.success) {
            this.logger.warn(
                `Stripe webhook verification failed for order ${verificationResult.orderId}`
            )
            return { success: false }
        }

        return this.updatePaymentStatus(verificationResult)
    }

    /**
     * Handle IPN callback from payment gateway
     */
    async handleIPN(
        method: PaymentMethod,
        payload: any
    ): Promise<{ success: boolean }> {
        this.logger.log(
            `Handling IPN callback for method ${method}: ${JSON.stringify(payload)}`
        )

        const strategy = this.strategies.get(method)
        if (!strategy) {
            this.logger.error(`No strategy found for payment method ${method}`)
            return { success: false }
        }

        // Verify IPN
        const verificationResult = await strategy.verifyIPN(payload)

        if (!verificationResult.success) {
            this.logger.warn(
                `IPN verification failed for order ${verificationResult.orderId}`
            )
            return { success: false }
        }

        return this.updatePaymentStatus(verificationResult)
    }

    /**
     * Update payment status after successful IPN verification
     */
    private async updatePaymentStatus(verificationResult: {
        success: boolean
        orderId: number
        transactionId: string
        amount?: number
    }): Promise<{ success: boolean }> {
        // Update payment status
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { orderId: verificationResult.orderId },
                include: { order: true },
            })

            if (!payment) {
                this.logger.error(
                    `Payment not found for order ${verificationResult.orderId}`
                )
                return { success: false }
            }

            // Update payment status and external transaction ID
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.SUCCESS,
                    externalTransactionId: verificationResult.transactionId,
                },
            })

            // Update order status to COMPLETED if payment successful
            await this.prisma.order.update({
                where: { id: verificationResult.orderId },
                data: {
                    status: OrderStatus.COMPLETED,
                },
            })

            this.logger.log(
                `Payment successful for order ${verificationResult.orderId}, transaction: ${verificationResult.transactionId}`
            )

            return { success: true }
        } catch (error) {
            this.logger.error(
                `Error updating payment status: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return { success: false }
        }
    }

    /**
     * Get payment by order ID
     */
    async getPaymentByOrderId(orderId: number) {
        const payment = await this.prisma.payment.findUnique({
            where: { orderId },
            include: {
                order: {
                    include: {
                        restaurant: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        table: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        })

        if (!payment) {
            throw new NotFoundException(
                `Payment not found for order ${orderId}`
            )
        }

        return payment
    }
}
