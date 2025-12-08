import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn,  } from "typeorm";
import { User } from "./user.entity";

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

  @Column()
  class_id: number;

  @Column()
  yearOfAdmissionId: number;
}
