import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Attendance } from './entities/attendance.entity';
import { Lesson } from '@/lesson/entities/lesson.entity';
import { Teacher } from '@/users/entities/teacher.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '@/users/entities/student.entity';

@Module({
    controllers: [AttendanceController],
    providers: [AttendanceService],
    imports: [
        TypeOrmModule.forFeature([
            Attendance,
            Lesson,
            Teacher,
            CourseRegistration,
            Student,
        ]),
    ],
})
export class AttendanceModule {}
