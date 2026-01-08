import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IPaymentStrategy } from './payment.strategy.interface'
import { Payment, Order } from '@prisma/client'
import Stripe from 'stripe'

/**
 * Stripe Payment Gateway Strategy Implementation
 * Supports Stripe Checkout for card payments
 */
@Injectable()
export class StripeStrategy implements IPaymentStrategy {
    private readonly logger = new Logger(StripeStrategy.name)
    private readonly stripe: Stripe
    private readonly webhookSecret: string
    private readonly frontendUrl: string

    constructor(private readonly configService: ConfigService) {
        const secretKey = this.configService.get<string>('stripe.secretKey')
        this.webhookSecret =
            this.configService.get<string>('stripe.webhookSecret') || ''
        this.frontendUrl =
            this.configService.get<string>('frontend.url') ||
            'http://localhost:5173'

        if (!secretKey) {
            this.logger.warn('Stripe secret key not configured')
        }

        this.stripe = new Stripe(secretKey || '', {
            apiVersion: '2025-12-15.clover',
        })
    }

    /**
     * Create payment transaction with Stripe Checkout
     */
    async createTransaction(
        order: Order & { payment?: Payment | null }
    ): Promise<{
        payUrl: string
        orderId: string
        requestId: string
    }> {
        if (!this.configService.get<string>('stripe.secretKey')) {
            throw new BadRequestException('Stripe secret key not configured')
        }

        // Fetch order with items to get line items
        // Note: This assumes the order was passed with items relation
        // If not, we'll need to fetch it separately
        const orderId = order.id.toString()
        const requestId = `stripe-${orderId}-${Date.now()}`

        // Convert amount to cents (Stripe uses smallest currency unit)
        // VND doesn't use cents, so we'll use the amount as-is
        // For USD, multiply by 100
        const amount = Math.round(Number(order.totalAmount))

        // Determine currency (VND or USD)
        // For now, using VND - can be made configurable
        const currency = 'vnd' // or 'usd'

        try {
            // Create Stripe Checkout Session
            const session = await this.stripe.checkout.sessions.create({
                mode: 'payment',
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: currency,
                            product_data: {
                                name: `Order #${orderId}`,
                                description: `Order for ${order.guestCount} guest(s)`,
                            },
                            unit_amount: amount, // Already in smallest currency unit
                        },
                        quantity: 1,
                    },
                ],
                metadata: {
                    orderId: orderId,
                    requestId: requestId,
                },
                success_url: `${this.frontendUrl}/order/status?success=true`,
                cancel_url: `${this.frontendUrl}/order/status?canceled=true`,
                customer_email: undefined, // Can be added if order has customer email
            })

            this.logger.log(
                `Stripe checkout session created for order ${orderId}: ${session.id}`
            )

            if (!session.url) {
                throw new BadRequestException(
                    'Failed to create Stripe checkout session URL'
                )
            }

            return {
                payUrl: session.url,
                orderId: orderId,
                requestId: requestId,
            }
        } catch (error) {
            this.logger.error(
                `Error creating Stripe payment: ${error instanceof Error ? error.message : 'Unknown error'}`
            )

            if (error instanceof Stripe.errors.StripeError) {
                throw new BadRequestException(
                    `Stripe error: ${error.message}`
                )
            }

            throw new BadRequestException(
                `Failed to create Stripe payment: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }
    }

    /**
     * Verify Stripe webhook event
     */
    async verifyIPN(
        payload: string | Buffer | any,
        signature?: string
    ): Promise<{
        success: boolean
        orderId: number
        transactionId: string
        amount?: number
    }> {
        this.logger.log(
            `Received Stripe webhook: ${typeof payload === 'string' ? payload.substring(0, 100) : JSON.stringify(payload)}`
        )

        if (!this.webhookSecret) {
            this.logger.warn('Stripe webhook secret not configured')
            return {
                success: false,
                orderId: 0,
                transactionId: '',
            }
        }

        if (!signature) {
            this.logger.warn('Stripe webhook signature missing')
            return {
                success: false,
                orderId: 0,
                transactionId: '',
            }
        }

        try {
            // Convert payload to Buffer if it's a string
            const payloadBuffer =
                typeof payload === 'string'
                    ? Buffer.from(payload, 'utf-8')
                    : payload instanceof Buffer
                      ? payload
                      : Buffer.from(JSON.stringify(payload), 'utf-8')

            // Verify webhook signature
            const event = this.stripe.webhooks.constructEvent(
                payloadBuffer,
                signature,
                this.webhookSecret
            )

            this.logger.log(`Stripe webhook event type: ${event.type}`)

            // Handle checkout.session.completed event
            if (event.type === 'checkout.session.completed') {
                const session = event.data.object as Stripe.Checkout.Session

                // Get orderId from metadata
                const orderId = session.metadata?.orderId
                if (!orderId) {
                    this.logger.error(
                        'Order ID not found in Stripe session metadata'
                    )
                    return {
                        success: false,
                        orderId: 0,
                        transactionId: session.id,
                    }
                }

                // Check if payment was successful
                if (session.payment_status === 'paid') {
                    this.logger.log(
                        `Stripe payment successful for order ${orderId}, session: ${session.id}`
                    )

                    return {
                        success: true,
                        orderId: parseInt(orderId),
                        transactionId: session.id,
                        amount: session.amount_total
                            ? session.amount_total / 100
                            : undefined, // Convert from cents
                    }
                } else {
                    this.logger.warn(
                        `Stripe payment not paid for order ${orderId}, status: ${session.payment_status}`
                    )
                    return {
                        success: false,
                        orderId: parseInt(orderId),
                        transactionId: session.id,
                    }
                }
            } else {
                this.logger.log(
                    `Stripe webhook event type ${event.type} ignored`
                )
                return {
                    success: false,
                    orderId: 0,
                    transactionId: '',
                }
            }
        } catch (error) {
            this.logger.error(
                `Error verifying Stripe webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
            )

            if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
                this.logger.warn('Stripe webhook signature verification failed')
            }

            return {
                success: false,
                orderId: 0,
                transactionId: '',
            }
        }
    }
}

