import { AdminClass } from '@/admin-class/entities/admin-class.entity';
import { Curriculum } from '@/curriculum/entities/curriculum.entity';
import { Student } from '@/users/entities/student.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('year_of_admissions')
export class YearOfAdmission {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    year: number;

    @Column({ unique: true })
    code: string;
    @Column()
    expectedGraduationYear: number;

    @Column({ nullable: true })
    description?: string;

    @OneToMany(() => Student, (student) => student.yearOfAdmission)
    students: Student[];

    @OneToMany(() => AdminClass, (cls) => cls.yearOfAdmission)
    adminClasses: AdminClass[];

    @OneToMany(() => Curriculum, (c) => c.yearOfAdmission)
    curriculums: Curriculum[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
