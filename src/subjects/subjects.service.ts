import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Subject } from './entities/subject.entity';
import { Repository } from 'typeorm';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';
import { EMAIL_ADMIN } from '@/helpers/types/constans';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
  ) { }


  async create(createSubjectDto: CreateSubjectDto) {
    const checkCode = await this.subjectRepository.findOne({
      where: { code: createSubjectDto.code, name: createSubjectDto.name },
    });
    if (checkCode) {
      throw new Error('Subject already exists');
    }

    return this.subjectRepository.save({
      ...createSubjectDto,
      code: createSubjectDto.code.toUpperCase(),
    });
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
      textSearchFields: ['name', 'code'],
      exactFields: ['isActive'],
      ignoreFilters: ['current', 'pageSize'],
      defaultSort: { createdAt: 'DESC' },
    });

    const totalItems = await this.subjectRepository.count({ where });

    const totalPages = Math.ceil(totalItems / pageLimit);

    const result = await this.subjectRepository.find({
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
    return this.subjectRepository.findOne({
      where: { id: id },
    });
  }

  async update(id: number, updateSubjectDto: UpdateSubjectDto) {
    const subjectUpdate = await this.subjectRepository.findOne({
      where: { id },
    });

    if (!subjectUpdate) {
      throw new NotFoundException(`Subject với ID ${id} không tồn tại`);
    }
    await this.subjectRepository.update({ id }, updateSubjectDto);

    return this.subjectRepository.findOne({
      where: { id },
    });
  }

  async remove(id: number) {
    const foundSubject = await this.subjectRepository.findOneBy({
      id,
    });
    if (!foundSubject) return `not found subject`;

    return await this.subjectRepository.update(
      { id: id },
      {
        isActive: false,
        deletedAt: new Date(),
      },
    );
  }
}
