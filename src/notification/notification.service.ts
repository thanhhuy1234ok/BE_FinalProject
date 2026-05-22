// src/notification/notification.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { Notification } from './entities/notification.entity';
import { RealtimeGateway } from '@/realtime/realtime.gateway';
import { SOCKET_EVENTS } from '@/helpers/enum/enum.global';

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepo: Repository<Notification>,

        private readonly realtimeGateway: RealtimeGateway,
    ) {}

    // 🔥 GỬI 1 USER
    async sendToUser(
        userId: string,
        data: {
            title: string;
            content: string;
            type?: string;
            referenceId?: number | null;
            referenceType?: string | null;
        },
    ) {
        if (!userId) {
            console.log('❌ Notification thiếu userId');
            return null;
        }

        const notification = await this.notificationRepo.save({
            userId,
            title: data.title,
            content: data.content,
            type: data.type || 'INFO',
            referenceId: data.referenceId ?? null,
            referenceType: data.referenceType ?? null,
            createdAt: new Date(),
        });

        console.log('🔔 Saved notification:', notification.id);
        console.log('🚀 Emit to room:', `user:${userId}`);

        this.realtimeGateway.sendToUser(
            userId,
            SOCKET_EVENTS.NOTIFICATION_NEW,
            notification,
        );

        return notification;
    }

    // 🔥 GỬI NHIỀU USER (admin, teacher...)
    async sendToUsers(
        userIds: string[],
        data: {
            title: string;
            content: string;
            type?: string;
            referenceId?: number | null;
            referenceType?: string | null;
        },
    ) {
        return Promise.all(
            userIds.map((userId) => this.sendToUser(userId, data)),
        );
    }

    // 🔥 LẤY LIST
    async getMyNotifications(userId: string) {
        return this.notificationRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    // 🔥 ĐÁNH DẤU ĐÃ ĐỌC
    async markAsRead(userId: string, id: number) {
        await this.notificationRepo.update({ id, userId }, { isRead: true });

        return { message: 'Đã đọc thông báo' };
    }

    // 🔥 MARK ALL
    async markAllAsRead(userId: string) {
        await this.notificationRepo.update(
            { userId, isRead: false },
            { isRead: true },
        );

        return { message: 'Đã đọc tất cả' };
    }
    async deleteUnreadDocumentNotificationsByFile(data: {
        courseOfferingId: number;
        fileName: string;
    }) {
        const notifications = await this.notificationRepo.find({
            where: {
                type: 'DOCUMENT',
                referenceType: 'COURSE_OFFERING',
                referenceId: data.courseOfferingId,
                isRead: false,
                content: Like(`%${data.fileName}%`),
            },
            select: {
                id: true,
                userId: true,
            },
        });

        console.log('FOUND NOTIFICATIONS:', notifications);

        if (!notifications.length) {
            return {
                message: 'Không có thông báo cần xóa',
            };
        }

        const notificationIds = notifications.map((item) => item.id);

        await this.notificationRepo.delete(notificationIds);

        notifications.forEach((notification) => {
            this.realtimeGateway.sendToUser(
                notification.userId,
                'notification:deleted',
                {
                    id: notification.id,
                },
            );
        });

        return {
            message: 'Xóa thông báo tài liệu chưa đọc thành công',
        };
    }
}
