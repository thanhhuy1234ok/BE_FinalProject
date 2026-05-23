import { Module } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './entities/subject.entity';
import { Department } from '@/departments/entities/department.entity';

@Module({
    controllers: [SubjectsController],
    providers: [SubjectsService],
    imports: [TypeOrmModule.forFeature([Subject, Department])],
})
export class SubjectsModule {}
