import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';

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
      name,
      description,
      isActive,
      // permissions: permissionsEntities,
      createdAt: new Date(),
    });

    return await this.roleRepository.save(newRole);
  }

  findAll() {
    return `This action returns all roles`;
  }

  findOne(id: number) {
    return this.roleRepository.findOne({ where: { id } });
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    return `This action updates a #${id} role`;
  }

  remove(id: number) {
    return `This action removes a #${id} role`;
  }
}
