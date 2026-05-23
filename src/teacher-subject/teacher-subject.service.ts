import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    CreateTeacherSubjectDto,
    CreateTeacherSubjectManyDto,
} from './dto/create-teacher-subject.dto';
import { UpdateTeacherSubjectDto } from './dto/update-teacher-subject.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TeacherSubject } from './entities/teacher-subject.entity';
import { In, Repository } from 'typeorm';
import { Teacher } from '@/users/entities/teacher.entity';
import { Subject } from '@/subjects/entities/subject.entity';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';

@Injectable()
export class TeacherSubjectService {
    constructor(
        @InjectRepository(TeacherSubject)
        private readonly teacherSubRepo: Repository<TeacherSubject>,

        @InjectRepository(Teacher)
        private readonly teacherRepo: Repository<Teacher>,

        @InjectRepository(Subject)
        private readonly subjectRepo: Repository<Subject>,
    ) {}
    // async create(createTeacherSubjectDto: CreateTeacherSubjectDto) {
    //     const { teacherId, subjectId } = createTeacherSubjectDto;

    //     // check duplicate
    //     const exist = await this.teacherSubRepo.findOne({
    //         where: {
    //             teacherId,
    //             subjectId,
    //         },
    //     });

    //     if (exist) {
    //         throw new BadRequestException('Giáo viên đã được gán môn học này');
    //     }

    //     const teacherSubject = this.teacherSubRepo.create({
    //         teacherId,
    //         subjectId,
    //     });

    //     return this.teacherSubRepo.save(teacherSubject);
    // }

    async createManySub(dto: CreateTeacherSubjectManyDto) {
        console.log(dto);
        const { teacherId, subjectIds } = dto;

        if (!teacherId) {
            throw new BadRequestException('teacherId không được để trống');
        }

        if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
            throw new BadRequestException(
                'Danh sách môn học không được để trống',
            );
        }

        // loại bỏ subjectId trùng trong request
        const uniqueSubjectIds = [...new Set(subjectIds)];

        const teacher = await this.teacherRepo.findOne({
            where: { user_id: teacherId },
        });

        if (!teacher) {
            throw new NotFoundException('Không tìm thấy giáo viên');
        }

        const subjects = await this.subjectRepo.find({
            where: {
                id: In(uniqueSubjectIds),
            },
        });

        if (subjects.length !== uniqueSubjectIds.length) {
            const foundIds = subjects.map((s) => s.id);
            const missingIds = uniqueSubjectIds.filter(
                (id) => !foundIds.includes(id),
            );

            throw new BadRequestException(
                `Không tìm thấy môn học với id: ${missingIds.join(', ')}`,
            );
        }

        // nếu muốn giữ rule teacher chỉ dạy subject cùng department
        const invalidSubjects = subjects.filter(
            (subject) => subject.department_id !== teacher.department_id,
        );

        if (invalidSubjects.length > 0) {
            throw new BadRequestException(
                `Các môn không thuộc bộ môn của giáo viên: ${invalidSubjects
                    .map((s) => s.name)
                    .join(', ')}`,
            );
        }

        const existing = await this.teacherSubRepo.find({
            where: {
                teacherId,
                subjectId: In(uniqueSubjectIds),
            },
        });

        const existingSubjectIds = existing.map((e) => e.subjectId);

        const newSubjectIds = uniqueSubjectIds.filter(
            (id) => !existingSubjectIds.includes(id),
        );

        if (newSubjectIds.length === 0) {
            throw new BadRequestException(
                'Các môn đã được gán cho giáo viên trước đó',
            );
        }

        const entities = newSubjectIds.map((subjectId) =>
            this.teacherSubRepo.create({
                teacherId,
                subjectId,
            }),
        );

        const saved = await this.teacherSubRepo.save(entities);

        return {
            message: 'Gán môn học cho giáo viên thành công',
            data: {
                teacherId,
                insertedCount: saved.length,
                insertedSubjectIds: newSubjectIds,
                skippedSubjectIds: existingSubjectIds,
            },
        };
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
            textSearchFields: [],
            exactFields: ['isActive'],
            relationILike: {
                teacher: { relation: 'teacher', field: 'name' },
                subject: { relation: 'subject', field: 'name' },
                subjectCode: { relation: 'subject', field: 'code' },
            },
            ignoreFilters: [
                'current',
                'pageSize',
                'teacherId',
                'subjectId',
                'departmentId',
            ],
            defaultSort: { createdAt: 'DESC' },
        });

        const queryParams = new URLSearchParams(qs);
        const teacherId = queryParams.get('teacherId');
        const subjectId = queryParams.get('subjectId');
        const departmentId = queryParams.get('departmentId');

        const finalWhere: any = { ...where };

        if (teacherId) {
            finalWhere.teacher = {
                ...(finalWhere.teacher || {}),
                id: +teacherId,
            };
        }

        if (subjectId) {
            finalWhere.subject = {
                ...(finalWhere.subject || {}),
                id: +subjectId,
            };
        }

        if (departmentId) {
            finalWhere.subject = {
                ...(finalWhere.subject || {}),
                department: { id: +departmentId },
            };
        }

        const totalItems = await this.teacherSubRepo.count({
            where: finalWhere,
            relations: {
                teacher: true,
                subject: {
                    department: true,
                },
            },
        });

        const totalPages = Math.ceil(totalItems / pageLimit);

        const result = await this.teacherSubRepo.find({
            where: finalWhere,
            skip: offset,
            take: pageLimit,
            order,
            relations: {
                teacher: {
                    user: true,
                },
                subject: {
                    department: true,
                },
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
        return `This action returns a #${id} teacherSubject`;
    }

    update(id: number, updateTeacherSubjectDto: UpdateTeacherSubjectDto) {
        return `This action updates a #${id} teacherSubject`;
    }

    remove(id: number) {
        return `This action removes a #${id} teacherSubject`;
    }
}
