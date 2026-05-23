import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateAdminClassDto } from './dto/create-admin-class.dto';
import { UpdateAdminClassDto } from './dto/update-admin-class.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminClass } from './entities/admin-class.entity';
import { Repository } from 'typeorm';
import { Major } from '@/majors/entities/major.entity';
import { YearOfAdmission } from '@/year-of-admission/entities/year-of-admission.entity';
import { Teacher } from '@/users/entities/teacher.entity';
import { normalizeMajorCode, toKCode } from '@/helpers/func/previewCode';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';
import { AdminClassStatus } from '@/helpers/enum/enum.global';
import { AdminClassAdvisor } from '@/admin-class-advisor/entities/admin-class-advisor.entity';

@Injectable()
export class AdminClassService {
    constructor(
        @InjectRepository(AdminClass)
        private readonly adminClassRepository: Repository<AdminClass>,

        @InjectRepository(Major)
        private readonly majorRepo: Repository<Major>,

        @InjectRepository(YearOfAdmission)
        private readonly yearOfAdmissionRepo: Repository<YearOfAdmission>,

        @InjectRepository(Teacher)
        private readonly teacherRepo: Repository<Teacher>,

        @InjectRepository(AdminClassAdvisor)
        private readonly adminClassAdvisorRepository: Repository<AdminClassAdvisor>,
    ) {}
    async create(dto: CreateAdminClassDto) {
        const {
            name,
            capacity,
            major_id,
            yearOfAdmissionId,
            homeroomTeacherId,
        } = dto;

        // 1) Generate code + suggestedName
        const { code, suggestedName } = await this.buildAdminClassCode(
            major_id,
            yearOfAdmissionId,
        );

        // 2) name: nếu FE không nhập => dùng suggestedName
        const finalName = name?.trim() ? name.trim() : suggestedName;

        // 3) Optional check teacher
        if (homeroomTeacherId) {
            const teacher = await this.teacherRepo.findOne({
                where: { id: homeroomTeacherId },
            });

            if (!teacher) {
                throw new NotFoundException('Homeroom teacher not found');
            }
        }

        const adminClass = this.adminClassRepository.create({
            code,
            name: finalName,
            capacity: capacity ?? 50,
            major_id,
            yearOfAdmissionId,
            status: AdminClassStatus.PENDING,
        });

        try {
            const savedAdminClass =
                await this.adminClassRepository.save(adminClass);

            // 4) Nếu có GVCN thì tạo link advisor
            if (homeroomTeacherId) {
                const advisorLink = this.adminClassAdvisorRepository.create({
                    adminClassId: savedAdminClass.id,
                    teacherId: homeroomTeacherId,
                    isPrimary: true,
                    startAt: new Date(),
                    endAt: null,
                });

                await this.adminClassRepository.save(advisorLink);
            }

            return await this.adminClassRepository.findOne({
                where: { id: savedAdminClass.id },
                relations: {
                    major: true,
                    yearOfAdmission: true,
                    advisorLinks: {
                        teacher: {
                            user: true,
                        },
                    },
                },
            });
        } catch (e: any) {
            if (e?.code === '23505') {
                throw new BadRequestException(
                    'Generated class code already exists. Please try again.',
                );
            }
            throw e;
        }
    }

    async previewCode(majorId: number, yearOfAdmissionId: number) {
        return this.buildAdminClassCode(majorId, yearOfAdmissionId);
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
    //         exactFields: ['isActive'],
    //         ignoreFilters: ['current', 'pageSize'],
    //         defaultSort: { createdAt: 'DESC' },
    //     });

    //     const totalItems = await this.adminClassRepository.count({ where });

    //     const totalPages = Math.ceil(totalItems / pageLimit);

    //     const result = await this.adminClassRepository.find({
    //         where,
    //         skip: offset,
    //         take: pageLimit,
    //         order,
    //         relations: {
    //             yearOfAdmission: true,
    //             major: true,
    //             students: true,
    //         },
    //     });

    //     const data = result.map((item) => ({
    //         ...item,
    //         currentStudentCount: item.students?.length ?? 0,
    //     }));

    //     return {
    //         meta: {
    //             current: currentPage,
    //             pageSize: pageLimit,
    //             pages: totalPages,
    //             total: totalItems,
    //         },
    //         result: data,
    //     };
    // }
    async findAll(currentPage: number, limit: number, qs: string) {
        const queryParams = new URLSearchParams(qs);

        const termId = queryParams.get('termId');
        const keyword = queryParams.get('keyword')?.trim();
        const status = queryParams.get('status');
        const isActive = queryParams.get('isActive');
        const subjectId = queryParams.get('subjectId');
        const teacherSubjectId = queryParams.get('teacherSubjectId');

        const page = Number(currentPage) > 0 ? Number(currentPage) : 1;
        const pageSize = Number(limit) > 0 ? Number(limit) : 10;
        const skip = (page - 1) * pageSize;

        const qb = this.adminClassRepository
            .createQueryBuilder('adminClass')
            .leftJoinAndSelect('adminClass.yearOfAdmission', 'yearOfAdmission')
            .leftJoinAndSelect('adminClass.major', 'major')
            .leftJoinAndSelect('adminClass.students', 'students');

        if (keyword) {
            qb.andWhere(
                '(adminClass.name ILIKE :keyword OR adminClass.code ILIKE :keyword)',
                {
                    keyword: `%${keyword}%`,
                },
            );
        }

        if (status) {
            qb.andWhere('adminClass.status = :status', { status });
        }

        if (isActive !== null && isActive !== undefined && isActive !== '') {
            qb.andWhere('adminClass.isActive = :isActive', {
                isActive: isActive === 'true',
            });
        }

        /**
         * Logic đúng:
         * - Nếu chỉ có termId: vẫn có thể lấy tất cả lớp, hoặc chỉ lọc theo kỳ nếu bạn muốn
         * - Nếu có termId + subjectId: ẩn lớp đã có course offering của chính subject đó trong kỳ đó
         * - Nếu có termId + teacherSubjectId: ẩn lớp đã có course offering của subject thuộc teacherSubject đó trong kỳ đó
         */
        if (termId && subjectId) {
            qb.andWhere((subQb) => {
                const subQuery = subQb
                    .subQuery()
                    .select('co.adminClassId')
                    .from('course_offerings', 'co')
                    .innerJoin(
                        'teacher_subject',
                        'ts',
                        'ts.id = co.teacherSubjectId',
                    )
                    .where('co.termId = :termId', { termId: Number(termId) })
                    .andWhere('ts.subjectId = :subjectId', {
                        subjectId: Number(subjectId),
                    })
                    .andWhere('co.adminClassId = adminClass.id')
                    .getQuery();

                return `NOT EXISTS ${subQuery}`;
            });
        } else if (termId && teacherSubjectId) {
            qb.andWhere((subQb) => {
                const subQuery = subQb
                    .subQuery()
                    .select('co.adminClassId')
                    .from('course_offerings', 'co')
                    .innerJoin(
                        'teacher_subject',
                        'ts_existing',
                        'ts_existing.id = co.teacherSubjectId',
                    )
                    .innerJoin(
                        'teacher_subject',
                        'ts_selected',
                        'ts_selected.id = :teacherSubjectId',
                        { teacherSubjectId: Number(teacherSubjectId) },
                    )
                    .where('co.termId = :termId', { termId: Number(termId) })
                    .andWhere('ts_existing.subjectId = ts_selected.subjectId')
                    .andWhere('co.adminClassId = adminClass.id')
                    .getQuery();

                return `NOT EXISTS ${subQuery}`;
            });
        }

        qb.orderBy('adminClass.createdAt', 'DESC').skip(skip).take(pageSize);

        const [result, totalItems] = await qb.getManyAndCount();

        const totalPages = Math.ceil(totalItems / pageSize);

        const data = result.map((item) => ({
            ...item,
            currentStudentCount: item.students?.length ?? 0,
        }));

        return {
            meta: {
                current: page,
                pageSize,
                pages: totalPages,
                total: totalItems,
            },
            result: data,
        };
    }
    async findOne(id: number) {
        const adminClass = await this.adminClassRepository.findOne({
            where: { id },
            relations: {
                major: true,
                yearOfAdmission: true,
                students: {
                    user: true, // nếu student có relation user
                },
            },
        });

        if (!adminClass) {
            throw new NotFoundException(`Không tìm thấy lớp với id = ${id}`);
        }

        // format lại dữ liệu cho FE dễ dùng
        const result = {
            ...adminClass,
            studentCount: adminClass.students?.length ?? 0,
            students: adminClass.students?.map((s) => ({
                id: s.id,
                name: s.user?.name,
                email: s.user?.email,
            })),
        };

        return result;
    }

    update(id: number, updateAdminClassDto: UpdateAdminClassDto) {
        const data = updateAdminClassDto;
        return {
            data,
            masage: `This action updates a #${id} adminClass`,
        };
    }

    remove(id: number) {
        return `This action removes a #${id} adminClass`;
    }

    async buildAdminClassCode(majorId: number, yearOfAdmissionId: number) {
        const major = await this.majorRepo.findOne({ where: { id: majorId } });
        if (!major) throw new NotFoundException('Major not found');

        const year = await this.yearOfAdmissionRepo.findOne({
            where: { id: yearOfAdmissionId },
        });
        if (!year) throw new NotFoundException('YearOfAdmission not found');

        // Major: bạn nên có major.code (vd: CNTT) + major.name (vd: Công nghệ thông tin)
        const majorCode = normalizeMajorCode((major as any).code ?? major.name);
        const majorName = (major as any).name ?? majorCode;

        // YearOfAdmission: bạn có year.year (vd: 2023). Nếu có field khác thì giữ fallback.
        const yearCodeRaw =
            (year as any).code ?? (year as any).year ?? (year as any).name;

        const k = toKCode(yearCodeRaw); // "23"
        const kText = `K${k}`; // "K23"

        // đếm số lớp đã có trong cùng major + year
        const existingCount = await this.adminClassRepository.count({
            where: { major_id: majorId, yearOfAdmissionId },
        });

        const order = existingCount + 1; // 1,2,3...
        const order2 = String(order).padStart(2, '0'); // 01,02...

        const code = `${majorCode}_${kText}_${order2}`; // CNTT_K23_01
        const suggestedName = `${majorName} ${kText} lớp ${order}`; // Công nghệ thông tin K23 lớp 1

        return { code, suggestedName, order };
    }
}
