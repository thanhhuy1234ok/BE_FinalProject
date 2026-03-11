import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { Repository } from 'typeorm';
import { generateDeptSmartCode } from '@/helpers/func/string.untits';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';

@Injectable()
export class DepartmentsService {
    constructor(
        @InjectRepository(Department)
        private readonly departmentRepo: Repository<Department>,
    ) {}
    async create(dto: CreateDepartmentDto) {
        const name = dto.name.trim();

        // 1️⃣ check duplicate name
        const existed = await this.departmentRepo.findOne({
            where: { name },
        });
        if (existed) {
            throw new BadRequestException('Department name already exists');
        }

        // 2️⃣ generate base code
        const baseCode = generateDeptSmartCode(name);

        // 3️⃣ tìm code khả dụng
        let finalCode = baseCode;
        let counter = 2;

        while (true) {
            const conflict = await this.departmentRepo.findOne({
                where: { code: finalCode },
            });

            if (!conflict) break;

            finalCode = `${baseCode}-${counter}`;
            counter++;
        }

        // 4️⃣ create department
        const department = this.departmentRepo.create({
            ...dto,
            name,
            code: finalCode,
        });

        return await this.departmentRepo.save(department);
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
            exactFields: ['isActive', 'facultyId'],
            ignoreFilters: ['current', 'pageSize'],
            defaultSort: { createdAt: 'DESC' },
        });

        const totalItems = await this.departmentRepo.count({ where });

        const totalPages = Math.ceil(totalItems / pageLimit);

        const result = await this.departmentRepo.find({
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
        const detail = await this.departmentRepo.findOne({
            where: { id },
        });

        return detail;
    }

    update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
        return `This action updates a #${id} department`;
    }

    remove(id: number) {
        return `This action removes a #${id} department`;
    }
}
