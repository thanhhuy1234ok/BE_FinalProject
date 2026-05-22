// src/notification/entities/notification.entity.ts
import { User } from '@/users/entities/user.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ default: 'INFO' })
    type: string;

    @Column({ default: false })
    isRead: boolean;

    @Column({ name: 'reference_id', type: 'int', nullable: true })
    referenceId: number | null;

    @Column({
        name: 'reference_type',
        type: 'varchar',
        length: 50,
        nullable: true,
    })
    referenceType: string | null;

    @CreateDateColumn()
    createdAt: Date;
}
