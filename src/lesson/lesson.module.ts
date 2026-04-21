import { Module } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { Type } from 'class-transformer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './entities/lesson.entity';
import { Schedule } from '@/schedules/entities/schedule.entity';
import { Student } from '@/users/entities/student.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';

@Module({
    controllers: [LessonController],
    providers: [LessonService],
    imports: [
        TypeOrmModule.forFeature([
            Lesson,
            Schedule,
            Student,
            CourseRegistration,
        ]),
    ],
})
export class LessonModule {}
