import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { SemesterEnum } from '@/helpers/enum/enum.global';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Term {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    year: number;

    @Column({
        type: 'enum',
        enum: SemesterEnum,
    })
    semester: SemesterEnum;

    @Column({ type: 'date' })
    startDate: Date;

    @Column({ type: 'date' })
    endDate: Date;

    @OneToMany(() => CourseOffering, (courseOffering) => courseOffering.term)
    courseOfferings: CourseOffering[];

    @Column({ type: 'boolean', default: false })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date | null;
}
