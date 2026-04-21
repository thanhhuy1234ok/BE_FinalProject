import { PaymentMethod, PaymentStatus } from '@/helpers/enum/enum.global';
import { PaymentItem } from '@/payment-item/entities/payment-item.entity';
import { Term } from '@/terms/entities/term.entity';
import { Student } from '@/users/entities/student.entity';
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

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Student, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'student_id' })
    student: Student;

    @ManyToOne(() => Term, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'term_id' })
    term: Term;

    @Column({ unique: true })
    code: string;

    @Column({ type: 'int', default: 0 })
    totalCredits: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    totalAmount: number;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    status: PaymentStatus;

    @Column({ type: 'timestamp', nullable: true })
    dueDate: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    paidAt: Date | null;

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        nullable: true,
    })
    paymentMethod: PaymentMethod | null;

    @Column({ type: 'text', nullable: true })
    note: string | null;

    @OneToMany(() => PaymentItem, (item) => item.payment, {
        cascade: true,
    })
    items: PaymentItem[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
