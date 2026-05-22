// src/middleware/base.gateway.ts
import { JwtService } from '@nestjs/jwt';
import { OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SocketAuthMiddleware } from './socket';

export abstract class BaseGateway implements OnGatewayInit {
    constructor(protected readonly jwtService: JwtService) {}

    afterInit(server: Server) {
        console.log('✅ Socket middleware initialized');
        server.use(SocketAuthMiddleware(this.jwtService));
    }
}
