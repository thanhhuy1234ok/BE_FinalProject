import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { AdminClass } from '@/admin-class/entities/admin-class.entity';
import { Teacher } from '@/users/entities/teacher.entity'; // chỉnh path đúng project bạn

@Entity('admin_class_advisors')
@Index(['adminClassId', 'teacherId', 'startAt'])
export class AdminClassAdvisor {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    adminClassId: number;

    @ManyToOne(() => AdminClass, (c) => c.advisorLinks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'adminClassId' })
    adminClass: AdminClass;

    @Column({ type: 'int' })
    teacherId: number;

    @ManyToOne(() => Teacher, (t) => t.advisorLinks, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'teacherId' })
    teacher: Teacher;

    @Column({ type: 'timestamptz' })
    startAt: Date;

    @Column({ type: 'timestamptz', nullable: true })
    endAt: Date | null;

    @Column({ default: true })
    isPrimary: boolean;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
