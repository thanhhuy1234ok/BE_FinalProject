import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';
import { ADMIN_ROLE } from 'src/helpers/types/constans';
import { buildAqpQueryOptions } from 'src/helpers/func/buildAqpOptions';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    const { name, description, isActive } = createRoleDto;

    const isCheckName = await this.roleRepository.findOne({
      where: { name: name },
    });

    if (isCheckName) {
      throw new BadRequestException(`${name} đã tồn tại`);
    }
    const newRole = await this.roleRepository.create({
      name: name.toLocaleLowerCase(),
      description,
      isActive,
      // permissions: permissionsEntities,
      createdAt: new Date(),
    });

    return await this.roleRepository.save(newRole);
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
      textSearchFields: ['name'],
      exactFields: ['isActive'], 
      ignoreFilters: ['current', 'pageSize'],
      defaultSort: { createdAt: 'DESC' },
    });

    const totalItems = await this.roleRepository.count({ where });

    const totalPages = Math.ceil(totalItems / pageLimit);

    const result = await this.roleRepository.find({
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
  findOne(id: number) {
    return this.roleRepository.findOne({ where: { id } });
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with id #${id} not found`);
    }
    Object.assign(role, updateRoleDto);
    return this.roleRepository.save(role);
  }

  async remove(id: number) {
    const foundRole = await this.roleRepository.findOne({
      where: { id },
    });

    if (foundRole.name === ADMIN_ROLE) {
      throw new BadRequestException('Không thể role ADMIN');
    }

    return await this.roleRepository.update(
      { id },
      {
        deletedAt: new Date(),
        isActive: false,
      },
    );
  }
}
