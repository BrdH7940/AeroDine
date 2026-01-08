import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { SocketService } from './socket.service'
import { SocketEvents } from '@aerodine/shared-types'
import type {
    JoinRestaurantPayload,
    JoinTablePayload,
    JoinKitchenPayload,
    JoinWaiterPayload,
    NewOrderPayload,
    AddItemsToOrderPayload,
    RequestBillPayload,
} from '@aerodine/shared-types'

/**
 * Socket Gateway - WebSocket entry point
 * Handles client connections and room management
 *
 * @author Dev 2 - Operations Team
 */
@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    },
    namespace: '/',
})
export class SocketGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server

    private readonly logger = new Logger(SocketGateway.name)

    constructor(private readonly socketService: SocketService) {}

    // ========================================================================
    // LIFECYCLE HOOKS
    // ========================================================================

    afterInit(server: Server) {
        this.socketService.setServer(server)
        this.logger.log('WebSocket Gateway initialized')
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`)
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`)
    }

    // ========================================================================
    // ROOM MANAGEMENT
    // ========================================================================

    @SubscribeMessage(SocketEvents.JOIN_RESTAURANT)
    handleJoinRestaurant(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: JoinRestaurantPayload,
    ) {
        const room = `restaurant:${payload.restaurantId}`
        client.join(room)
        this.logger.log(
            `Client ${client.id} joined restaurant ${payload.restaurantId}`,
        )
        return { success: true, room }
    }

    @SubscribeMessage(SocketEvents.LEAVE_RESTAURANT)
    handleLeaveRestaurant(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { restaurantId: number },
    ) {
        const room = `restaurant:${payload.restaurantId}`
        client.leave(room)
        this.logger.log(
            `Client ${client.id} left restaurant ${payload.restaurantId}`,
        )
        return { success: true }
    }

    @SubscribeMessage(SocketEvents.JOIN_TABLE)
    handleJoinTable(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: JoinTablePayload,
    ) {
        // TODO: Verify table token before joining
        const room = `table:${payload.tableId}`
        client.join(room)
        this.logger.log(`Client ${client.id} joined table ${payload.tableId}`)
        return { success: true, room }
    }

    @SubscribeMessage(SocketEvents.LEAVE_TABLE)
    handleLeaveTable(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { tableId: number },
    ) {
        const room = `table:${payload.tableId}`
        client.leave(room)
        this.logger.log(`Client ${client.id} left table ${payload.tableId}`)
        return { success: true }
    }

    @SubscribeMessage(SocketEvents.JOIN_KITCHEN)
    handleJoinKitchen(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: JoinKitchenPayload,
    ) {
        // TODO: Verify user is kitchen staff
        const room = `kitchen:${payload.restaurantId}`
        client.join(room)
        this.logger.log(
            `Kitchen staff ${payload.userId} joined kitchen room for restaurant ${payload.restaurantId}`,
        )
        return { success: true, room }
    }

    @SubscribeMessage(SocketEvents.JOIN_WAITER)
    handleJoinWaiter(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: JoinWaiterPayload,
    ) {
        // TODO: Verify user is waiter
        const room = `waiter:${payload.restaurantId}`
        client.join(room)
        this.logger.log(
            `Waiter ${payload.userId} joined waiter room for restaurant ${payload.restaurantId}`,
        )
        return { success: true, room }
    }

    // ========================================================================
    // ORDER EVENTS (These will be handled by OrdersService and emit via SocketService)
    // These handlers are placeholders - actual logic is in OrdersService
    // ========================================================================

    @SubscribeMessage(SocketEvents.NEW_ORDER)
    handleNewOrder(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: NewOrderPayload,
    ) {
        this.logger.log(`New order received from table ${payload.tableId}`)
        // This will be processed by OrdersController
        // The socket event is just for real-time notification
        // Return acknowledgment
        return { success: true, message: 'Order received, processing...' }
    }

    @SubscribeMessage(SocketEvents.ADD_ITEMS_TO_ORDER)
    handleAddItemsToOrder(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: AddItemsToOrderPayload,
    ) {
        this.logger.log(`Adding items to order ${payload.orderId}`)
        return { success: true, message: 'Items received, processing...' }
    }

    @SubscribeMessage(SocketEvents.CANCEL_ORDER)
    handleCancelOrder(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { orderId: number; reason?: string },
    ) {
        this.logger.log(`Cancel request for order ${payload.orderId}`)
        return { success: true, message: 'Cancel request received' }
    }

    @SubscribeMessage(SocketEvents.REQUEST_BILL)
    handleRequestBill(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: RequestBillPayload,
    ) {
        this.logger.log(`Bill requested for order ${payload.orderId}`)
        return { success: true, message: 'Bill request received' }
    }

    // ========================================================================
    // UTILITY
    // ========================================================================

    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() client: Socket) {
        return { event: 'pong', timestamp: new Date().toISOString() }
    }
}

