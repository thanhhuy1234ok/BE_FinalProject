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

    // async findAll(currentPage: number, limit: number, qs: string) {
    //     const {
    //         where,
    //         order,
    //         offset,
    //         limit: pageLimit,
    //     } = buildAqpQueryOptions(qs, {
    //         currentPage,
    //         limit,
    //         defaultLimit: 10,
    //         textSearchFields: ['name', 'code'],
    //         exactFields: ['isActive', 'facultyId'],
    //         ignoreFilters: ['current', 'pageSize'],
    //         defaultSort: { createdAt: 'DESC' },
    //     });

    //     const totalItems = await this.departmentRepo.count({ where });

    //     const totalPages = Math.ceil(totalItems / pageLimit);

    //     const result = await this.departmentRepo.find({
    //         where,
    //         skip: offset,
    //         take: pageLimit,
    //         order,
    //     });

    //     return {
    //         meta: {
    //             current: currentPage,
    //             pageSize: pageLimit,
    //             pages: totalPages,
    //             total: totalItems,
    //         },
    //         result,
    //     };
    // }

    async findAll(currentPage: number, limit: number, qs: string) {
        const {
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

        const queryParams = new URLSearchParams(qs);
        const name = queryParams.get('name');
        const code = queryParams.get('code');
        const isActive = queryParams.get('isActive');
        const facultyId = queryParams.get('facultyId');

        const qb = this.departmentRepo
            .createQueryBuilder('department')
            .leftJoin('department.teachers', 'teacher')
            .leftJoin('department.majors', 'major')
            .leftJoin('major.students', 'student')
            .select([
                'department.id AS id',
                'department.name AS name',
                'department.code AS code',
                'department.description AS description',
                'department.isActive AS "isActive"',
                'department.facultyId AS "facultyId"',
                'department.createdAt AS "createdAt"',
                'department.updatedAt AS "updatedAt"',
                'COUNT(DISTINCT teacher.id) AS "teacherCount"',
                'COUNT(DISTINCT student.id) AS "studentCount"',
            ]);

        if (name) {
            qb.andWhere('department.name ILIKE :name', {
                name: `%${name}%`,
            });
        }

        if (code) {
            qb.andWhere('department.code ILIKE :code', {
                code: `%${code}%`,
            });
        }

        if (isActive !== null && isActive !== '') {
            qb.andWhere('department.isActive = :isActive', {
                isActive: isActive === 'true',
            });
        }

        if (facultyId) {
            qb.andWhere('department.facultyId = :facultyId', {
                facultyId: Number(facultyId),
            });
        }

        qb.groupBy('department.id')
            .addGroupBy('department.name')
            .addGroupBy('department.code')
            .addGroupBy('department.description')
            .addGroupBy('department.isActive')
            .addGroupBy('department.facultyId')
            .addGroupBy('department.createdAt')
            .addGroupBy('department.updatedAt');

        const [orderKey, orderValue] = Object.entries(order ?? {})[0] ?? [
            'createdAt',
            'DESC',
        ];

        qb.orderBy(`department.${orderKey}`, orderValue as 'ASC' | 'DESC');

        const countQb = this.departmentRepo.createQueryBuilder('department');

        if (name) {
            countQb.andWhere('department.name ILIKE :name', {
                name: `%${name}%`,
            });
        }

        if (code) {
            countQb.andWhere('department.code ILIKE :code', {
                code: `%${code}%`,
            });
        }

        if (isActive !== null && isActive !== '') {
            countQb.andWhere('department.isActive = :isActive', {
                isActive: isActive === 'true',
            });
        }

        if (facultyId) {
            countQb.andWhere('department.facultyId = :facultyId', {
                facultyId: Number(facultyId),
            });
        }

        const totalItems = await countQb.getCount();
        const totalPages = Math.ceil(totalItems / pageLimit);

        qb.skip(offset).take(pageLimit);

        const rawResult = await qb.getRawMany();

        const result = rawResult.map((item) => ({
            id: Number(item.id),
            name: item.name,
            code: item.code,
            description: item.description,
            isActive: item.isActive,
            facultyId: Number(item.facultyId),
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            teacherCount: Number(item.teacherCount || 0),
            studentCount: Number(item.studentCount || 0),
        }));

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
