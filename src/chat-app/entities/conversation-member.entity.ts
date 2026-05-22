import { User } from '@/users/entities/user.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum ConversationMemberRole {
    STUDENT = 'STUDENT',
    TEACHER = 'TEACHER',
    MEMBER = 'MEMBER',
}

@Entity('conversation_members')
@Index(['conversationId', 'userId'], { unique: true })
export class ConversationMember {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'conversation_id' })
    conversationId: number;

    @ManyToOne(() => Conversation, (conversation) => conversation.members, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'conversation_id' })
    conversation: Conversation;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({
        type: 'enum',
        enum: ConversationMemberRole,
        default: ConversationMemberRole.MEMBER,
    })
    role: ConversationMemberRole;

    @Column({ name: 'unread_count', default: 0 })
    unreadCount: number;

    @Column({ name: 'last_seen_at', type: 'timestamp', nullable: true })
    lastSeenAt: Date;

    @CreateDateColumn({ name: 'joined_at' })
    joinedAt: Date;
}
