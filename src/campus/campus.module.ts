import { Module } from '@nestjs/common';
import { CampusService } from './campus.service';
import { CampusController } from './campus.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campus } from './entities/campus.entity';
import { BuildingModule } from '@/building/building.module';


@Module({
  controllers: [CampusController],
  providers: [CampusService],
  imports: [TypeOrmModule.forFeature([Campus]), BuildingModule]
})
export class CampusModule { }
