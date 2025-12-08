import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Role } from 'src/roles/entities/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}
  async create(createUserDto: CreateUserDto) {
    const { role, ...rest } = createUserDto;
    const checkEmail = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (checkEmail) {
      throw new BadRequestException('Email already exists');
    }

    const checkRoles = await this.rolesRepository.findOne({
      where: { id: createUserDto.role },
    });

    if (!checkRoles) {
      throw new BadRequestException('Role not found');
    }

    const user = this.usersRepository.create({
      ...rest,
      // role: checkRoles,
      role_id: checkRoles.id,
    });
    return this.usersRepository.save(user);
  }

  findAll() {
    return this.usersRepository.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  findOneByUsername(username: string) {
    return this.usersRepository.findOne({ where: { email: username } });
  }

  updateUserToken = async (refreshToken: string, id: string) => {
    return await this.usersRepository.update({ id }, { refreshToken });
  };

  findUserByToken = async (refreshToken: string) => {
    return await this.usersRepository.findOne({
      where: { refreshToken: refreshToken },
      relations: ['role'],
      select: {
        role: { id: true, name: true },
      },
    });
  };
}
