import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Major } from '@/majors/entities/major.entity';
import { YearOfAdmission } from '@/year-of-admission/entities/year-of-admission.entity';
import { AdminClass } from '@/admin-class/entities/admin-class.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';

@Entity('students')
export class Student {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('uuid', { unique: true })
    user_id: string;

    @OneToOne(() => User, (user) => user.student)
    @JoinColumn({ name: 'user_id' })
    user: User;

    //   @Column({ unique: true })
    @Column({ nullable: true })
    mssv: string;

    @Column()
    major_id: number;

    @ManyToOne(() => Major, (major) => major.students, { eager: true })
    @JoinColumn({ name: 'major_id' })
    major: Major;

    @Column()
    yearOfAdmissionId: number;

    @ManyToOne(() => YearOfAdmission, (y) => y.students, { eager: true })
    @JoinColumn({ name: 'yearOfAdmissionId' })
    yearOfAdmission: YearOfAdmission;

    @Column({ nullable: true })
    adminClassId?: number;

    @ManyToOne(() => AdminClass, (cls) => cls.students)
    @JoinColumn({ name: 'adminClassId' })
    adminClass?: AdminClass;

    @OneToMany(
        () => CourseRegistration,
        (courseRegistration) => courseRegistration.student,
    )
    courseRegistrations: CourseRegistration[];
}
