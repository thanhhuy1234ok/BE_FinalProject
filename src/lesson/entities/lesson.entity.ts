import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { LessonStatus } from '@/helpers/enum/enum.global';
import { Room } from '@/rooms/entities/room.entity';
import { Schedule } from '@/schedules/entities/schedule.entity';

import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('lessons')
export class Lesson {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    scheduleId: number;

    @ManyToOne(() => Schedule, (schedule) => schedule.lessons, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'scheduleId' })
    schedule: Schedule;

    @Column({ type: 'int' })
    courseOfferingId: number;

    @ManyToOne(
        () => CourseOffering,
        (courseOffering) => courseOffering.lessons,
        {
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'courseOfferingId' })
    courseOffering: CourseOffering;

    @Column({ type: 'int', nullable: true })
    roomId?: number;

    @ManyToOne(() => Room, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'roomId' })
    room?: Room;

    @Column({ type: 'date' })
    date: string;

    // 2 = Monday ... 8 = Sunday
    @Column({ type: 'int' })
    dayOfWeek: number;

    @Column({ type: 'int' })
    lessonStart: number;

    @Column({ type: 'int' })
    lessonEnd: number;

    @Column({
        type: 'enum',
        enum: LessonStatus,
        default: LessonStatus.UPCOMING,
    })
    status: LessonStatus;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;
}
