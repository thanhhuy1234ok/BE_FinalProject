import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { RegistrationStatus } from '@/helpers/enum/enum.global';
import { Student } from '@/users/entities/student.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';

@Entity('course_registrations')
@Unique(['studentId', 'courseOfferingId'])
export class CourseRegistration {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    studentId: number;

    @Column()
    courseOfferingId: number;

    @Column({
        type: 'enum',
        enum: RegistrationStatus,
        default: RegistrationStatus.REGISTERED,
    })
    status: RegistrationStatus;

    @ManyToOne(() => Student, (student) => student.courseRegistrations, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'studentId' })
    student: Student;

    @ManyToOne(
        () => CourseOffering,
        (courseOffering) => courseOffering.courseRegistrations,
        {
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'courseOfferingId' })
    courseOffering: CourseOffering;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
