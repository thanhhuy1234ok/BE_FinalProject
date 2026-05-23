import { AdminClass } from '@/admin-class/entities/admin-class.entity';
import { Curriculum } from '@/curriculum/entities/curriculum.entity';
import { Department } from '@/departments/entities/department.entity';
import { Student } from '@/users/entities/student.entity';
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

@Entity('majors')
export class Major {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ unique: true })
    code: string;

    @Column({ default: true })
    isActive: boolean;

    @Column()
    department_id: number;

    @OneToMany(() => Student, (user) => user.major)
    students: Student[];

    @OneToMany(() => AdminClass, (cls) => cls.major)
    adminClasses: AdminClass[];

    @ManyToOne(() => Department, (department) => department.majors)
    @JoinColumn({ name: 'department_id' })
    department: Department;

    @OneToMany(() => Curriculum, (c) => c.major)
    curriculums: Curriculum[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
