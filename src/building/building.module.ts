import { Module } from '@nestjs/common';
import { BuildingService } from './building.service';
import { BuildingController } from './building.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from './entities/building.entity';
import { Campus } from '@/campus/entities/campus.entity';

@Module({
  controllers: [BuildingController],
  providers: [BuildingService],
  imports: [TypeOrmModule.forFeature([Building, Campus])],
  exports: [BuildingService],
})
export class BuildingModule {}
