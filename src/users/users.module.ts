import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Student } from './entities/student.entity';
import { Teacher } from './entities/teacher.entity';
import { Role } from '@/roles/entities/role.entity';
import { Major } from '@/majors/entities/major.entity';
import { YearOfAdmission } from '@/year-of-admission/entities/year-of-admission.entity';
import { AdminClass } from '@/admin-class/entities/admin-class.entity';
import { Department } from '@/departments/entities/department.entity';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { Grade } from '@/grades/entities/grade.entity';
import { Attendance } from '@/attendance/entities/attendance.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import { Curriculum } from '@/curriculum/entities/curriculum.entity';
import { CurriculumSubject } from '@/curriculum_subjects/entities/curriculum_subject.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            Student,
            Teacher,
            Role,
            Major,
            YearOfAdmission,
            AdminClass,
            Department,
            CourseOffering,
            Attendance,
            Grade,
            CourseRegistration,
            CurriculumSubject,
        ]),
    ],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
