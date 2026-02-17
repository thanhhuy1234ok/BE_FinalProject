import { Building } from '@/building/entities/building.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
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
    is_active: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn({ default: null })
    deletedAt: Date;
}
