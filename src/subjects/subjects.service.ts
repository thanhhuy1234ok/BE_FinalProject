import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Subject } from './entities/subject.entity';
import { Repository } from 'typeorm';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';
import { EMAIL_ADMIN } from '@/helpers/types/constans';
import { Department } from '@/departments/entities/department.entity';

@Injectable()
export class SubjectsService {
    constructor(
        @InjectRepository(Subject)
        private readonly subjectRepository: Repository<Subject>,

        @InjectRepository(Department)
        private readonly departmentRepo: Repository<Department>,
    ) {}

    async create(createSubjectDto: CreateSubjectDto) {
        const name = createSubjectDto.name.trim().replace(/\s+/g, ' ');
        const code = createSubjectDto.code.trim().toUpperCase();
        const departmentId = createSubjectDto.department_id;

        // check department tồn tại
        const department = await this.departmentRepo.findOne({
            where: { id: departmentId },
        });

        if (!department) {
            throw new NotFoundException('Bộ môn không tồn tại');
        }

        // check trùng code
        const existedCode = await this.subjectRepository.findOne({
            where: { code },
        });

        if (existedCode) {
            throw new BadRequestException('Mã môn học đã tồn tại');
        }

        const subject = this.subjectRepository.create({
            ...createSubjectDto,
            name,
            code,
            department_id: departmentId,
        });

        return await this.subjectRepository.save(subject);
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

        const totalItems = await this.subjectRepository.count({ where });

        const totalPages = Math.ceil(totalItems / pageLimit);

        const result = await this.subjectRepository.find({
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
