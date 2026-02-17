import { Campus } from '@/campus/entities/campus.entity';
import { Room } from '@/rooms/entities/room.entity';
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
export class Building {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    campus_id: number;

    @ManyToOne(() => Campus, (campus) => campus.buildings, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'campus_id' })
    campus: Campus;

    @Column()
    code: string; // B1, A, TOWER1

    @Column()
    name: string; // Block A, Main Building

    @Column({ default: true })
    has_floors: boolean;

    @Column({ type: 'int', nullable: true, default: 0 })
    total_floors: number | null;

    @Column({ default: true })
    is_active: boolean;

    @OneToMany(() => Room, (room) => room.building)
    rooms: Room[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn({ default: null })
    deletedAt: Date;
}
