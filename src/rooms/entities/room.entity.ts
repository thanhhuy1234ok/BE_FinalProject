import { Building } from '@/building/entities/building.entity';
import { Schedule } from '@/schedules/entities/schedule.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Room {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    building_id: number;

    @ManyToOne(() => Building, (building) => building.rooms, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'building_id' })
    building: Building;

    @Column()
    code: string;

    @Column({ nullable: true })
    name?: string;

    @Column({ type: 'int', nullable: true })
    floor: number | null;

    @Column({ type: 'int', nullable: true })
    capacity: number | null;

    @Column({ nullable: true })
    type?: string;

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => Schedule, (schedule) => schedule.room)
    schedules: Schedule[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn({ default: null })
    deletedAt: Date;
}
