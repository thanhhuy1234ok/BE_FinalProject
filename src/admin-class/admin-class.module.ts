import { Module } from '@nestjs/common';
import { AdminClassService } from './admin-class.service';
import { AdminClassController } from './admin-class.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminClass } from './entities/admin-class.entity';
import { Major } from '@/majors/entities/major.entity';
import { YearOfAdmission } from '@/year-of-admission/entities/year-of-admission.entity';
import { Teacher } from '@/users/entities/teacher.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminClass, Major, YearOfAdmission, Teacher]),
  ],
  controllers: [AdminClassController],
  providers: [AdminClassService],
})
export class AdminClassModule {}
