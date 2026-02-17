import { AdminClassAdvisor } from '@/admin-class-advisor/entities/admin-class-advisor.entity';
import { Major } from '@/majors/entities/major.entity';
import { Student } from '@/users/entities/student.entity';
import { YearOfAdmission } from '@/year-of-admission/entities/year-of-admission.entity';
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

@Entity('admin_classes')
export class AdminClass {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    code: string; // "CNTT_K23_01"

    @Column()
    name: string; // "Công nghệ thông tin K23 lớp 1"

    @Column({ default: 50 })
    capacity: number;

    @Column()
    major_id: number;

    @ManyToOne(() => Major, (major) => major.adminClasses)
    @JoinColumn({ name: 'major_id' })
    major: Major;

    @Column()
    yearOfAdmissionId: number;

    @ManyToOne(() => YearOfAdmission, (year) => year.adminClasses)
    @JoinColumn({ name: 'yearOfAdmissionId' })
    yearOfAdmission: YearOfAdmission;

    @OneToMany(() => AdminClassAdvisor, (x) => x.adminClass)
    advisorLinks: AdminClassAdvisor[];

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => Student, (student) => student.adminClass)
    students: Student[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
