import { getHashPassword } from '@/helpers/func/password.util';
import {
  ADMIN_ROLE,
  STUDENT_ROLE,
  TEACHER_ROLE,
} from '@/helpers/types/constans';
import { Role } from '@/roles/entities/role.entity';
import { User } from '@/users/entities/user.entity';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class DatabasesService implements OnModuleInit {
  private readonly logger = new Logger(DatabasesService.name);
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,

    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const isInit = this.configService.get<string>('SHOULD_INIT');
    if (isInit) {
      const countUser = await this.usersRepository.count();
      const countRole = await this.roleRepository.count();

      if (countRole === 0) {
        await this.roleRepository.save({
          name: ADMIN_ROLE,
          description: 'admin role',
        });
        await this.roleRepository.save({
          name: TEACHER_ROLE,
          description: 'teacher role',
        });

        await this.roleRepository.save({
          name: STUDENT_ROLE,
          description: 'student role',
        });
      }

      if (countUser === 0) {
        const adminRole = await this.roleRepository.findOne({
          where: {
            name: ADMIN_ROLE,
          },
        });
        await this.usersRepository.save({
          email: 'admin@gmail.com',
          name: 'admin',
          password: await getHashPassword(
            this.configService.get<string>('INIT_PASSWORD'),
          ),
          role: adminRole,
        });
      }

      if (countUser > 0 && countRole > 0) {
        this.logger.log('>>>> Database is already initialized');
      }
    }
  }
}
