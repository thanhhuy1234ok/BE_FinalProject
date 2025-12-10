import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateYearOfAdmissionDto } from './dto/create-year-of-admission.dto';
import { UpdateYearOfAdmissionDto } from './dto/update-year-of-admission.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { YearOfAdmission } from './entities/year-of-admission.entity';
import { Repository } from 'typeorm';
import { buildAqpQueryOptions } from 'src/helpers/func/buildAqpOptions';

@Injectable()
export class YearOfAdmissionService {
  constructor(
    @InjectRepository(YearOfAdmission)
    private yearOfAdmissionRepository: Repository<YearOfAdmission>,
  ) {}
  async create(createYearOfAdmissionDto: CreateYearOfAdmissionDto) {
    const { year, expectedGraduationYear, code } = createYearOfAdmissionDto;

    // 1. Validate kiểu số
    if (!Number.isInteger(year)) {
      throw new BadRequestException('Năm nhập học phải là số nguyên');
    }

    if (!Number.isInteger(expectedGraduationYear)) {
      throw new BadRequestException('Năm tốt nghiệp dự kiến phải là số nguyên');
    }

    // 2. Validate khoảng giá trị hợp lý (một trường đại học)
    if (year < 2000 || year > 2100) {
      throw new BadRequestException(
        'Năm nhập học phải nằm trong khoảng 2000–2100',
      );
    }

    if (expectedGraduationYear < 2000 || expectedGraduationYear > 2100) {
      throw new BadRequestException(
        'Năm tốt nghiệp dự kiến phải nằm trong khoảng 2000–2100',
      );
    }

    // 3. Năm kết thúc phải > năm bắt đầu
    if (expectedGraduationYear <= year) {
      throw new BadRequestException(
        'Năm tốt nghiệp dự kiến phải lớn hơn năm nhập học',
      );
    }

    // 4. Check trùng năm nhập học
    const existsYear = await this.yearOfAdmissionRepository.findOne({
      where: { year },
    });

    if (existsYear) {
      throw new BadRequestException('Năm nhập học này đã tồn tại');
    }

    // 5. Check trùng combination (year + expectedGraduationYear)
    const existsPair = await this.yearOfAdmissionRepository.findOne({
      where: {
        year,
        expectedGraduationYear,
      },
    });

    if (existsPair) {
      throw new BadRequestException(
        'Khoá học với năm bắt đầu và kết thúc này đã tồn tại',
      );
    }

    // 6. Generate code nếu FE không gửi (VD: K23)
    let finalCode = code;
    if (!finalCode) {
      finalCode = `K${year % 100}`; // 2023 → K23
    }

    // 7. Check trùng code
    const existsCode = await this.yearOfAdmissionRepository.findOne({
      where: { code: finalCode },
    });

    if (existsCode) {
      throw new BadRequestException(`Code khóa học "${finalCode}" đã tồn tại`);
    }

    // 8. Tạo cohort
    const cohort = this.yearOfAdmissionRepository.create({
      ...createYearOfAdmissionDto,
      code: finalCode,
    });

    return this.yearOfAdmissionRepository.save(cohort);
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
      textSearchFields: ['year', 'code'],
      ignoreFilters: ['current', 'pageSize'],
      defaultSort: { createdAt: 'DESC' },
    });

    const totalItems = await this.yearOfAdmissionRepository.count({ where });

    const totalPages = Math.ceil(totalItems / pageLimit);

    const result = await this.yearOfAdmissionRepository.find({
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
    return this.yearOfAdmissionRepository.findOne({ where: { id } });
  }

  async update(id: number, updateYearOfAdmissionDto: UpdateYearOfAdmissionDto) {
     const yearOfAdmin = await this.yearOfAdmissionRepository.findOne({ where: { id } });
        if (!yearOfAdmin) {
          throw new NotFoundException(`yearOfAdmin with id #${id} not found`);
        }
        Object.assign(yearOfAdmin, updateYearOfAdmissionDto);
        return this.yearOfAdmissionRepository.save(yearOfAdmin);
  }

}
