import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { AdminClassAdvisor } from "@/admin-class-advisor/entities/admin-class-advisor.entity";

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('uuid', { unique: true })
  user_id: string;

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

  @OneToMany(() => AdminClassAdvisor, (x) => x.teacher)
  advisorLinks: AdminClassAdvisor[];

}