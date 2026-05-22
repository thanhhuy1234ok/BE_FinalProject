// src/common/socket/socket-auth.middleware.ts
import { IUser } from '@/helpers/types/user.interface';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

export const SocketAuthMiddleware =
    (jwtService: JwtService) =>
    async (socket: Socket, next: (err?: Error) => void) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers.authorization
                    ?.toString()
                    .replace('Bearer ', '');

            if (!token) {
                return next(new Error('Thiếu token socket'));
            }

            const payload = await jwtService.verifyAsync(token, {
                secret: process.env.JWT_ACCESS_TOKEN_SECRET,
            });

            socket.data.user = {
                id: payload.id,
                email: payload.email,
                name: payload.name,
                role_id: payload.role_id,
            } satisfies IUser;

            socket.join(`user:${socket.data.user.id}`);

            console.log('✅ Middleware user:', socket.data.user);
            console.log('✅ Middleware join:', `user:${socket.data.user.id}`);
            return next();
        } catch {
            return next(new Error('Token socket không hợp lệ'));
        }
    };
