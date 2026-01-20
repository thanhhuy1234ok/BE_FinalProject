import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Term } from './entities/term.entity';
import { Repository } from 'typeorm';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(Term)
    private termsRepository: Repository<Term>,
  ) { }

  async create(createTermDto: CreateTermDto) {
    const start = new Date(createTermDto.startDate);
    const end = new Date(createTermDto.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate');
    }

    if (start.getTime() >= end.getTime()) {
      throw new BadRequestException('Start date must be before end date');
    }

    const code = createTermDto.code.trim().toUpperCase();

    const existingYearSemester = await this.termsRepository.findOne({
      where: { year: createTermDto.year, semester: createTermDto.semester },
    });
    if (existingYearSemester) {
      throw new ConflictException('A term with the same year and semester already exists');
    }

    const existingCode = await this.termsRepository.findOne({
      where: { code },
    });
    if (existingCode) {
      throw new ConflictException('A term with the same code already exists');
    }

    const term = this.termsRepository.create({ ...createTermDto, code });
    return this.termsRepository.save(term);
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
      exactFields: ['code', 'year', 'semester'],
      ignoreFilters: ['current', 'pageSize'],
      defaultSort: { createdAt: 'DESC' },
    });

    const totalItems = await this.termsRepository.count({ where });

    const totalPages = Math.ceil(totalItems / pageLimit);

    const result = await this.termsRepository.find({
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
    const term = await this.termsRepository.findOne({
      where: { id },
    });

    if (!term) {
      throw new NotFoundException(`Term with id ${id} not found`);
    }

    return term;
  }


  async update(id: number, updateTermDto: UpdateTermDto) {
    const term = await this.termsRepository.findOne({
      where: { id },
    });

    if (!term) {
      throw new NotFoundException(`Term with id ${id} not found`);
    }

    const updated = this.termsRepository.merge(term, updateTermDto);
    return await this.termsRepository.save(updated);
  }

  async remove(id: number) {
    const term = await this.termsRepository.findOne({
      where: { id },
    });

    if (!term) {
      throw new NotFoundException(`Term with id ${id} not found`);
    }

    await this.termsRepository.softDelete(id);
    return { message: `Term ${id} deleted successfully` };
  }
}
