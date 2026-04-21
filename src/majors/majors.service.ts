import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateMajorDto } from './dto/create-major.dto';
import { UpdateMajorDto } from './dto/update-major.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Major } from './entities/major.entity';
import { Repository } from 'typeorm';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';

@Injectable()
export class MajorsService {
    constructor(
        @InjectRepository(Major)
        private readonly majorRepository: Repository<Major>,
    ) {}

    async create(createMajorDto: CreateMajorDto) {
        const checkCode = await this.majorRepository.findOne({
            where: { code: createMajorDto.code },
        });

        if (checkCode) {
            throw new BadRequestException('Code đã tồn tại');
        }

        const major = this.majorRepository.create(createMajorDto);
        return await this.majorRepository.save(major);
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
            exactFields: ['isActive', 'department_id'],
            ignoreFilters: ['current', 'pageSize'],
            defaultSort: { createdAt: 'DESC' },
        });

        const totalItems = await this.majorRepository.count({ where });

        const totalPages = Math.ceil(totalItems / pageLimit);

        const result = await this.majorRepository.find({
            where,
            skip: offset,
            take: pageLimit,
            order,
            relations: {
                department: true,
            },
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
        const major = await this.majorRepository.findOne({
            where: { id },
            relations: {
                department: {
                    faculty: true,
                },
                adminClasses: {
                    yearOfAdmission: true,
                },
                curriculums: {
                    yearOfAdmission: true,
                },
                students: true,
            },
        });

        if (!major) {
            throw new NotFoundException('Không tìm thấy chuyên ngành');
        }

        return major;
    }

    async update(id: number, updateMajorDto: UpdateMajorDto) {
        const major = await this.majorRepository.findOne({ where: { id } });
        if (!major) {
            throw new NotFoundException(`major with id #${id} not found`);
        }
        Object.assign(major, updateMajorDto);
        return this.majorRepository.save(major);
    }

    async remove(id: number) {
        return await this.majorRepository.update(
            { id },
            {
                deletedAt: new Date(),
                isActive: false,
            },
        );
    }
}
