import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import { Payment } from '@/payment/entities/payment.entity';

import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('payment_items')
@Index(['paymentId'])
@Index(['registrationId'], { unique: true })
export class PaymentItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'payment_id' })
    paymentId: number;

    @ManyToOne(() => Payment, (payment) => payment.items, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'payment_id' })
    payment: Payment;

    @Column({ name: 'registration_id', unique: true })
    registrationId: number;

    @OneToOne(
        () => CourseRegistration,
        (registration) => registration.paymentItem,
        {
            nullable: false,
            onDelete: 'RESTRICT',
        },
    )
    @JoinColumn({ name: 'registration_id' })
    registration: CourseRegistration;

    @Column({ name: 'course_offering_id' })
    courseOfferingId: number;

    @ManyToOne(() => CourseOffering, {
        nullable: false,
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'course_offering_id' })
    courseOffering: CourseOffering;

    @Column({ type: 'int' })
    credits: number;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        name: 'unit_price',
    })
    unitPrice: string;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
    })
    amount: string;
}
