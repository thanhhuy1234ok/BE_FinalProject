import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Role } from 'src/roles/entities/role.entity';
import { EMAIL_ADMIN } from 'src/helpers/types/constans';
import { getHashPassword } from 'src/helpers/func/password.util';
import { isValidPhone } from 'src/helpers/func/checkPhone';
import { buildAqpQueryOptions } from 'src/helpers/func/buildAqpOptions';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { role, password, phone, ...rest } = createUserDto;
    const hashPassword = await getHashPassword(password);

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

    const isValidPhoneUser = isValidPhone(phone);
    if (!isValidPhoneUser) {
      throw new BadRequestException('Phone number is not valid');
    }

    const checkPhone = await this.usersRepository.findOne({
      where: { phone: phone },
    });
    if (checkPhone) {
      throw new BadRequestException('Phone number already exists');
    }

    const user = this.usersRepository.create({
      ...rest,
      role_id: checkRoles.id,
      password: hashPassword,
      phone: phone,
      createdAt: new Date(),
    });
    return this.usersRepository.save(user);
  }

  async findAll(currentPage: number, limit: number, qs: string) {
    const {
      where,
      order,
      offset,
      limit: pageLimit,
    } = buildAqpQueryOptions(qs, {
      currentPage,
      limit,
      defaultLimit: 10,
      textSearchFields: ['name', 'email'],
      exactFields: ['role_id', 'isActive'], 
      relationILike: {
        role: { relation: 'role', field: 'name' }, 
      },
      ignoreFilters: ['current', 'pageSize'],
      defaultSort: { createdAt: 'DESC' },
    });

    const totalItems = await this.usersRepository.count({ where });

    const totalPages = Math.ceil(totalItems / pageLimit);

    const result = await this.usersRepository.find({
      where,
      skip: offset,
      take: pageLimit,
      order,
    });

    return {
      meta: {
        current: currentPage,
        pageSize: pageLimit,
        pages: totalPages,
        total: totalItems,
      },
      result,
    };
  }

  findOne(id: string) {
    return this.usersRepository.findOne({
      where: { id: id },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const userUpdate = await this.usersRepository.findOne({
      where: { id },
    });

    if (!userUpdate) {
      throw new NotFoundException(`User với ID ${id} không tồn tại`);
    }

    const { role, ...rest } = updateUserDto;
    const updateData = role ? { ...rest, role_id: role } : rest;

    await this.usersRepository.update({ id }, updateData);

    return this.usersRepository.findOne({
      where: { id },
    });
  }

  async remove(id: string) {
    const foundUser = await this.usersRepository.findOneBy({
      id,
    });
    if (!foundUser) return `not found user`;

    if (foundUser && foundUser.email === EMAIL_ADMIN) {
      throw new BadRequestException(
        'Không thể Xóa tài khoản admin@gmail.com thì lấy gì test',
      );
    }

    return await this.usersRepository.update(
      { id: id },
      {
        isActive: false,
        deletedAt: new Date(),
      },
    );
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
