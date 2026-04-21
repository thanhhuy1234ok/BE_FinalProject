import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
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
    RelationId,
    Unique,
} from 'typeorm';

@Entity()
@Unique(['teacherId', 'subjectId']) // ✅ chống trùng teacher + subject
export class TeacherSubject {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    teacherId: string;

    @ManyToOne(() => Teacher, (t) => t.teacherSubjects, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'teacherId', referencedColumnName: 'user_id' })
    teacher: Teacher;

    @Column({ type: 'int' })
    subjectId: number;

    @ManyToOne(() => Subject, (s) => s.teacherSubjects, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'subjectId' })
    subject: Subject;

    @OneToMany(
        () => CourseOffering,
        (courseOffering) => courseOffering.teacherSubject,
    )
    courseOfferings: CourseOffering[];

    @CreateDateColumn()
    createdAt: Date;
}
