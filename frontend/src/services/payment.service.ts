/**
 * Payment Service - Customer payment operations
 * Handles Stripe checkout and payment status tracking
 */

import { apiClient } from './api'
import { PaymentMethod } from '@aerodine/shared-types'

export const paymentService = {
    /**
     * Create Stripe checkout session for customer payment
     */
    async createStripeCheckout(orderId: number): Promise<{ url: string; sessionId: string }> {
        const baseUrl = window.location.origin
        const response = await apiClient.post(`/orders/${orderId}/checkout`, {
            successUrl: `${baseUrl}/customer/payment/success?order_id=${orderId}`,
            cancelUrl: `${baseUrl}/customer/payment/cancel?order_id=${orderId}`,
        })
        return response.data
    },

    /**
     * Create payment using payments service
     * (Alternative method using /payments/create endpoint)
     */
    async createPayment(orderId: number, method: PaymentMethod): Promise<{
        payUrl: string
        paymentId: number
        orderId: number
    }> {
        const response = await apiClient.post('/payments/create', {
            orderId,
            method,
        })
        return response.data
    },

    /**
     * Get payment info by order ID
     */
    async getPaymentByOrderId(orderId: number): Promise<any> {
        const response = await apiClient.get(`/payments/order/${orderId}`)
        return response.data
    },

    /**
     * Request cash payment (notify staff)
     * Customer requests cash payment, waiter will confirm
     */
    async requestCashPayment(orderId: number): Promise<any> {
        // This will emit a socket event to notify waiters
        // Cash payment must be confirmed by staff for security
        const response = await apiClient.post(`/orders/${orderId}/bill`)
        return response.data
    },
}

export default paymentService
