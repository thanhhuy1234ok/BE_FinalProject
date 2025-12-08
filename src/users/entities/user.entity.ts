import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./student.entity";
import { Teacher } from "./teacher.entity";

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  gender?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  avatar?: string;

//   @ManyToOne(() => Role, (role) => role.users)
//   @JoinColumn({ name: 'role_id' })
//   role: Role;

  // @Column()
  // role_id: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => Student, (student) => student.user)
  student?: Student;

  @OneToOne(() => Teacher, (teacher) => teacher.user)
  teacher?: Teacher;
}
