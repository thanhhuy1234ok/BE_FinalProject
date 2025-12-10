import { Module } from '@nestjs/common';
import { MajorsService } from './majors.service';
import { MajorsController } from './majors.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Major } from './entities/major.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Major])],
  controllers: [MajorsController],
  providers: [MajorsService],
})
export class MajorsModule {}
