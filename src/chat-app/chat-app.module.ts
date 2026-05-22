import { Module } from '@nestjs/common';
import { ChatAppService } from './chat-app.service';
import { ChatAppController } from './chat-app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { RealtimeModule } from '@/realtime/realtime.module';
import { FileModule } from '@/file/file.module';

@Module({
    controllers: [ChatAppController],
    providers: [ChatAppService],
    imports: [
        TypeOrmModule.forFeature([
            Conversation,
            Message,
            ConversationMember,
            CourseOffering,
        ]),
        RealtimeModule,
        FileModule,
    ],
    exports: [ChatAppService],
})
export class ChatAppModule {}
