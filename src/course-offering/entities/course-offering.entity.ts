import { AdminClass } from '@/admin-class/entities/admin-class.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import { Document } from '@/document/entities/document.entity';
import { CourseOfferingStatus } from '@/helpers/enum/enum.global';
import { Lesson } from '@/lesson/entities/lesson.entity';
import { Schedule } from '@/schedules/entities/schedule.entity';
import { TeacherSubject } from '@/teacher-subject/entities/teacher-subject.entity';
import { Term } from '@/terms/entities/term.entity';
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

@Entity('course_offerings')
export class CourseOffering {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    code: string;

    @ManyToOne(
        () => TeacherSubject,
        (teacherSubject) => teacherSubject.courseOfferings,
        {
            nullable: false,
            onDelete: 'RESTRICT',
        },
    )
    @JoinColumn({ name: 'teacher_subject_id' })
    teacherSubject: TeacherSubject;

    @Column({ type: 'int', name: 'teacher_subject_id' })
    teacherSubjectId: number;

    @ManyToOne(() => Term, (term) => term.courseOfferings, {
        nullable: false,
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'term_id' })
    term: Term;

    @Column({ type: 'int', name: 'term_id' })
    termId: number;

    @ManyToOne(() => AdminClass, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'admin_class_id' })
    adminClass: AdminClass | null;

    @Column({ type: 'int', name: 'admin_class_id', nullable: true })
    adminClassId: number | null;

    @Column({ type: 'int', default: 60 })
    maxStudents: number;

    @Column({ type: 'int', default: 0 })
    enrolledCount: number;

    @Column({
        type: 'enum',
        enum: CourseOfferingStatus,
        default: CourseOfferingStatus.CREATED,
    })
    status: CourseOfferingStatus;

    @OneToMany(() => Schedule, (schedule) => schedule.courseOffering)
    schedules: Schedule[];

    @OneToMany(() => Lesson, (lesson) => lesson.courseOffering)
    lessons: Lesson[];

    @OneToMany(() => Document, (document) => document.courseOffering)
    documents: Document[];

    @OneToMany(
        () => CourseRegistration,
        (courseRegistration) => courseRegistration.courseOffering,
    )
    courseRegistrations: CourseRegistration[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date | null;
}
