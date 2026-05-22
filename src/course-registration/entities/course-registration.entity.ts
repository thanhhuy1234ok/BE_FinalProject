import { RegistrationStatus } from '@/helpers/enum/enum.global';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { PaymentItem } from '@/payment-item/entities/payment-item.entity';
import { Student } from '@/users/entities/student.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('course_registrations')
@Index(['studentId', 'courseOfferingId'], { unique: true })
@Index(['studentId', 'status'])
export class CourseRegistration {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'student_id' })
    studentId: number;

    @ManyToOne(() => Student, (student) => student.courseRegistrations, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'student_id' })
    student: Student;

    @Column({ name: 'course_offering_id' })
    courseOfferingId: number;

    @ManyToOne(() => CourseOffering, {
        nullable: false,
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'course_offering_id' })
    courseOffering: CourseOffering;

    @OneToOne(() => PaymentItem, (paymentItem) => paymentItem.registration)
    paymentItem: PaymentItem;

    @Column({
        type: 'enum',
        enum: RegistrationStatus,
        default: RegistrationStatus.REGISTERED,
    })
    status: RegistrationStatus;

    @Column({
        type: 'timestamp',
        name: 'registered_at',
        default: () => 'CURRENT_TIMESTAMP',
    })
    registeredAt: Date;

    @Column({
        type: 'timestamp',
        name: 'cancelled_at',
        nullable: true,
    })
    cancelledAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
