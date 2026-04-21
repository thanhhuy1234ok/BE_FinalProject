import { Module } from '@nestjs/common';
import { CourseOfferingService } from './course-offering.service';
import { CourseOfferingController } from './course-offering.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseOffering } from './entities/course-offering.entity';
import { Term } from '@/terms/entities/term.entity';
import { TeacherSubject } from '@/teacher-subject/entities/teacher-subject.entity';
import { AdminClass } from '@/admin-class/entities/admin-class.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';

@Module({
    controllers: [CourseOfferingController],
    providers: [CourseOfferingService],
    imports: [
        TypeOrmModule.forFeature([
            CourseOffering,
            TeacherSubject,
            Term,
            AdminClass,
            CourseRegistration,
        ]),
    ],
})
export class CourseOfferingModule {}
