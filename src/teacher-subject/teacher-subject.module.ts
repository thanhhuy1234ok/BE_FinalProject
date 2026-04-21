import { Module } from '@nestjs/common';
import { TeacherSubjectService } from './teacher-subject.service';
import { TeacherSubjectController } from './teacher-subject.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherSubject } from './entities/teacher-subject.entity';
import { Teacher } from '@/users/entities/teacher.entity';
import { Subject } from '@/subjects/entities/subject.entity';

@Module({
    controllers: [TeacherSubjectController],
    providers: [TeacherSubjectService],
    imports: [TypeOrmModule.forFeature([TeacherSubject, Teacher, Subject])],
})
export class TeacherSubjectModule {}
