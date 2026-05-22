import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { ChatAppService } from './chat-app.service';
import { CreateChatAppDto } from './dto/create-chat-app.dto';
import { UpdateChatAppDto } from './dto/update-chat-app.dto';
import { User } from '@/helpers/decorator/customize';
import type { IUser } from '@/helpers/types/user.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('chat-app')
export class ChatAppController {
    constructor(private readonly chatAppService: ChatAppService) {}

    @Get('')
    getMyConversations(@User() req: IUser) {
        return this.chatAppService.getMyConversations(req.id);
    }

    @Post('course/:courseOfferingId')
    createCourseConversation(
        @Param('courseOfferingId', ParseIntPipe) courseOfferingId: number,
    ) {
        return this.chatAppService.createCourseConversationIfNotExists(
            courseOfferingId,
        );
    }

    @Post('group')
    createGroupConversation(
        @User() req: IUser,
        @Body()
        body: {
            name: string;
            memberIds: string[];
        },
    ) {
        return this.chatAppService.createGroupConversation(
            req.id,
            body.name,
            body.memberIds || [],
        );
    }

    @Get(':conversationId/messages')
    getMessages(
        @Param('conversationId', ParseIntPipe) conversationId: number,
        @User() req: IUser,
    ) {
        return this.chatAppService.getMessages(conversationId, req.id);
    }

    @Post(':conversationId/messages')
    sendMessage(
        @Param('conversationId', ParseIntPipe) conversationId: number,
        @Body()
        body: {
            content: string;
            imgUrl?: string;
        },
        @User() req: IUser,
    ) {
        return this.chatAppService.sendMessage(
            conversationId,
            req.id,
            body.content,
            body.imgUrl,
        );
    }

    @Patch(':conversationId/seen')
    markAsSeen(
        @Param('conversationId', ParseIntPipe) conversationId: number,
        @User() req: IUser,
    ) {
        return this.chatAppService.markAsSeen(conversationId, req.id);
    }

    @Post('upload-file')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),

            limits: {
                fileSize: 20 * 1024 * 1024,
            },
        }),
    )
    uploadChatFile(@UploadedFile() file: Express.Multer.File) {
        return this.chatAppService.uploadChatFile(file);
    }
}
