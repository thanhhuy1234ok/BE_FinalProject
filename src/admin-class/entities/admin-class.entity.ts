import { AdminClassAdvisor } from '@/admin-class-advisor/entities/admin-class-advisor.entity';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { AdminClassStatus } from '@/helpers/enum/enum.global';
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
    code: string; // CNTT_K23_01

    @Column()
    name: string; // Công nghệ thông tin K23 lớp 1

    @Column({ type: 'int', default: 50 })
    capacity: number;

    @Column({ type: 'int' })
    major_id: number;

    @ManyToOne(() => Major, (major) => major.adminClasses, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'major_id' })
    major: Major;

    @Column({ type: 'int' })
    yearOfAdmissionId: number;

    @ManyToOne(() => YearOfAdmission, (year) => year.adminClasses, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'yearOfAdmissionId' })
    yearOfAdmission: YearOfAdmission;

    @OneToMany(() => AdminClassAdvisor, (advisorLink) => advisorLink.adminClass)
    advisorLinks: AdminClassAdvisor[];

    @OneToMany(() => Student, (student) => student.adminClass)
    students: Student[];

    @Column({
        type: 'enum',
        enum: AdminClassStatus,
        default: AdminClassStatus.PENDING,
    })
    status: AdminClassStatus;

    @OneToMany(
        () => CourseOffering,
        (courseOffering) => courseOffering.adminClass,
    )
    courseOfferings: CourseOffering[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date | null;
}
