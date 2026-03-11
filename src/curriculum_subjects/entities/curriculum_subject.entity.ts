import { Curriculum } from '@/curriculum/entities/curriculum.entity';
import { Subject } from '@/subjects/entities/subject.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class CurriculumSubject {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    curriculumId: number;

    @ManyToOne(() => Curriculum, (c) => c.curriculumSubjects, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'curriculumId' })
    curriculum: Curriculum;

    @Column()
    subjectId: number;

    @ManyToOne(() => Subject, (s) => s.curriculumSubjects, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'subjectId' })
    subject: Subject;

    @Column({ type: 'int' })
    semesterNumber: number;

    @Column({ default: true })
    isRequired: boolean;

    @Column({ type: 'int', default: 0 })
    ordering: number;

    @Column({ nullable: true })
    prerequisiteRule?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}
