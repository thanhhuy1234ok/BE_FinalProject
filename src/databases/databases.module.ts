import { Module } from '@nestjs/common';
import { DatabasesService } from './databases.service';
import { DatabasesController } from './databases.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/users/entities/user.entity';
import { Role } from '@/roles/entities/role.entity';
import { Major } from '@/majors/entities/major.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Major])],
  controllers: [DatabasesController],
  providers: [DatabasesService],
})
export class DatabasesModule { }
