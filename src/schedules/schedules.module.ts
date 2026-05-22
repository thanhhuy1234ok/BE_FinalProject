import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { Room } from '@/rooms/entities/room.entity';
import { Lesson } from '@/lesson/entities/lesson.entity';
import { Student } from '@/users/entities/student.entity';
import { Teacher } from '@/users/entities/teacher.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';

@Module({
    controllers: [SchedulesController],
    providers: [SchedulesService],
    imports: [
        TypeOrmModule.forFeature([
            Schedule,
            CourseOffering,
            Room,
            Lesson,
            Student,
            Teacher,
            CourseRegistration,
        ]),
    ],
})
export class SchedulesModule {}
