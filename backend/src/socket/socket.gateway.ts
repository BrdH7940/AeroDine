import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets'

@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    },
})
export class SocketGateway {
    @SubscribeMessage('message')
    handleMessage(client: any, payload: any): string {
        return 'Hello world!'
    }
}
