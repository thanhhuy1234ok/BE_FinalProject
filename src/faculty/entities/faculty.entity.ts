import { Department } from '@/departments/entities/department.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Faculty {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    code: string; // FIT, FBA, FENG

    @Column()
    name: string; // Faculty of Information Technology

    @Column({ nullable: true })
    description?: string;

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => Department, (department) => department.faculty)
    departments: Department[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
