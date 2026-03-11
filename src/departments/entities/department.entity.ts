import { Faculty } from '@/faculty/entities/faculty.entity';
import { Major } from '@/majors/entities/major.entity';
import { Subject } from '@/subjects/entities/subject.entity';
import { Teacher } from '@/users/entities/teacher.entity';
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

@Entity()
export class Department {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string; // Computer Science

    @Column({ nullable: true })
    code?: string; // CS

    @Column({ nullable: true })
    description?: string;

    @Column({ nullable: true })
    facultyId: number;

    @ManyToOne(() => Faculty, (faculty) => faculty.departments)
    @JoinColumn({ name: 'facultyId' })
    faculty: Faculty;

    @OneToMany(() => Teacher, (teacher) => teacher.department)
    teachers: Teacher[];

    @OneToMany(() => Subject, (subject) => subject.department)
    subjects: Subject[];

    @OneToMany(() => Major, (major) => major.department)
    majors: Major[];

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
