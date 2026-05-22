import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('documents')
export class Document {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    fileName: string;

    @Column()
    fileUrl: string;

    @Column()
    publicId: string;

    @Column()
    fileType: string;

    @Column({ type: 'int', default: 0 })
    fileSize: number;

    @Column({ type: 'int', name: 'course_offering_id' })
    courseOfferingId: number;

    @ManyToOne(
        () => CourseOffering,
        (courseOffering) => courseOffering.documents,
        {
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'course_offering_id' })
    courseOffering: CourseOffering;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
