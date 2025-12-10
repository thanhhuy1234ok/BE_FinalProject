import { Module } from '@nestjs/common';
import { YearOfAdmissionService } from './year-of-admission.service';
import { YearOfAdmissionController } from './year-of-admission.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YearOfAdmission } from './entities/year-of-admission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([YearOfAdmission])],
  controllers: [YearOfAdmissionController],
  providers: [YearOfAdmissionService],
})
export class YearOfAdmissionModule {}
