import { Module } from '@nestjs/common';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { Grade } from './entities/grade.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '@/users/entities/student.entity';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { Notification } from '@/notification/entities/notification.entity';
import { NotificationModule } from '@/notification/notification.module';

@Module({
    controllers: [GradesController],
    providers: [GradesService],
    imports: [
        TypeOrmModule.forFeature([Grade, Student, CourseOffering]),
        NotificationModule,
    ],
})
export class GradesModule {}
