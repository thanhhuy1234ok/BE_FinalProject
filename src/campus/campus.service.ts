import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCampusDto } from './dto/create-campus.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Campus } from './entities/campus.entity';
import { Repository } from 'typeorm';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';

@Injectable()
export class CampusService {
  constructor(
    @InjectRepository(Campus)
    private campusRepository: Repository<Campus>,
  ) { }
  async create(createCampusDto: CreateCampusDto) {
    const { code } = createCampusDto;
    const existingCampus = await this.campusRepository.findOne({ where: { code } });
    if (existingCampus) {
      throw new NotFoundException('Campus with this code already exists');
    }
    const checkAddress = await this.campusRepository.findOne({ where: { address: createCampusDto.address } });
    if (checkAddress) {
      throw new NotFoundException('Campus with this address already exists');
    }
    const campus = this.campusRepository.create(createCampusDto);
    return await this.campusRepository.save(campus);
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
      textSearchFields: ['name', "address"],
      exactFields: ['code', 'is_active'],
      ignoreFilters: ['current', 'pageSize'],
      defaultSort: { createdAt: 'DESC' },
    });

    const totalItems = await this.campusRepository.count({ where });

    const totalPages = Math.ceil(totalItems / pageLimit);

    const result = await this.campusRepository.find({
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

  async findOne(id: number) {
    const campus = await this.campusRepository.findOne({
      where: { id },
    });

    if (!campus) {
      throw new NotFoundException('Campus not found');
    }

    return campus;
  }

  async update(id: number, updateCampusDto: UpdateCampusDto) {
    const campus = await this.findOne(id);

    Object.assign(campus, updateCampusDto);
    return await this.campusRepository.save(campus);
  }

  async remove(id: number) {
    const campus = await this.findOne(id);

    campus.is_active = false; // soft delete
    campus.deletedAt = new Date();
    return await this.campusRepository.save(campus);
  }
}