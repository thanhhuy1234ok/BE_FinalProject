import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn,  } from "typeorm";
import { User } from "./user.entity";
import { Major } from "src/majors/entities/major.entity";
import { YearOfAdmission } from "src/year-of-admission/entities/year-of-admission.entity";

@Entity('students')
export class Student {
  @PrimaryColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.student)
  @JoinColumn({ name: 'user_id' })
  user: User;

  //   @Column({ unique: true })
  @Column({ nullable: true })
  mssv: string;

  @Column()
  major_id: number;

  @ManyToOne(() => Major, (major) => major.students)
  @JoinColumn({ name: 'major_id' })
  major: Major;

  @Column()
  class_id: number;

  @Column()
  yearOfAdmissionId: number;

  // @Column()
  // class_id: number;

  // @ManyToOne(() => ClassEntity, (c) => c.students)
  // @JoinColumn({ name: 'class_id' })
  // classEntity: ClassEntity;


  @ManyToOne(() => YearOfAdmission, (y) => y.students)
  @JoinColumn({ name: 'yearOfAdmissionId' })
  yearOfAdmission: YearOfAdmission;
}
