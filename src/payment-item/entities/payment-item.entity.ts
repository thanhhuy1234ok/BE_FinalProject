import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import { PaymentItemStatus } from '@/helpers/enum/enum.global';
import { Payment } from '@/payment/entities/payment.entity';
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('payment_items')
export class PaymentItem {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Payment, (payment) => payment.items, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'payment_id' })
    payment: Payment;

    @ManyToOne(() => CourseRegistration, {
        nullable: false,
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'registration_id' })
    registration: CourseRegistration;

    @ManyToOne(() => CourseOffering, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'course_offering_id' })
    courseOffering: CourseOffering;

    @Column({ type: 'int', default: 0 })
    credits: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    unitPrice: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    amount: number;

    @Column({
        type: 'enum',
        enum: PaymentItemStatus,
        default: PaymentItemStatus.ACTIVE,
    })
    status: PaymentItemStatus;
}
