import { CurriculumSubject } from '@/curriculum_subjects/entities/curriculum_subject.entity';
import { Major } from '@/majors/entities/major.entity';
import { YearOfAdmission } from '@/year-of-admission/entities/year-of-admission.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
export enum CurriculumStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    ARCHIVED = 'archived',
}
@Entity()
export class Curriculum {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column()
    major_id: number;

    @ManyToOne(() => Major, (m) => m.curriculums, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'major_id' })
    major: Major;

    @Index()
    @Column()
    year_of_admission_id: number; // Khóa K24/K25...

    @ManyToOne(() => YearOfAdmission, (y) => y.curriculums, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'year_of_admission_id' })
    yearOfAdmission: YearOfAdmission;

    @Index()
    @Column({ type: 'varchar', length: 50 })
    code: string; // VD: CURR-IT-K24-V1

    @Column({ type: 'varchar', length: 255 })
    name: string; // VD: Chương trình đào tạo CNTT K24

    @Column({ type: 'date', nullable: true })
    effective_from: string | null;

    @Column({ type: 'date', nullable: true })
    effective_to: string | null;

    @Column({ type: 'int', nullable: true })
    total_credits_required: number | null;

    @Column({
        type: 'enum',
        enum: CurriculumStatus,
        default: CurriculumStatus.DRAFT,
    })
    status: CurriculumStatus;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @OneToMany(() => CurriculumSubject, (cs) => cs.curriculum, {
        cascade: false,
    })
    curriculumSubjects: CurriculumSubject[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn({ default: null })
    deletedAt: Date | null;
}
