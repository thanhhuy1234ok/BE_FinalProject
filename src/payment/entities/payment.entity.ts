import { PaymentMethod, PaymentStatus } from '@/helpers/enum/enum.global';
import { PaymentItem } from '@/payment-item/entities/payment-item.entity';
import { Term } from '@/terms/entities/term.entity';
import { Student } from '@/users/entities/student.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('payments')
@Index(['studentId', 'termId', 'status'])
export class Payment {
    @PrimaryGeneratedColumn()
    id: number;

    // ================= RELATIONS =================

    @Column({ name: 'student_id' })
    studentId: number;

    @ManyToOne(() => Student, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'student_id' })
    student: Student;

    @Column({ name: 'term_id' })
    termId: number;

    @ManyToOne(() => Term, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'term_id' })
    term: Term;

    @OneToMany(() => PaymentItem, (item) => item.payment, {
        cascade: true,
    })
    items: PaymentItem[];

    // ================= CORE =================

    @Column({ unique: true })
    code: string;

    @Column({ type: 'int', default: 0 })
    totalCredits: number;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    totalAmount: string;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    status: PaymentStatus;

    // ================= PAYMENT =================

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        nullable: true,
    })
    paymentMethod: PaymentMethod | null;

    // ================= TIME =================

    @Column({ type: 'timestamp', nullable: true })
    dueDate: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    paidAt: Date | null;

    // ================= AUDIT =================

    // 🔥 BẮT BUỘC nếu có VNPay

    @Column({ type: 'varchar', nullable: true })
    transactionRef: string | null; // vnp_TxnRef

    @Column({ type: 'varchar', length: 20, nullable: true })
    gatewayResponseCode: string | null; // vnp_ResponseCode

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
