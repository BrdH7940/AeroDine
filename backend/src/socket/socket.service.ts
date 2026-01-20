import { Injectable, Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import {
    SocketEvents,
    OrderCreatedEvent,
    OrderUpdatedEvent,
    OrderStatusChangedEvent,
    OrderItemStatusChangedEvent,
    KitchenOrderEvent,
    NotificationEvent,
    TableStatusEvent,
} from '@aerodine/shared-types'

/**
 * Socket Service - Handles all real-time broadcasting
 * Responsible for emitting events to specific rooms/clients
 *
 * @author Dev 2 - Operations Team
 */
@Injectable()
export class SocketService {
    private readonly logger = new Logger(SocketService.name)
    private server: Server | null = null
    private readonly MAX_RETRIES = 3
    private readonly RETRY_DELAY_MS = 1000 // 1 second

    setServer(server: Server) {
        this.server = server
    }

    /**
     * Emit event with retry logic for critical events
     * Retries up to MAX_RETRIES times with exponential backoff
     */
    private async emitWithRetry(
        room: string,
        event: string,
        data: any,
        retries = this.MAX_RETRIES
    ): Promise<void> {
        if (!this.server) {
            this.logger.warn(`Cannot emit ${event}: server not initialized`)
            return
        }

        try {
            this.server.to(room).emit(event, data)
            this.logger.debug(`Emitted ${event} to ${room}`)
        } catch (error) {
            if (retries > 0) {
                const delay = this.RETRY_DELAY_MS * (this.MAX_RETRIES - retries + 1)
                this.logger.warn(
                    `Failed to emit ${event} to ${room}, retrying in ${delay}ms (${retries} retries left)`,
                    error
                )
                await new Promise((resolve) => setTimeout(resolve, delay))
                return this.emitWithRetry(room, event, data, retries - 1)
            } else {
                this.logger.error(
                    `Failed to emit ${event} to ${room} after ${this.MAX_RETRIES} retries`,
                    error
                )
            }
        }
    }

    // ========================================================================
    // ROOM HELPERS
    // ========================================================================

    private getRestaurantRoom(restaurantId: number): string {
        return `restaurant:${restaurantId}`
    }

    private getTableRoom(tableId: number): string {
        return `table:${tableId}`
    }

    private getKitchenRoom(restaurantId: number): string {
        return `kitchen:${restaurantId}`
    }

    private getWaiterRoom(restaurantId: number): string {
        return `waiter:${restaurantId}`
    }

    // ========================================================================
    // ORDER EVENTS
    // ========================================================================

    /**
     * Broadcast new order to kitchen and waiters
     */
    emitOrderCreated(restaurantId: number, event: OrderCreatedEvent) {
        if (!this.server) return

        this.logger.log(`New order created: ${event.order.id} for table ${event.tableId}`)

        // Notify kitchen
        this.server
            .to(this.getKitchenRoom(restaurantId))
            .emit(SocketEvents.ORDER_CREATED, event)

        // Notify waiters
        this.server
            .to(this.getWaiterRoom(restaurantId))
            .emit(SocketEvents.ORDER_CREATED, event)

        // Notify customer at table
        this.server
            .to(this.getTableRoom(event.tableId))
            .emit(SocketEvents.ORDER_CREATED, event)
    }

    /**
     * Broadcast order update to relevant parties
     */
    emitOrderUpdated(restaurantId: number, tableId: number, event: OrderUpdatedEvent) {
        if (!this.server) return

        this.logger.log(`Order updated: ${event.order.id}`)

        // Notify all in restaurant
        this.server
            .to(this.getRestaurantRoom(restaurantId))
            .emit(SocketEvents.ORDER_UPDATED, event)

        // Notify customer at table
        this.server
            .to(this.getTableRoom(tableId))
            .emit(SocketEvents.ORDER_UPDATED, event)
    }

    /**
     * Broadcast order status change
     * Critical event - uses retry logic
     */
    async emitOrderStatusChanged(
        restaurantId: number,
        tableId: number,
        event: OrderStatusChangedEvent,
    ) {
        if (!this.server) return

        this.logger.log(
            `Order ${event.orderId} status: ${event.previousStatus} -> ${event.newStatus}`,
        )

        // Use retry for critical status changes (especially COMPLETED)
        const isCritical = event.newStatus === 'COMPLETED' || event.newStatus === 'CANCELLED'
        
        if (isCritical) {
            // Critical events use retry logic
            await Promise.all([
                this.emitWithRetry(
                    this.getKitchenRoom(restaurantId),
                    SocketEvents.ORDER_STATUS_CHANGED,
                    event
                ),
                this.emitWithRetry(
                    this.getWaiterRoom(restaurantId),
                    SocketEvents.ORDER_STATUS_CHANGED,
                    event
                ),
                this.emitWithRetry(
                    this.getTableRoom(tableId),
                    SocketEvents.ORDER_STATUS_CHANGED,
                    event
                ),
            ])
        } else {
            // Non-critical events emit normally
            this.server
                .to(this.getKitchenRoom(restaurantId))
                .emit(SocketEvents.ORDER_STATUS_CHANGED, event)

            this.server
                .to(this.getWaiterRoom(restaurantId))
                .emit(SocketEvents.ORDER_STATUS_CHANGED, event)

            this.server
                .to(this.getTableRoom(tableId))
                .emit(SocketEvents.ORDER_STATUS_CHANGED, event)
        }
    }

    /**
     * Broadcast items added to existing order
     */
    emitOrderItemsAdded(restaurantId: number, tableId: number, event: OrderUpdatedEvent) {
        if (!this.server) return

        this.logger.log(`Items added to order: ${event.order.id}`)

        // Notify kitchen
        this.server
            .to(this.getKitchenRoom(restaurantId))
            .emit(SocketEvents.ORDER_ITEMS_ADDED, event)

        // Notify waiters
        this.server
            .to(this.getWaiterRoom(restaurantId))
            .emit(SocketEvents.ORDER_ITEMS_ADDED, event)

        // Notify customer at table
        this.server
            .to(this.getTableRoom(tableId))
            .emit(SocketEvents.ORDER_ITEMS_ADDED, event)
    }

    // ========================================================================
    // ORDER ITEM EVENTS
    // ========================================================================

    /**
     * Broadcast order item status change
     */
    emitOrderItemStatusChanged(
        restaurantId: number,
        tableId: number,
        event: OrderItemStatusChangedEvent,
    ) {
        if (!this.server) return

        this.logger.log(
            `Order item ${event.orderItemId} status: ${event.previousStatus} -> ${event.newStatus}`,
        )

        // Notify kitchen
        this.server
            .to(this.getKitchenRoom(restaurantId))
            .emit(SocketEvents.ORDER_ITEM_STATUS_CHANGED, event)

        // Notify waiters
        this.server
            .to(this.getWaiterRoom(restaurantId))
            .emit(SocketEvents.ORDER_ITEM_STATUS_CHANGED, event)

        // Notify customer at table
        this.server
            .to(this.getTableRoom(tableId))
            .emit(SocketEvents.ORDER_ITEM_STATUS_CHANGED, event)
    }

    /**
     * Broadcast when item is ready (special notification)
     */
    emitOrderItemReady(
        restaurantId: number,
        tableId: number,
        event: OrderItemStatusChangedEvent,
    ) {
        if (!this.server) return

        this.logger.log(`Item ready: ${event.itemName} for order ${event.orderId}`)

        // Notify waiters (they need to serve)
        this.server
            .to(this.getWaiterRoom(restaurantId))
            .emit(SocketEvents.ORDER_ITEM_READY, event)

        // Notify customer at table
        this.server
            .to(this.getTableRoom(tableId))
            .emit(SocketEvents.ORDER_ITEM_READY, event)
    }

    // ========================================================================
    // KITCHEN EVENTS
    // ========================================================================

    /**
     * Send order to kitchen display
     */
    emitKitchenOrderReceived(restaurantId: number, event: KitchenOrderEvent) {
        if (!this.server) return

        this.logger.log(`Kitchen received order: ${event.order.id}`)

        this.server
            .to(this.getKitchenRoom(restaurantId))
            .emit(SocketEvents.KITCHEN_ORDER_RECEIVED, event)
    }

    /**
     * Notify when all items in order are ready
     */
    emitKitchenOrderReady(
        restaurantId: number,
        orderId: number,
        tableName: string,
    ) {
        if (!this.server) return

        this.logger.log(`Kitchen: Order ${orderId} fully ready`)

        // Notify waiters
        this.server
            .to(this.getWaiterRoom(restaurantId))
            .emit(SocketEvents.KITCHEN_ORDER_READY, { orderId, tableName })

        // Could also play sound/alert in kitchen
        this.server
            .to(this.getKitchenRoom(restaurantId))
            .emit(SocketEvents.KITCHEN_ORDER_READY, { orderId, tableName })
    }

    // ========================================================================
    // WAITER EVENTS
    // ========================================================================

    /**
     * Notify when waiter is assigned to order
     */
    emitWaiterAssigned(
        restaurantId: number,
        tableId: number,
        orderId: number,
        waiterId: number,
        waiterName: string,
    ) {
        if (!this.server) return

        // Notify customer
        this.server
            .to(this.getTableRoom(tableId))
            .emit(SocketEvents.WAITER_ASSIGNED, { orderId, waiterId, waiterName })
    }

    /**
     * Notify when order is accepted by waiter
     */
    emitOrderAccepted(
        restaurantId: number,
        tableId: number,
        orderId: number,
        waiterId: number,
    ) {
        if (!this.server) return

        this.logger.log(`Order ${orderId} accepted by waiter ${waiterId}`)

        // Notify kitchen to start
        this.server
            .to(this.getKitchenRoom(restaurantId))
            .emit(SocketEvents.ORDER_ACCEPTED, { orderId, waiterId })

        // Notify customer
        this.server
            .to(this.getTableRoom(tableId))
            .emit(SocketEvents.ORDER_ACCEPTED, { orderId, waiterId })
    }

    /**
     * Notify when order is rejected by waiter
     */
    emitOrderRejected(
        restaurantId: number,
        tableId: number,
        orderId: number,
        reason?: string,
    ) {
        if (!this.server) return

        this.logger.log(`Order ${orderId} rejected: ${reason || 'No reason'}`)

        // Notify customer
        this.server
            .to(this.getTableRoom(tableId))
            .emit(SocketEvents.ORDER_REJECTED, { orderId, reason })
    }

    /**
     * Notify when order is served
     */
    emitOrderServed(restaurantId: number, tableId: number, orderId: number) {
        if (!this.server) return

        this.logger.log(`Order ${orderId} served`)

        // Notify kitchen (so they can update KDS)
        this.server
            .to(this.getKitchenRoom(restaurantId))
            .emit(SocketEvents.ORDER_SERVED, { orderId })

        // Notify waiters
        this.server
            .to(this.getWaiterRoom(restaurantId))
            .emit(SocketEvents.ORDER_SERVED, { orderId })

        // Notify customer
        this.server
            .to(this.getTableRoom(tableId))
            .emit(SocketEvents.ORDER_SERVED, { orderId })
    }

    // ========================================================================
    // TABLE EVENTS
    // ========================================================================

    /**
     * Broadcast table status change
     */
    emitTableStatusChanged(restaurantId: number, event: TableStatusEvent) {
        if (!this.server) return

        this.logger.log(
            `Table ${event.tableId} status: ${event.previousStatus} -> ${event.newStatus}`,
        )

        // Notify all staff in restaurant
        this.server
            .to(this.getRestaurantRoom(restaurantId))
            .emit(SocketEvents.TABLE_STATUS_CHANGED, event)
    }

    /**
     * Notify when customer requests bill
     */
    emitBillRequested(
        restaurantId: number,
        orderId: number,
        tableId: number,
        tableName: string,
    ) {
        if (!this.server) return

        this.logger.log(`Bill requested for table ${tableName}`)

        // Notify waiters
        this.server
            .to(this.getWaiterRoom(restaurantId))
            .emit(SocketEvents.BILL_REQUESTED, { orderId, tableId, tableName })
    }

    // ========================================================================
    // NOTIFICATION EVENTS
    // ========================================================================

    /**
     * Send general notification
     */
    emitNotification(room: string, notification: NotificationEvent) {
        if (!this.server) return

        this.server.to(room).emit(SocketEvents.NOTIFICATION, notification)
    }

    /**
     * Send notification to specific table
     */
    emitTableNotification(tableId: number, notification: NotificationEvent) {
        this.emitNotification(this.getTableRoom(tableId), notification)
    }

    /**
     * Send notification to kitchen
     * Critical notifications use retry logic
     */
    async emitKitchenNotification(restaurantId: number, notification: NotificationEvent) {
        const isCritical = notification.type === 'error' || notification.type === 'warning'
        if (isCritical) {
            await this.emitWithRetry(
                this.getKitchenRoom(restaurantId),
                SocketEvents.NOTIFICATION,
                notification
            )
        } else {
            this.emitNotification(this.getKitchenRoom(restaurantId), notification)
        }
    }

    /**
     * Send notification to waiters
     * Critical notifications use retry logic
     */
    async emitWaiterNotification(restaurantId: number, notification: NotificationEvent) {
        const isCritical = notification.type === 'error' || notification.type === 'success'
        if (isCritical) {
            await this.emitWithRetry(
                this.getWaiterRoom(restaurantId),
                SocketEvents.NOTIFICATION,
                notification
            )
        } else {
            this.emitNotification(this.getWaiterRoom(restaurantId), notification)
        }
    }

    // ========================================================================
    // ERROR HANDLING
    // ========================================================================

    /**
     * Send error to specific client
     */
    emitError(client: Socket, code: string, message: string) {
        client.emit(SocketEvents.ERROR, { code, message })
    }
}
