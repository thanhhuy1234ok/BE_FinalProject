import { Module } from '@nestjs/common';
import { AdminClassAdvisorService } from './admin-class-advisor.service';
import { AdminClassAdvisorController } from './admin-class-advisor.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminClassAdvisor } from './entities/admin-class-advisor.entity';
import { Teacher } from '@/users/entities/teacher.entity';
import { AdminClass } from '@/admin-class/entities/admin-class.entity';

@Module({
  controllers: [AdminClassAdvisorController],
  providers: [AdminClassAdvisorService],
  imports: [TypeOrmModule.forFeature([AdminClassAdvisor, Teacher, AdminClass])],
})
export class AdminClassAdvisorModule { }
