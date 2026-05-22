import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import { AttendanceMethod, AttendanceStatus } from '@/helpers/enum/enum.global';
import { Lesson } from '@/lesson/entities/lesson.entity';

import { Student } from '@/users/entities/student.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('attendances')
@Index(['lessonId', 'studentId'], { unique: true })
export class Attendance {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    lessonId: number;

    @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'lessonId' })
    lesson: Lesson;

    @Column({ type: 'int' })
    studentId: number;

    @ManyToOne(() => Student, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'studentId' })
    student: Student;

    @Column({ type: 'int' })
    registrationId: number;

    @ManyToOne(() => CourseRegistration, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'registrationId' })
    registration: CourseRegistration;

    @Column({
        type: 'enum',
        enum: AttendanceStatus,
        default: AttendanceStatus.NOT_ATTENDED,
    })
    status: AttendanceStatus;

    @Column({
        type: 'enum',
        enum: AttendanceMethod,
        default: AttendanceMethod.MANUAL,
    })
    method: AttendanceMethod;

    @Column({ type: 'timestamp', nullable: true })
    checkedAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
