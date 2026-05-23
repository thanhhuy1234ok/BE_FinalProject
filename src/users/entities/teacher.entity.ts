import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { AdminClassAdvisor } from '@/admin-class-advisor/entities/admin-class-advisor.entity';
import { Department } from '@/departments/entities/department.entity';
import { TeacherSubject } from '@/teacher-subject/entities/teacher-subject.entity';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';

@Entity('teachers')
export class Teacher {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('uuid', { unique: true })
    user_id: string;

    @OneToOne(() => User, (user) => user.teacher)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ nullable: true })
    //   @Column({ unique: true })
    msgv: string;

    @Column({ nullable: true })
    specialization?: string;

    @Column()
    degree: string;

    @ManyToOne(() => Department, (d) => d.teachers, { nullable: false })
    @JoinColumn({ name: 'department_id' })
    department: Department;

    @Column()
    department_id: number;

    @OneToMany(() => TeacherSubject, (ts) => ts.teacher)
    teacherSubjects: TeacherSubject[];

    @OneToMany(() => AdminClassAdvisor, (x) => x.teacher)
    advisorLinks: AdminClassAdvisor[];
}
