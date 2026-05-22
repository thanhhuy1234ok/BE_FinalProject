// src/realtime/realtime.gateway.ts
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { BaseGateway } from '@/middleware/base.gateway';
import { SOCKET_EVENTS } from '@/helpers/enum/enum.global';

@WebSocketGateway({
    cors: {
        origin: 'http://localhost:3000',
        credentials: true,
    },
})
export class RealtimeGateway
    extends BaseGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    constructor(jwtService: JwtService) {
        super(jwtService);
    }

    handleConnection(socket: Socket) {
        const user = socket.data.user;
        const userId = user?.id;

        console.log('✅ Socket connected:', socket.id);
        console.log('👤 Socket user:', user);

        if (!userId) {
            console.log('❌ Socket chưa có userId, không join room');
            return;
        }

        const userRoom = `user:${userId}`;
        const roleRoom = user?.role?.name ? `role:${user.role.name}` : null;

        socket.join(userRoom);

        console.log('🏠 Joined room:', userRoom);

        if (roleRoom) {
            socket.join(roleRoom);
            console.log('🏠 Joined role room:', roleRoom);
        }
    }

    handleDisconnect(socket: Socket) {
        console.log('🔌 Socket disconnected:', socket.id);
    }

    sendToUser(userId: string, event: string, data: any) {
        const room = `user:${userId}`;

        console.log('🚀 Emit:', {
            room,
            event,
            data,
        });

        this.server.to(room).emit(event, data);
    }

    @SubscribeMessage(SOCKET_EVENTS.CONVERSATION_JOIN)
    handleJoinConversation(
        @ConnectedSocket() socket: Socket,
        @MessageBody() data: { conversationId: number },
    ) {
        const room = `conversation:${data.conversationId}`;
        socket.join(room);

        console.log(`✅ ${socket.id} joined ${room}`);

        return {
            success: true,
            room,
        };
    }

    @SubscribeMessage(SOCKET_EVENTS.CONVERSATION_LEAVE)
    handleLeaveConversation(
        @ConnectedSocket() socket: Socket,
        @MessageBody() data: { conversationId: number },
    ) {
        const room = `conversation:${data.conversationId}`;
        socket.leave(room);

        return {
            success: true,
            room,
        };
    }

    emitNewMessage(conversationId: number, payload: any) {
        this.server
            .to(`conversation:${conversationId}`)
            .emit(SOCKET_EVENTS.MESSAGE_NEW, payload);
    }

    emitConversationUpdated(userId: string, payload: any) {
        this.server
            .to(`user:${userId}`)
            .emit(SOCKET_EVENTS.CONVERSATION_UPDATED, payload);
    }
}
