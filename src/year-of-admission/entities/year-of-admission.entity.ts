import { Student } from "src/users/entities/student.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('year_of_admissions')
export class YearOfAdmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  year: number;

  @Column({ unique: true })
  code: string; 
  @Column()
  expectedGraduationYear: number; 

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => Student, (student) => student.yearOfAdmission)
  students: Student[];
}
