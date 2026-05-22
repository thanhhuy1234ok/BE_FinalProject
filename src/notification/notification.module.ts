import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { RealtimeModule } from '@/realtime/realtime.module';

@Module({
    controllers: [NotificationController],
    providers: [NotificationService],
    imports: [TypeOrmModule.forFeature([Notification]), RealtimeModule],
    exports: [NotificationService],
})
export class NotificationModule {}
