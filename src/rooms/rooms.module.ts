import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { Building } from '@/building/entities/building.entity';

@Module({
    controllers: [RoomsController],
    providers: [RoomsService],
    imports: [TypeOrmModule.forFeature([Room, Building])],
})
export class RoomsModule {}
