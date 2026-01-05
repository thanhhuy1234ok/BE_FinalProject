import { Major } from "src/majors/entities/major.entity";
import { Student } from "src/users/entities/student.entity";
import { YearOfAdmission } from "src/year-of-admission/entities/year-of-admission.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('admin_classes')
export class AdminClass {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string; // "CNTT_K23_01"

  @Column()
  name: string; // "Công nghệ thông tin K23 lớp 1"

  @Column({ default: 50 })
  capacity: number;

  @Column()
  major_id: number;

  @ManyToOne(() => Major, (major) => major.adminClasses)
  @JoinColumn({ name: 'major_id' })
  major: Major;

  @Column()
  yearOfAdmissionId: number;

  @ManyToOne(() => YearOfAdmission, (year) => year.adminClasses)
  @JoinColumn({ name: 'yearOfAdmissionId' })
  yearOfAdmission: YearOfAdmission;

    @Column({ nullable: true })
    homeroomTeacherId?: number;

  //   @ManyToOne(() => Teacher, (t) => t.homeroomClasses, { nullable: true })
  //   @JoinColumn({ name: 'homeroomTeacherId' })
  //   homeroomTeacher?: Teacher;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Student, (student) => student.adminClass)
  students: Student[];
}
