import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from './configs/connectDB.pg.config';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { MajorsModule } from './majors/majors.module';
import { YearOfAdmissionModule } from './year-of-admission/year-of-admission.module';
import { AdminClassModule } from './admin-class/admin-class.module';
import { DatabasesModule } from './databases/databases.module';
import { FileModule } from './file/file.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TermsModule } from './terms/terms.module';
import { AdminClassAdvisorModule } from './admin-class-advisor/admin-class-advisor.module';
import { CampusModule } from './campus/campus.module';
import { BuildingModule } from './building/building.module';
import { RoomsModule } from './rooms/rooms.module';
import { CurriculumModule } from './curriculum/curriculum.module';
import { CurriculumSubjectsModule } from './curriculum_subjects/curriculum_subjects.module';
import { DepartmentsModule } from './departments/departments.module';
import { FacultyModule } from './faculty/faculty.module';
import { SchedulesModule } from './schedules/schedules.module';
import { TeacherSubjectModule } from './teacher-subject/teacher-subject.module';
import { CourseOfferingModule } from './course-offering/course-offering.module';
import { LessonModule } from './lesson/lesson.module';
import { CourseRegistrationModule } from './course-registration/course-registration.module';
import { PaymentModule } from './payment/payment.module';
import { PaymentItemModule } from './payment-item/payment-item.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceModule } from './attendance/attendance.module';
import { RealtimeModule } from './realtime/realtime.module';
import { NotificationModule } from './notification/notification.module';
import { MailModule } from './mail/mail.module';
import { DocumentModule } from './document/document.module';
import { ChatAppModule } from './chat-app/chat-app.module';
import { GradesModule } from './grades/grades.module';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            useClass: TypeOrmConfigService,
        }),

        ScheduleModule.forRoot(),

        ConfigModule.forRoot({
            isGlobal: true,
        }),
        AuthModule,
        UsersModule,
        RolesModule,
        MajorsModule,
        YearOfAdmissionModule,
        AdminClassModule,
        DatabasesModule,
        FileModule,
        SubjectsModule,
        TermsModule,
        AdminClassAdvisorModule,
        CampusModule,
        BuildingModule,
        RoomsModule,
        CurriculumModule,
        CurriculumSubjectsModule,
        DepartmentsModule,
        FacultyModule,
        SchedulesModule,
        TeacherSubjectModule,
        CourseOfferingModule,
        LessonModule,
        CourseRegistrationModule,
        PaymentModule,
        PaymentItemModule,
        AttendanceModule,
        RealtimeModule,
        NotificationModule,
        MailModule,
        DocumentModule,
        ChatAppModule,
        GradesModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
