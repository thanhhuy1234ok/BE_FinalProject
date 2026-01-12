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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),

    AuthModule,
    UsersModule,
    RolesModule,
    MajorsModule,
    YearOfAdmissionModule,
    AdminClassModule,
    DatabasesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
