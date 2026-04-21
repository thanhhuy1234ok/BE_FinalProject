import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    BulkUpdateCourseOfferingStatusDto,
    CreateCourseOfferingDto,
} from './dto/create-course-offering.dto';
import { UpdateCourseOfferingDto } from './dto/update-course-offering.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseOffering } from './entities/course-offering.entity';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';

import { Term } from '@/terms/entities/term.entity';
import { TeacherSubject } from '@/teacher-subject/entities/teacher-subject.entity';
import { AdminClass } from '@/admin-class/entities/admin-class.entity';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';
import {
    AdminClassStatus,
    CourseOfferingStatus,
    RegistrationStatus,
} from '@/helpers/enum/enum.global';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';

@Injectable()
export class CourseOfferingService {
    constructor(
        @InjectRepository(CourseOffering)
        private courseOfferingRepository: Repository<CourseOffering>,

        @InjectRepository(TeacherSubject)
        private readonly teacherSubjectRepository: Repository<TeacherSubject>,

        @InjectRepository(Term)
        private termsRepository: Repository<Term>,

        @InjectRepository(AdminClass)
        private readonly adminClassRepository: Repository<AdminClass>,
        private readonly dataSource: DataSource,
    ) {}
    async create(createCourseOfferingDto: CreateCourseOfferingDto) {
        const {
            teacherSubjectId,
            termId,
            adminClassId,
            maxStudents = 60,
        } = createCourseOfferingDto;

        return await this.dataSource.transaction(async (manager) => {
            const teacherSubject = await manager.findOne(TeacherSubject, {
                where: { id: teacherSubjectId },
                relations: {
                    teacher: true,
                    subject: true,
                },
            });

            if (!teacherSubject) {
                throw new NotFoundException(
                    'Không tìm thấy phân công giảng dạy cho giảng viên và môn học',
                );
            }

            const term = await manager.findOne(Term, {
                where: { id: termId },
            });

            if (!term) {
                throw new NotFoundException('Không tìm thấy học kỳ');
            }

            let adminClass: AdminClass | null = null;

            if (adminClassId != null) {
                adminClass = await manager.findOne(AdminClass, {
                    where: { id: adminClassId },
                    relations: {
                        students: true,
                    },
                });

                if (!adminClass) {
                    throw new NotFoundException(
                        'Không tìm thấy lớp hành chính',
                    );
                }

                if (adminClass.status === AdminClassStatus.GRADUATED) {
                    throw new BadRequestException(
                        'Không thể tạo lớp học phần cho lớp hành chính đã tốt nghiệp',
                    );
                }
            }

            if (maxStudents <= 0) {
                throw new BadRequestException('Sĩ số tối đa phải lớn hơn 0');
            }

            const subjectCode = teacherSubject.subject?.code?.trim();
            if (!subjectCode) {
                throw new BadRequestException(
                    'Môn học chưa có mã môn, không thể tự sinh mã lớp học phần',
                );
            }

            const code = await this.generateCourseOfferingCode(
                subjectCode,
                term.semester,
                term.year,
            );

            const courseOffering = manager.create(CourseOffering, {
                code,
                teacherSubjectId,
                termId,
                adminClassId: adminClassId ?? null,
                maxStudents,
                enrolledCount: 0,
                status: CourseOfferingStatus.CREATED,
            });

            let savedCourseOffering: CourseOffering;

            try {
                savedCourseOffering = await manager.save(
                    CourseOffering,
                    courseOffering,
                );
            } catch (error: any) {
                if (error?.code === '23505') {
                    throw new ConflictException(
                        'Mã lớp học phần vừa được tạo đã bị trùng. Vui lòng thử lại',
                    );
                }
                throw error;
            }

            if (adminClass?.students?.length) {
                const registrations = adminClass.students.map((student) =>
                    manager.create(CourseRegistration, {
                        studentId: student.id,
                        courseOfferingId: savedCourseOffering.id,
                        status: RegistrationStatus.REGISTERED,
                    }),
                );

                await manager.save(CourseRegistration, registrations);

                savedCourseOffering.enrolledCount = registrations.length;

                if (registrations.length > 0) {
                    savedCourseOffering.status = CourseOfferingStatus.OPEN;
                }

                await manager.save(CourseOffering, savedCourseOffering);
            }

            return await manager.findOne(CourseOffering, {
                where: { id: savedCourseOffering.id },
                relations: {
                    term: true,
                    adminClass: true,
                    teacherSubject: {
                        subject: true,
                        teacher: {
                            user: true,
                        },
                    },
                    courseRegistrations: {
                        student: {
                            user: true,
                        },
                    },
                },
            });
        });
    }
    // async create(createCourseOfferingDto: CreateCourseOfferingDto) {
    //     const {
    //         teacherSubjectId,
    //         termId,
    //         adminClassId,
    //         maxStudents = 60,
    //     } = createCourseOfferingDto;

    //     const teacherSubject = await this.teacherSubjectRepository.findOne({
    //         where: { id: teacherSubjectId },
    //         relations: {
    //             teacher: true,
    //             subject: true,
    //         },
    //     });

    //     if (!teacherSubject) {
    //         throw new NotFoundException(
    //             'Không tìm thấy phân công giảng dạy cho giảng viên và môn học',
    //         );
    //     }

    //     const term = await this.termsRepository.findOne({
    //         where: { id: termId },
    //     });

    //     if (!term) {
    //         throw new NotFoundException('Không tìm thấy học kỳ');
    //     }

    //     let adminClass: AdminClass | null = null;
    //     if (adminClassId != null) {
    //         adminClass = await this.adminClassRepository.findOne({
    //             where: { id: adminClassId },
    //         });

    //         if (!adminClass) {
    //             throw new NotFoundException('Không tìm thấy lớp hành chính');
    //         }

    //         if (adminClass.status === AdminClassStatus.GRADUATED) {
    //             throw new BadRequestException(
    //                 'Không thể tạo lớp học phần cho lớp hành chính đã tốt nghiệp',
    //             );
    //         }
    //     }

    //     if (maxStudents <= 0) {
    //         throw new BadRequestException('Sĩ số tối đa phải lớn hơn 0');
    //     }

    //     const subjectCode = teacherSubject.subject?.code?.trim();
    //     if (!subjectCode) {
    //         throw new BadRequestException(
    //             'Môn học chưa có mã môn, không thể tự sinh mã lớp học phần',
    //         );
    //     }

    //     const code = await this.generateCourseOfferingCode(
    //         subjectCode,
    //         term.semester,
    //         term.year,
    //     );

    //     const courseOffering = this.courseOfferingRepository.create({
    //         code,
    //         teacherSubjectId,
    //         termId,
    //         adminClassId: adminClassId ?? null,
    //         maxStudents,
    //         enrolledCount: 0,
    //         status: CourseOfferingStatus.CREATED,
    //     });

    //     try {
    //         return await this.courseOfferingRepository.save(courseOffering);
    //     } catch (error: any) {
    //         if (error?.code === '23505') {
    //             throw new ConflictException(
    //                 'Mã lớp học phần vừa được tạo đã bị trùng. Vui lòng thử lại',
    //             );
    //         }
    //         throw error;
    //     }
    // }

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
    //         exactFields: [
    //             'teacherSubjectId',
    //             'termId',
    //             'adminClassId',
    //             'isActive',
    //         ],
    //         relationILike: {
    //             adminClass: { relation: 'adminClass', field: 'name' },
    //             term: { relation: 'term', field: 'semester' },
    //         },
    //         ignoreFilters: ['current', 'pageSize'],
    //         defaultSort: { id: 'DESC' },
    //     });

    //     const totalItems = await this.courseOfferingRepository.count({
    //         where,
    //         withDeleted: true,
    //     });

    //     const totalPages = Math.ceil(totalItems / pageLimit);

    //     const result = await this.courseOfferingRepository.find({
    //         where,
    //         skip: offset,
    //         take: pageLimit,
    //         withDeleted: true,
    //         order,
    //         relations: {
    //             term: true,
    //             adminClass: true,
    //             teacherSubject: {
    //                 teacher: {
    //                     user: true,
    //                 },
    //                 subject: true,
    //             },
    //         },
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
        const queryParams = new URLSearchParams(qs);

        const page = Number(currentPage) > 0 ? Number(currentPage) : 1;
        const pageSize = Number(limit) > 0 ? Number(limit) : 10;
        const skip = (page - 1) * pageSize;

        const teacherSubjectId = queryParams.get('teacherSubjectId');
        const termId = queryParams.get('termId');
        const adminClassId = queryParams.get('adminClassId');
        const isActive = queryParams.get('isActive');

        const subjectName = queryParams.get('subject');
        const teacherName = queryParams.get('teacherName');
        const adminClassName = queryParams.get('adminClassName');
        const semester = queryParams.get('semester');
        const code = queryParams.get('code');
        const keyword = queryParams.get('keyword');

        const sort = queryParams.get('sort') || 'id';
        const order =
            (queryParams.get('order') || 'DESC').toUpperCase() === 'ASC'
                ? 'ASC'
                : 'DESC';

        const baseQb = this.courseOfferingRepository
            .createQueryBuilder('courseOffering')
            .withDeleted()
            .leftJoinAndSelect('courseOffering.term', 'term')
            .leftJoinAndSelect('courseOffering.adminClass', 'adminClass')
            .leftJoinAndSelect(
                'courseOffering.teacherSubject',
                'teacherSubject',
            )
            .leftJoinAndSelect('teacherSubject.subject', 'subject')
            .leftJoinAndSelect('teacherSubject.teacher', 'teacher')
            .leftJoinAndSelect('teacher.user', 'teacherUser')
            .leftJoin('courseOffering.schedules', 'schedule');

        if (teacherSubjectId) {
            baseQb.andWhere(
                'courseOffering.teacherSubjectId = :teacherSubjectId',
                {
                    teacherSubjectId: Number(teacherSubjectId),
                },
            );
        }

        if (termId) {
            baseQb.andWhere('courseOffering.termId = :termId', {
                termId: Number(termId),
            });
        }

        if (adminClassId) {
            baseQb.andWhere('courseOffering.adminClassId = :adminClassId', {
                adminClassId: Number(adminClassId),
            });
        }

        if (isActive !== null && isActive !== '') {
            baseQb.andWhere('courseOffering.isActive = :isActive', {
                isActive: isActive === 'true',
            });
        }

        if (code?.trim()) {
            baseQb.andWhere('LOWER(courseOffering.code) LIKE LOWER(:code)', {
                code: `%${code.trim()}%`,
            });
        }

        if (subjectName?.trim()) {
            baseQb.andWhere('LOWER(subject.name) LIKE LOWER(:subjectName)', {
                subjectName: `%${subjectName.trim()}%`,
            });
        }

        if (teacherName?.trim()) {
            baseQb.andWhere(
                'LOWER(teacherUser.name) LIKE LOWER(:teacherName)',
                {
                    teacherName: `%${teacherName.trim()}%`,
                },
            );
        }

        if (adminClassName?.trim()) {
            baseQb.andWhere(
                'LOWER(adminClass.name) LIKE LOWER(:adminClassName)',
                {
                    adminClassName: `%${adminClassName.trim()}%`,
                },
            );
        }

        if (semester?.trim()) {
            baseQb.andWhere('LOWER(term.semester) LIKE LOWER(:semester)', {
                semester: `%${semester.trim()}%`,
            });
        }

        if (keyword?.trim()) {
            baseQb.andWhere(
                `(
                LOWER(courseOffering.code) LIKE LOWER(:keyword)
                OR LOWER(subject.name) LIKE LOWER(:keyword)
                OR LOWER(teacherUser.name) LIKE LOWER(:keyword)
                OR LOWER(adminClass.name) LIKE LOWER(:keyword)
            )`,
                { keyword: `%${keyword.trim()}%` },
            );
        }

        const sortMap: Record<string, string> = {
            id: 'courseOffering.id',
            code: 'courseOffering.code',
            createdAt: 'courseOffering.createdAt',
            updatedAt: 'courseOffering.updatedAt',
            isActive: 'courseOffering.isActive',
            subjectName: 'subject.name',
            subjectCode: 'subject.code',
            teacherName: 'teacherUser.name',
            adminClassName: 'adminClass.name',
            semester: 'term.semester',
        };

        const totalQb = baseQb
            .clone()
            .select('courseOffering.id')
            .distinct(true);
        const totalItems = await totalQb.getCount();

        const dataQb = baseQb
            .clone()
            .addSelect('COUNT(schedule.id)', 'scheduleCount')
            .groupBy('courseOffering.id')
            .addGroupBy('term.id')
            .addGroupBy('adminClass.id')
            .addGroupBy('teacherSubject.id')
            .addGroupBy('subject.id')
            .addGroupBy('teacher.id')
            .addGroupBy('teacherUser.id')
            .orderBy(
                sortMap[sort] || 'courseOffering.id',
                order as 'ASC' | 'DESC',
            )
            .skip(skip)
            .take(pageSize);

        const { entities, raw } = await dataQb.getRawAndEntities();

        const result = entities.map((item, index) => ({
            ...item,
            hasSchedule: Number(raw[index]?.scheduleCount || 0) > 0,
        }));

        return {
            meta: {
                current: page,
                pageSize,
                pages: Math.ceil(totalItems / pageSize),
                total: totalItems,
            },
            result,
        };
    }

    async updateStatus(id: number, status: CourseOfferingStatus) {
        const courseOffering = await this.courseOfferingRepository.findOne({
            where: { id },
            relations: {
                schedules: true,
                term: true,
            },
        });

        if (!courseOffering) {
            throw new NotFoundException('Không tìm thấy lớp học phần');
        }

        if (courseOffering.status === CourseOfferingStatus.FINISHED) {
            throw new BadRequestException(
                'Lớp học phần đã kết thúc, không thể cập nhật trạng thái',
            );
        }

        if (
            status === CourseOfferingStatus.OPEN &&
            courseOffering.status !== CourseOfferingStatus.WAITING_REGISTRATION
        ) {
            throw new BadRequestException(
                'Chỉ có thể mở đăng ký khi lớp học phần đang ở trạng thái chờ đăng ký',
            );
        }

        if (
            status === CourseOfferingStatus.OPEN &&
            (!courseOffering.schedules || courseOffering.schedules.length === 0)
        ) {
            throw new BadRequestException(
                'Phải tạo lịch học trước khi mở đăng ký',
            );
        }

        if (
            status === CourseOfferingStatus.CLOSED &&
            courseOffering.status !== CourseOfferingStatus.OPEN
        ) {
            throw new BadRequestException(
                'Chỉ có thể đóng đăng ký khi lớp học phần đang mở',
            );
        }

        courseOffering.status = status;
        return await this.courseOfferingRepository.save(courseOffering);
    }

    async bulkOpenRegistration(dto: BulkUpdateCourseOfferingStatusDto) {
        const { ids } = dto;

        const courseOfferings = await this.courseOfferingRepository.find({
            where: {
                id: In(ids),
            },
            relations: {
                schedules: true,
                term: true,
            },
        });

        if (!courseOfferings.length) {
            throw new NotFoundException('Không tìm thấy lớp học phần nào');
        }

        const updated: number[] = [];
        const skipped: Array<{ id: number; code?: string; reason: string }> =
            [];

        for (const item of courseOfferings) {
            if (item.status !== CourseOfferingStatus.WAITING_REGISTRATION) {
                skipped.push({
                    id: item.id,
                    code: item.code,
                    reason: 'Chỉ có thể mở đăng ký cho lớp đang ở trạng thái chờ đăng ký',
                });
                continue;
            }

            if (!item.schedules || item.schedules.length === 0) {
                skipped.push({
                    id: item.id,
                    code: item.code,
                    reason: 'Lớp học phần chưa có lịch học',
                });
                continue;
            }

            item.status = CourseOfferingStatus.OPEN;
            await this.courseOfferingRepository.save(item);
            updated.push(item.id);
        }

        return {
            message:
                updated.length > 0
                    ? `Đã mở đăng ký ${updated.length} lớp học phần`
                    : 'Không có lớp học phần nào được mở đăng ký',
            data: {
                updatedCount: updated.length,
                skippedCount: skipped.length,
                updatedIds: updated,
                skipped,
            },
        };
    }

    async findOne(id: number) {
        const courseOffering = await this.courseOfferingRepository.findOne({
            where: { id },
            relations: {
                teacherSubject: {
                    teacher: {
                        user: true,
                    },
                    subject: true,
                },
                term: true,
                adminClass: true,
                schedules: {
                    room: true,
                },
                courseRegistrations: {
                    student: {
                        user: true,
                    },
                },
            },
        });

        if (!courseOffering) {
            throw new NotFoundException('Course offering not found');
        }

        return courseOffering;
    }
    update(id: number, updateCourseOfferingDto: UpdateCourseOfferingDto) {
        return `This action updates a #${id} courseOffering`;
    }

    remove(id: number) {
        return `This action removes a #${id} courseOffering`;
    }

    private async generateCourseOfferingCode(
        subjectCode: string,
        semester: string,
        year: number,
    ): Promise<string> {
        const normalizedSubjectCode = subjectCode.trim().toUpperCase();
        const prefix = `${normalizedSubjectCode}-${semester}-${year}`;

        const existed = await this.courseOfferingRepository.find({
            select: ['code'],
        });

        const matchedNumbers = existed
            .map((item) => item.code)
            .filter((code) => code?.startsWith(`${prefix}-`))
            .map((code) => {
                const parts = code.split('-');
                const lastPart = parts[parts.length - 1];
                return Number(lastPart);
            })
            .filter((num) => !Number.isNaN(num));

        const nextNumber =
            matchedNumbers.length > 0 ? Math.max(...matchedNumbers) + 1 : 1;

        return `${prefix}-${String(nextNumber).padStart(2, '0')}`;
    }
}
