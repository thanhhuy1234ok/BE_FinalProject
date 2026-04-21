import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Room } from '@/rooms/entities/room.entity';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { Lesson } from '@/lesson/entities/lesson.entity';

@Entity('schedules')
export class Schedule {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    courseOfferingId: number;

    @ManyToOne(
        () => CourseOffering,
        (courseOffering) => courseOffering.schedules,
        {
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'courseOfferingId' })
    courseOffering: CourseOffering;

    @Column({ type: 'int', nullable: true })
    roomId?: number;

    @ManyToOne(() => Room, (room) => room.schedules, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'roomId' })
    room?: Room;

    @Column({ type: 'int', comment: '2 = Monday, 3 = Tuesday ... 8 = Sunday' })
    dayOfWeek: number;

    @Column({ type: 'int', comment: 'Tiết bắt đầu' })
    lessonStart: number;

    @Column({ type: 'int', comment: 'Tiết kết thúc' })
    lessonEnd: number;

    @OneToMany(() => Lesson, (lesson) => lesson.schedule)
    lessons: Lesson[];

    @Column({ type: 'date', nullable: true, comment: 'Ngày bắt đầu học' })
    startDate?: Date;

    @Column({ type: 'date', nullable: true, comment: 'Ngày kết thúc học' })
    endDate?: Date;

    @Column({ type: 'int', default: 0 })
    totalLessons: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt?: Date;
}
