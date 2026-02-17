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
        ]),
    ],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
