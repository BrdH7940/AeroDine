import { Payment, Order } from '@prisma/client'

/**
 * Interface for payment gateway strategies
 * Allows easy addition of new payment providers (Stripe, ZaloPay, etc.)
 */
export interface IPaymentStrategy {
    /**
     * Create a payment transaction and return the payment URL
     * @param order - The order to create payment for
     * @returns Promise with payment URL, order ID, and request ID
     */
    createTransaction(
        order: Order & { payment?: Payment | null }
    ): Promise<{
        payUrl: string
        orderId: string
        requestId: string
    }>

    /**
     * Verify IPN (Instant Payment Notification) from payment gateway
     * @param payload - The callback payload from payment gateway
     * @returns Promise with verification result
     */
    verifyIPN(payload: any): Promise<{
        success: boolean
        orderId: number
        transactionId: string
        amount?: number
    }>
}

