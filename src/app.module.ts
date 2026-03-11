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

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
