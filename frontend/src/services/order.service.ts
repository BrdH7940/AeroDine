/**
 * Order Service - API calls for order management
 *
 * @author Dev 2 - Operations Team
 */

import { apiClient } from './api'
import { OrderStatus } from '@aerodine/shared-types'
import type {
    CreateOrderDto,
    AddItemsToOrderDto,
    Order,
    OrderWithDetails,
    OrderListResponse,
    KitchenOrderCard,
} from '@aerodine/shared-types'

// ============================================================================
// ORDER CRUD
// ============================================================================

export const orderService = {
    /**
     * Create a new order
     */
    async createOrder(data: CreateOrderDto): Promise<Order> {
        const response = await apiClient.post('/orders', data)
        return response.data
    },

    /**
     * Get all orders with filters
     */
    async getOrders(params?: {
        restaurantId?: number
        tableId?: number
        waiterId?: number
        status?: OrderStatus | OrderStatus[]
        fromDate?: string
        toDate?: string
        page?: number
        pageSize?: number
    }): Promise<OrderListResponse> {
        const response = await apiClient.get('/orders', { params })
        return response.data
    },

    /**
     * Get single order by ID
     */
    async getOrder(id: number): Promise<OrderWithDetails> {
        const response = await apiClient.get(`/orders/${id}`)
        return response.data
    },

    /**
     * Update order
     */
    async updateOrder(
        id: number,
        data: Partial<{ status: OrderStatus; waiterId: number; note: string }>,
    ): Promise<Order> {
        const response = await apiClient.patch(`/orders/${id}`, data)
        return response.data
    },

    /**
     * Cancel order
     */
    async cancelOrder(id: number, reason?: string): Promise<Order> {
        const response = await apiClient.delete(`/orders/${id}`, {
            params: { reason },
        })
        return response.data
    },

    /**
     * Add items to existing order
     */
    async addItemsToOrder(id: number, data: AddItemsToOrderDto): Promise<Order> {
        const response = await apiClient.post(`/orders/${id}/items`, data)
        return response.data
    },

    // ========================================================================
    // CUSTOMER PUBLIC OPERATIONS (No authentication required)
    // ========================================================================

    /**
     * Get orders by table ID (PUBLIC - for guest customers)
     * No authentication required
     * Backend automatically filters unpaid/uncompleted orders
     */
    async getOrdersByTable(tableId: number, excludeCancelled: boolean = true): Promise<Order[]> {
        const response = await apiClient.get(`/orders/table/${tableId}`, {
            params: { excludeCancelled: excludeCancelled ? 'true' : 'false' }
        })
        // Backend returns { orders: [...], total }
        return response.data?.orders || []
    },

    /**
     * Get single order by ID (PUBLIC - for guest customers)
     * No authentication required
     */
    async getPublicOrder(id: number): Promise<OrderWithDetails> {
        const response = await apiClient.get(`/orders/public/${id}`)
        return response.data
    },

    // ========================================================================
    // WAITER OPERATIONS
    // ========================================================================

    /**
     * Get pending orders for waiter
     */
    async getPendingOrders(restaurantId: number): Promise<Order[]> {
        const response = await apiClient.get('/orders/waiter/pending', {
            params: { restaurantId },
        })
        return response.data
    },

    /**
     * Assign waiter to order
     */
    async assignWaiter(orderId: number, waiterId: number): Promise<Order> {
        const response = await apiClient.post(`/orders/${orderId}/assign`, { waiterId })
        return response.data
    },

    /**
     * Accept order
     */
    async acceptOrder(orderId: number, waiterId: number, mergeWithOrderId?: number): Promise<any> {
        const response = await apiClient.post(`/orders/${orderId}/accept`, { 
            waiterId,
            mergeWithOrderId 
        })
        return response.data
    },

    /**
     * Reject order
     */
    async rejectOrder(
        orderId: number,
        waiterId: number,
        reason?: string,
    ): Promise<Order> {
        const response = await apiClient.post(`/orders/${orderId}/reject`, {
            waiterId,
            reason,
        })
        return response.data
    },

    /**
     * Mark order as served
     */
    async markOrderServed(orderId: number): Promise<Order> {
        const response = await apiClient.post(`/orders/${orderId}/serve`)
        return response.data
    },

    /**
     * Process cash payment for order
     */
    async processCashPayment(orderId: number): Promise<Order> {
        const response = await apiClient.post(`/orders/${orderId}/pay-cash`)
        return response.data
    },

    /**
     * Create Stripe checkout session for card payment
     */
    async createStripeCheckout(orderId: number): Promise<{ url: string; sessionId: string }> {
        const baseUrl = window.location.origin
        const response = await apiClient.post(`/orders/${orderId}/checkout`, {
            successUrl: `${baseUrl}/waiter/payment/success?order_id=${orderId}`,
            cancelUrl: `${baseUrl}/waiter/payment/cancel?order_id=${orderId}`,
        })
        return response.data
    },

    // ========================================================================
    // KITCHEN OPERATIONS
    // ========================================================================

    /**
     * Get orders for Kitchen Display System
     */
    async getKitchenOrders(restaurantId: number): Promise<KitchenOrderCard[]> {
        const response = await apiClient.get('/orders/kitchen/display', {
            params: { restaurantId },
        })
        return response.data
    },

    /**
     * Update order item status
     */
    async updateItemStatus(
        itemId: number,
        status: 'QUEUED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED',
    ): Promise<any> {
        const response = await apiClient.patch(`/orders/items/${itemId}/status`, {
            status,
        })
        return response.data
    },

    /**
     * Start preparing item
     */
    async startPreparingItem(itemId: number): Promise<any> {
        const response = await apiClient.post(`/orders/items/${itemId}/start`)
        return response.data
    },

    /**
     * Mark item as ready
     */
    async markItemReady(itemId: number): Promise<any> {
        const response = await apiClient.post(`/orders/items/${itemId}/ready`)
        return response.data
    },

    // ========================================================================
    // BILL OPERATIONS
    // ========================================================================

    /**
     * Request bill
     */
    async requestBill(orderId: number): Promise<any> {
        const response = await apiClient.post(`/orders/${orderId}/bill`)
        return response.data
    },
}

export default orderService
