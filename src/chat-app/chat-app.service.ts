import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import {
    ConversationMember,
    ConversationMemberRole,
} from './entities/conversation-member.entity';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { DataSource, Not, Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { RealtimeGateway } from '@/realtime/realtime.gateway';
import { ConversationType } from '@/helpers/enum/enum.global';
import { CloudinaryProvider } from '@/configs/cloudinary.provider';
import { CloudinaryService } from '@/file/file.service';

@Injectable()
export class ChatAppService {
    constructor(
        @InjectRepository(Conversation)
        private readonly conversationRepo: Repository<Conversation>,

        @InjectRepository(ConversationMember)
        private readonly memberRepo: Repository<ConversationMember>,

        @InjectRepository(CourseOffering)
        private readonly courseOfferingRepo: Repository<CourseOffering>,

        private readonly dataSource: DataSource,

        @InjectRepository(Message)
        private readonly messageRepo: Repository<Message>,

        private readonly realtimeGateway: RealtimeGateway,

        private readonly cloudinaryService: CloudinaryService,
    ) {}

    async createCourseConversationIfNotExists(courseOfferingId: number) {
        let conversation = await this.conversationRepo.findOne({
            where: {
                type: ConversationType.COURSE,
                courseOfferingId,
            },
        });

        const courseOffering = await this.courseOfferingRepo.findOne({
            where: { id: courseOfferingId },
            relations: {
                teacherSubject: {
                    teacher: {
                        user: true,
                    },
                    subject: true,
                },
            },
        });

        if (!courseOffering) {
            throw new NotFoundException('Không tìm thấy lớp học');
        }

        if (!conversation) {
            conversation = await this.conversationRepo.save({
                type: ConversationType.COURSE,
                courseOfferingId: courseOffering.id,
                name: `${courseOffering.code} - ${courseOffering.teacherSubject?.subject?.name || 'Lớp học'}`,
                createdBy: courseOffering.teacherSubject?.teacher?.user?.id,
                createdAt: new Date(),
            });
        }

        const teacherUserId = courseOffering.teacherSubject?.teacher?.user?.id;

        if (teacherUserId) {
            await this.addMember(
                conversation.id,
                teacherUserId,
                ConversationMemberRole.TEACHER,
            );
        }

        return conversation;
    }

    async addMember(
        conversationId: number,
        userId: string,
        role: ConversationMemberRole = ConversationMemberRole.MEMBER,
    ) {
        const existed = await this.memberRepo.findOne({
            where: {
                conversationId,
                userId,
            },
        });

        if (existed) return existed;

        return this.memberRepo.save({
            conversationId,
            userId,
            role,
            unreadCount: 0,
            lastSeenAt: new Date(),
            createdAt: new Date(),
        });
    }

    async openCourseConversationForStudent(
        courseOfferingId: number,
        studentUserId: string,
    ) {
        const conversation =
            await this.createCourseConversationIfNotExists(courseOfferingId);

        await this.addMember(
            conversation.id,
            studentUserId,
            ConversationMemberRole.STUDENT,
        );

        return conversation;
    }

    async createGroupConversation(
        creatorId: string,
        name: string,
        memberIds: string[],
    ) {
        if (!name?.trim()) {
            throw new ForbiddenException('Tên nhóm không được để trống');
        }

        const conversation = await this.conversationRepo.save({
            type: ConversationType.GROUP,
            name: name.trim(),
            createdBy: creatorId,
            createdAt: new Date(),
        });

        const uniqueMemberIds = Array.from(new Set([creatorId, ...memberIds]));

        for (const userId of uniqueMemberIds) {
            await this.addMember(
                conversation.id,
                userId,
                userId === creatorId
                    ? ConversationMemberRole.MEMBER
                    : ConversationMemberRole.MEMBER,
            );
        }

        return conversation;
    }

    async getMyConversations(userId: string) {
        const members = await this.memberRepo.find({
            where: { userId },
            relations: {
                conversation: {
                    lastMessage: {
                        sender: true,
                    },
                    courseOffering: {
                        teacherSubject: {
                            subject: true,
                        },
                    },
                },
            },
            order: {
                conversation: {
                    lastMessageAt: 'DESC',
                    updatedAt: 'DESC',
                },
            },
        });

        return members.map((item) => ({
            ...item.conversation,
            myRole: item.role,
            unreadCount: item.unreadCount,
            lastSeenAt: item.lastSeenAt,
        }));
    }

    async sendMessage(
        conversationId: number,
        senderId: string,
        content: string,
        imgUrl?: string,
    ) {
        if (!content?.trim() && !imgUrl) {
            throw new ForbiddenException('Tin nhắn không được rỗng');
        }

        return this.dataSource.transaction(async (manager) => {
            const member = await manager.findOne(ConversationMember, {
                where: {
                    conversationId,
                    userId: senderId,
                },
            });

            if (!member) {
                throw new ForbiddenException(
                    'Bạn không thuộc cuộc trò chuyện này',
                );
            }

            const conversation = await manager.findOne(Conversation, {
                where: { id: conversationId },
            });

            if (!conversation) {
                throw new NotFoundException('Không tìm thấy conversation');
            }

            const message = await manager.save(Message, {
                conversationId,
                senderId,
                content: content?.trim(),
                imgUrl: imgUrl,
            });

            await manager.update(
                Conversation,
                { id: conversationId },
                {
                    lastMessageId: message.id,
                    lastMessageAt: message.createdAt,
                },
            );

            await manager.increment(
                ConversationMember,
                {
                    conversationId,
                    userId: Not(senderId),
                },
                'unreadCount',
                1,
            );

            await manager.update(
                ConversationMember,
                {
                    conversationId,
                    userId: senderId,
                },
                {
                    unreadCount: 0,
                    lastSeenAt: new Date(),
                },
            );

            const fullMessage = await manager.findOne(Message, {
                where: { id: message.id },
                relations: {
                    sender: true,
                },
            });

            const members = await manager.find(ConversationMember, {
                where: { conversationId },
            });

            const updatedConversation = await manager.findOne(Conversation, {
                where: { id: conversationId },
                relations: {
                    lastMessage: {
                        sender: true,
                    },
                },
            });

            if (!updatedConversation) {
                throw new NotFoundException('Không tìm thấy conversation');
            }

            const payload = {
                message: fullMessage,
                conversation: {
                    id: updatedConversation.id,
                    lastMessage: updatedConversation.lastMessage,
                    lastMessageAt: updatedConversation.lastMessageAt,
                },
            };

            this.realtimeGateway.emitNewMessage(conversationId, payload);

            for (const m of members) {
                this.realtimeGateway.emitConversationUpdated(m.userId, {
                    conversationId,
                    courseOfferingId: updatedConversation.courseOfferingId,
                    lastMessage: updatedConversation.lastMessage,
                    lastMessageAt: updatedConversation.lastMessageAt,
                    unreadCount: m.userId === senderId ? 0 : m.unreadCount + 1,
                });
            }

            return fullMessage;
        });
    }

    async getMessages(conversationId: number, userId: string) {
        const member = await this.memberRepo.findOne({
            where: {
                conversationId,
                userId,
            },
        });

        if (!member) {
            throw new ForbiddenException('Bạn không thuộc conversation này');
        }

        return this.messageRepo.find({
            where: {
                conversationId,
            },
            relations: {
                sender: true,
            },
            order: {
                createdAt: 'ASC',
            },
        });
    }

    async markAsSeen(conversationId: number, userId: string) {
        await this.memberRepo.update(
            {
                conversationId,
                userId,
            },
            {
                unreadCount: 0,
                lastSeenAt: new Date(),
            },
        );

        return {
            success: true,
        };
    }

    async uploadChatFile(file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Vui lòng chọn file');
        }

        const allowedMimeTypes = [
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',

            'application/pdf',

            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                'Chỉ hỗ trợ ảnh, PDF, Word, PowerPoint',
            );
        }

        const uploadResult = await this.cloudinaryService.uploadFile(
            file,
            'chat-files',
        );

        return {
            imgUrl: uploadResult.secure_url,
        };
    }
}
