import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { User } from '@/users/entities/user.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ConversationMember } from './conversation-member.entity';
import { Message } from './message.entity';
import { ConversationType } from '@/helpers/enum/enum.global';

@Entity('conversations')
export class Conversation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'enum',
        enum: ConversationType,
    })
    type: ConversationType;

    @Column({ nullable: true })
    name: string;

    @Column({ name: 'created_by', nullable: true })
    createdBy: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @Column({ name: 'course_offering_id', nullable: true, unique: true })
    courseOfferingId: number;

    @ManyToOne(() => CourseOffering, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'course_offering_id' })
    courseOffering: CourseOffering;

    @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
    lastMessageAt: Date;

    @Column({ name: 'last_message_id', nullable: true })
    lastMessageId: number;

    @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'last_message_id' })
    lastMessage: Message;

    @OneToMany(() => ConversationMember, (member) => member.conversation)
    members: ConversationMember[];

    @OneToMany(() => Message, (message) => message.conversation)
    messages: Message[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
