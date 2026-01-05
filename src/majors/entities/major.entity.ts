
import { AdminClass } from "src/admin-class/entities/admin-class.entity";
import { Student } from "src/users/entities/student.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('majors')
export class Major {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Student, (user) => user.major)
  students: Student[];

  @OneToMany(() => AdminClass, (cls) => cls.major)
  adminClasses: AdminClass[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
