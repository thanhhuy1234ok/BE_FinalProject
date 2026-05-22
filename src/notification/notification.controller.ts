import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { User } from '@/helpers/decorator/customize';
import type { IUser } from '@/helpers/types/user.interface';

@Controller('notification')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get('my')
    getMyNotifications(@User() req: IUser) {
        return this.notificationService.getMyNotifications(req.id);
    }

    @Patch('read-all')
    async markAllAsRead(@User() req: IUser) {
        return this.notificationService.markAllAsRead(req.id);
    }

    @Patch(':id/read')
    markAsRead(@User() req: IUser, @Param('id') id: string) {
        return this.notificationService.markAsRead(req.id, +id);
    }

    @Post('test/:userId')
    test(@Param('userId') userId: string) {
        return this.notificationService.sendToUser(userId, {
            title: 'Test realtime',
            content: 'Socket notification chạy rồi',
            type: 'TEST',
        });
    }
}
