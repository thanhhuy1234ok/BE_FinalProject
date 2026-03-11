import { CurriculumSubject } from '@/curriculum_subjects/entities/curriculum_subject.entity';
import { Department } from '@/departments/entities/department.entity';
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

@Entity()
export class Subject {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    code: string;

    @Column()
    credit: number;

    @Column({ default: true })
    isActive: boolean;

    @Column()
    department_id: number;

    @OneToMany(() => CurriculumSubject, (cs) => cs.subject)
    curriculumSubjects: CurriculumSubject[];

    @ManyToOne(() => Department, (dept) => dept.subjects)
    @JoinColumn({ name: 'department_id' })
    department: Department;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
