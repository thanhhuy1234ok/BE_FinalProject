import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Faculty } from './entities/faculty.entity';
import { Repository } from 'typeorm';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';

@Injectable()
export class FacultyService {
    constructor(
        @InjectRepository(Faculty)
        private facultyRepository: Repository<Faculty>,
    ) {}
    async create(dto: CreateFacultyDto) {
        const existed = await this.facultyRepository.findOne({
            where: { code: dto.code },
            select: { id: true }, // tối ưu query
        });

        if (existed) {
            throw new BadRequestException(
                `Faculty code "${dto.code}" already exists`,
            );
        }

        return await this.facultyRepository.save(dto);
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
            textSearchFields: ['name', 'code'], // ❌ bỏ year_of_admission_id
            exactFields: ['isActive'],
            ignoreFilters: ['current', 'pageSize'],
            defaultSort: { createdAt: 'DESC' },
        });

        const [result, totalItems] = await this.facultyRepository.findAndCount({
            where,
            skip: offset,
            take: pageLimit,
            order,
        });

        const totalPages = Math.ceil(totalItems / pageLimit);

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
        const faculty = await this.facultyRepository.findOne({
            where: { id },
        });

        if (!faculty) {
            throw new NotFoundException(`Faculty with id ${id} not found`);
        }

        return faculty;
    }
    update(id: number, updateFacultyDto: UpdateFacultyDto) {
        return `This action updates a #${id} faculty`;
    }

    remove(id: number) {
        return `This action removes a #${id} faculty`;
    }

    async getFacultyStats(facultyId: number) {
        const countFaculty = await this.facultyRepository
            .createQueryBuilder('faculty')
            .leftJoin('faculty.departments', 'department')
            .leftJoin('department.teachers', 'teacher')
            .leftJoin('department.majors', 'major')
            .leftJoin('major.students', 'student')
            .where('faculty.id = :facultyId', { facultyId })
            .select([
                'faculty.id AS id',
                'COUNT(DISTINCT department.id) AS "departmentCount"',
                'COUNT(DISTINCT teacher.id) AS "teacherCount"',
                'COUNT(DISTINCT student.id) AS "studentCount"',
            ])
            .groupBy('faculty.id')
            .getRawOne();

        const result = {
            id: Number(countFaculty?.id || facultyId),
            departmentCount: Number(countFaculty?.departmentCount || 0),
            teacherCount: Number(countFaculty?.teacherCount || 0),
            studentCount: Number(countFaculty?.studentCount || 0),
        };

        return {
            result,
        };
    }
}
