import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";

@Entity('teachers')
export class Teacher {
  @PrimaryColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.teacher)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
//   @Column({ unique: true })
  msgv: string;

  @Column()
  specialization: string;

  @Column()
  degree: string;
}