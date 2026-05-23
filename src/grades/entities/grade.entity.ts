import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('grades')
export class Grade {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'registration_id', unique: true })
    registrationId: number;

    @OneToOne(() => CourseRegistration, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'registration_id' })
    registration: CourseRegistration;

    // điểm chuyên cần: BE tự tính từ Attendance
    @Column({
        name: 'attendance_score',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0,
    })
    attendanceScore: number;

    // điểm giữa kỳ: giáo viên nhập
    @Column({
        name: 'midterm_score',
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true,
        default: 0,
    })
    midtermScore: number;

    // điểm cuối kỳ: giáo viên nhập
    @Column({
        name: 'final_score',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0,
    })
    finalScore: number;

    // điểm tổng kết
    @Column({
        name: 'total_score',
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true,
        default: 0,
    })
    totalScore: number;

    // A, B, C, D, F
    @Column({
        name: 'letter_grade',
        type: 'varchar',
        length: 5,
        nullable: true,
    })
    letterGrade: string | null;

    // đạt / rớt
    @Column({
        name: 'is_passed',
        default: false,
    })
    isPassed: boolean;

    // giáo viên nhập xong, publish thì sinh viên mới thấy
    @Column({
        name: 'is_published',
        default: false,
    })
    isPublished: boolean;

    @Column({
        name: 'published_at',
        type: 'timestamp',
        nullable: true,
    })
    publishedAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
