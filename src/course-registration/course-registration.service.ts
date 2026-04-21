import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, Brackets, DataSource } from 'typeorm';
import { CourseRegistration } from './entities/course-registration.entity';
import {
    CheckCourseRegistrationConflictDto,
    CreateCourseRegistrationDto,
} from './dto/create-course-registration.dto';
import { Student } from '@/users/entities/student.entity';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { Schedule } from '@/schedules/entities/schedule.entity';
import {
    CourseOfferingStatus,
    RegistrationStatus,
} from '@/helpers/enum/enum.global';
import { PaymentService } from '@/payment/payment.service';
import { IUser } from '@/helpers/types/user.interface';

@Injectable()
export class CourseRegistrationService {
    constructor(
        @InjectRepository(CourseRegistration)
        private readonly registrationRepo: Repository<CourseRegistration>,

        @InjectRepository(Student)
        private readonly studentRepo: Repository<Student>,

        @InjectRepository(CourseOffering)
        private readonly courseOfferingRepo: Repository<CourseOffering>,

        @InjectRepository(Schedule)
        private readonly scheduleRepo: Repository<Schedule>,
        @InjectRepository(CourseRegistration)
        private readonly courseRegistrationRepository: Repository<CourseRegistration>,

        private readonly dataSource: DataSource,

        private readonly paymentsService: PaymentService,
    ) {}

    // async register(studentUserId: string, dto: CreateCourseRegistrationDto) {
    //     return await this.dataSource.transaction(async (manager) => {
    //         const studentRepo = manager.getRepository(Student);
    //         const courseOfferingRepo = manager.getRepository(CourseOffering);
    //         const registrationRepo = manager.getRepository(CourseRegistration);

    //         const student = await studentRepo.findOne({
    //             where: { user: { id: studentUserId } },
    //             relations: { user: true },
    //         });

    //         if (!student) {
    //             throw new NotFoundException('Không tìm thấy sinh viên');
    //         }

    //         const courseOffering = await courseOfferingRepo.findOne({
    //             where: { id: dto.courseOfferingId },
    //             relations: {
    //                 teacherSubject: { subject: true, teacher: { user: true } },
    //                 term: true,
    //                 adminClass: true,
    //             },
    //         });

    //         if (!courseOffering) {
    //             throw new NotFoundException('Không tìm thấy lớp học phần');
    //         }

    //         const existed = await registrationRepo.findOne({
    //             where: {
    //                 studentId: student.id,
    //                 courseOfferingId: dto.courseOfferingId,
    //             },
    //         });

    //         if (existed && existed.status === RegistrationStatus.REGISTERED) {
    //             throw new BadRequestException(
    //                 'Bạn đã đăng ký lớp học phần này rồi',
    //             );
    //         }

    //         const registeredCount = await registrationRepo.count({
    //             where: {
    //                 courseOfferingId: dto.courseOfferingId,
    //                 status: RegistrationStatus.REGISTERED,
    //             },
    //         });

    //         if (registeredCount >= courseOffering.maxStudents) {
    //             throw new BadRequestException('Lớp học phần đã đủ số lượng');
    //         }

    //         let registration: CourseRegistration;

    //         if (existed) {
    //             existed.status = RegistrationStatus.REGISTERED;
    //             registration = await registrationRepo.save(existed);
    //         } else {
    //             registration = registrationRepo.create({
    //                 studentId: student.id,
    //                 courseOfferingId: dto.courseOfferingId,
    //                 status: RegistrationStatus.REGISTERED,
    //             });
    //             registration = await registrationRepo.save(registration);
    //         }

    //         const updatedRegisteredCount = await registrationRepo.count({
    //             where: {
    //                 courseOfferingId: dto.courseOfferingId,
    //                 status: RegistrationStatus.REGISTERED,
    //             },
    //         });

    //         await courseOfferingRepo.update(dto.courseOfferingId, {
    //             enrolledCount: updatedRegisteredCount,
    //         });

    //         return registration;
    //     });
    // }

    // async register(studentUserId: string, dto: CreateCourseRegistrationDto) {
    //     return await this.dataSource.transaction(async (manager) => {
    //         const studentRepo = manager.getRepository(Student);
    //         const courseOfferingRepo = manager.getRepository(CourseOffering);
    //         const registrationRepo = manager.getRepository(CourseRegistration);
    //         const scheduleRepo = manager.getRepository(Schedule);

    //         const student = await studentRepo.findOne({
    //             where: { user: { id: studentUserId } },
    //             relations: { user: true },
    //         });

    //         if (!student) {
    //             throw new NotFoundException('Không tìm thấy sinh viên');
    //         }

    //         const courseOffering = await courseOfferingRepo.findOne({
    //             where: { id: dto.courseOfferingId },
    //             relations: {
    //                 teacherSubject: { subject: true, teacher: { user: true } },
    //                 term: true,
    //                 adminClass: true,
    //                 schedules: true,
    //             },
    //         });

    //         if (!courseOffering) {
    //             throw new NotFoundException('Không tìm thấy lớp học phần');
    //         }

    //         const existed = await registrationRepo.findOne({
    //             where: {
    //                 studentId: student.id,
    //                 courseOfferingId: dto.courseOfferingId,
    //             },
    //         });

    //         if (existed?.status === RegistrationStatus.REGISTERED) {
    //             throw new BadRequestException(
    //                 'Bạn đã đăng ký lớp học phần này rồi',
    //             );
    //         }

    //         const registeredCount = await registrationRepo.count({
    //             where: {
    //                 courseOfferingId: dto.courseOfferingId,
    //                 status: RegistrationStatus.REGISTERED,
    //             },
    //         });

    //         if (registeredCount >= courseOffering.maxStudents) {
    //             throw new BadRequestException('Lớp học phần đã đủ số lượng');
    //         }

    //         const newSchedules = (courseOffering.schedules ?? []).filter(
    //             (s) => s.isActive !== false,
    //         );

    //         if (!newSchedules.length) {
    //             throw new BadRequestException('Lớp học phần chưa có lịch học');
    //         }

    //         // Lấy các lớp học phần đang REGISTERED của sinh viên trong cùng kỳ
    //         const registeredRegs = await registrationRepo
    //             .createQueryBuilder('registration')
    //             .innerJoinAndSelect(
    //                 'registration.courseOffering',
    //                 'courseOffering',
    //             )
    //             .innerJoin('courseOffering.term', 'term')
    //             .where('registration.studentId = :studentId', {
    //                 studentId: student.id,
    //             })
    //             .andWhere('registration.status = :status', {
    //                 status: RegistrationStatus.REGISTERED,
    //             })
    //             .andWhere('term.id = :termId', {
    //                 termId: courseOffering.term.id,
    //             })
    //             .andWhere('courseOffering.id != :courseOfferingId', {
    //                 courseOfferingId: courseOffering.id,
    //             })
    //             .getMany();

    //         const registeredCourseOfferingIds = registeredRegs.map(
    //             (item) => item.courseOfferingId,
    //         );

    //         console.log(
    //             'registeredCourseOfferingIds',
    //             registeredRegs.map((item) => item),
    //         );

    //         if (registeredCourseOfferingIds.length > 0) {
    //             const conflictSchedule = await scheduleRepo
    //                 .createQueryBuilder('s')
    //                 .leftJoinAndSelect('s.courseOffering', 'co')
    //                 .where('s.courseOfferingId IN (:...ids)', {
    //                     ids: registeredCourseOfferingIds,
    //                 })
    //                 .andWhere('s.isActive = true')
    //                 .andWhere(
    //                     new Brackets((qb) => {
    //                         newSchedules.forEach((item, index) => {
    //                             qb.orWhere(
    //                                 `
    //                             (
    //                                 s.dayOfWeek = :dayOfWeek${index}
    //                                 AND s.lessonStart <= :lessonEnd${index}
    //                                 AND s.lessonEnd >= :lessonStart${index}
    //                             )
    //                             `,
    //                                 {
    //                                     [`dayOfWeek${index}`]: Number(
    //                                         item.dayOfWeek,
    //                                     ),
    //                                     [`lessonStart${index}`]: Number(
    //                                         item.lessonStart,
    //                                     ),
    //                                     [`lessonEnd${index}`]: Number(
    //                                         item.lessonEnd,
    //                                     ),
    //                                 },
    //                             );
    //                         });
    //                     }),
    //                 )
    //                 .getOne();

    //             if (conflictSchedule) {
    //                 throw new BadRequestException(
    //                     `Trùng tiết học với lớp học phần ${conflictSchedule.courseOffering?.code ?? ''}`,
    //                 );
    //             }
    //         }

    //         let registration: CourseRegistration;

    //         if (existed) {
    //             existed.status = RegistrationStatus.REGISTERED;
    //             registration = await registrationRepo.save(existed);
    //         } else {
    //             registration = registrationRepo.create({
    //                 studentId: student.id,
    //                 courseOfferingId: dto.courseOfferingId,
    //                 status: RegistrationStatus.REGISTERED,
    //             });
    //             registration = await registrationRepo.save(registration);
    //         }

    //         const updatedRegisteredCount = await registrationRepo.count({
    //             where: {
    //                 courseOfferingId: dto.courseOfferingId,
    //                 status: RegistrationStatus.REGISTERED,
    //             },
    //         });

    //         await courseOfferingRepo.update(dto.courseOfferingId, {
    //             enrolledCount: updatedRegisteredCount,
    //         });

    //         return registration;
    //     });
    // }

    async register(studentUserId: string, dto: CreateCourseRegistrationDto) {
        return await this.dataSource.transaction(async (manager) => {
            const studentRepo = manager.getRepository(Student);
            const courseOfferingRepo = manager.getRepository(CourseOffering);
            const registrationRepo = manager.getRepository(CourseRegistration);
            const scheduleRepo = manager.getRepository(Schedule);

            const student = await studentRepo.findOne({
                where: { user: { id: studentUserId } },
                relations: { user: true },
            });

            if (!student) {
                throw new NotFoundException('Không tìm thấy sinh viên');
            }

            const courseOffering = await courseOfferingRepo.findOne({
                where: { id: dto.courseOfferingId },
                relations: {
                    teacherSubject: { subject: true, teacher: { user: true } },
                    term: true,
                    adminClass: true,
                    schedules: true,
                },
            });

            if (!courseOffering) {
                throw new NotFoundException('Không tìm thấy lớp học phần');
            }

            const existed = await registrationRepo.findOne({
                where: {
                    studentId: student.id,
                    courseOfferingId: dto.courseOfferingId,
                },
            });

            if (existed?.status === RegistrationStatus.REGISTERED) {
                throw new BadRequestException(
                    'Bạn đã đăng ký lớp học phần này rồi',
                );
            }

            const registeredCount = await registrationRepo.count({
                where: {
                    courseOfferingId: dto.courseOfferingId,
                    status: RegistrationStatus.REGISTERED,
                },
            });

            if (registeredCount >= courseOffering.maxStudents) {
                throw new BadRequestException('Lớp học phần đã đủ số lượng');
            }

            const newSchedules = (courseOffering.schedules ?? []).filter(
                (s) => s.isActive !== false,
            );

            if (!newSchedules.length) {
                throw new BadRequestException('Lớp học phần chưa có lịch học');
            }

            const registeredRegs = await registrationRepo
                .createQueryBuilder('registration')
                .innerJoinAndSelect(
                    'registration.courseOffering',
                    'courseOffering',
                )
                .innerJoin('courseOffering.term', 'term')
                .where('registration.studentId = :studentId', {
                    studentId: student.id,
                })
                .andWhere('registration.status = :status', {
                    status: RegistrationStatus.REGISTERED,
                })
                .andWhere('term.id = :termId', {
                    termId: courseOffering.term.id,
                })
                .andWhere('courseOffering.id != :courseOfferingId', {
                    courseOfferingId: courseOffering.id,
                })
                .getMany();

            const registeredCourseOfferingIds = registeredRegs.map(
                (item) => item.courseOfferingId,
            );

            if (registeredCourseOfferingIds.length > 0) {
                const conflictSchedule = await scheduleRepo
                    .createQueryBuilder('s')
                    .leftJoinAndSelect('s.courseOffering', 'co')
                    .where('s.courseOfferingId IN (:...ids)', {
                        ids: registeredCourseOfferingIds,
                    })
                    .andWhere('s.isActive = true')
                    .andWhere(
                        new Brackets((qb) => {
                            newSchedules.forEach((item, index) => {
                                qb.orWhere(
                                    `
                                (
                                    s.dayOfWeek = :dayOfWeek${index}
                                    AND s.lessonStart <= :lessonEnd${index}
                                    AND s.lessonEnd >= :lessonStart${index}
                                )
                                `,
                                    {
                                        [`dayOfWeek${index}`]: Number(
                                            item.dayOfWeek,
                                        ),
                                        [`lessonStart${index}`]: Number(
                                            item.lessonStart,
                                        ),
                                        [`lessonEnd${index}`]: Number(
                                            item.lessonEnd,
                                        ),
                                    },
                                );
                            });
                        }),
                    )
                    .getOne();

                if (conflictSchedule) {
                    throw new BadRequestException(
                        `Trùng tiết học với lớp học phần ${conflictSchedule.courseOffering?.code ?? ''}`,
                    );
                }
            }

            let registration: CourseRegistration;

            if (existed) {
                existed.status = RegistrationStatus.REGISTERED;
                registration = await registrationRepo.save(existed);
            } else {
                registration = registrationRepo.create({
                    studentId: student.id,
                    courseOfferingId: dto.courseOfferingId,
                    status: RegistrationStatus.REGISTERED,
                });
                registration = await registrationRepo.save(registration);
            }

            const updatedRegisteredCount = await registrationRepo.count({
                where: {
                    courseOfferingId: dto.courseOfferingId,
                    status: RegistrationStatus.REGISTERED,
                },
            });

            await courseOfferingRepo.update(dto.courseOfferingId, {
                enrolledCount: updatedRegisteredCount,
            });

            const payment =
                await this.paymentsService.attachRegistrationToPayment(
                    registration.id,
                    manager,
                );

            return {
                registration,
                payment,
            };
        });
    }

    async cancel(studentUserId: string, registrationId: number) {
        return await this.dataSource.transaction(async (manager) => {
            const studentRepo = manager.getRepository(Student);
            const registrationRepo = manager.getRepository(CourseRegistration);
            const courseOfferingRepo = manager.getRepository(CourseOffering);

            const student = await studentRepo.findOne({
                where: { user: { id: studentUserId } },
                relations: { user: true },
            });

            if (!student) {
                throw new NotFoundException('Không tìm thấy sinh viên');
            }

            const registration = await registrationRepo.findOne({
                where: {
                    id: registrationId,
                    studentId: student.id,
                },
                relations: {
                    courseOffering: true,
                },
            });

            if (!registration) {
                throw new NotFoundException('Không tìm thấy đăng ký môn học');
            }

            if (registration.status === RegistrationStatus.CANCELLED) {
                throw new BadRequestException(
                    'Môn học này đã được hủy trước đó',
                );
            }

            if (registration.status !== RegistrationStatus.REGISTERED) {
                throw new BadRequestException(
                    'Chỉ được hủy môn đang ở trạng thái đã đăng ký',
                );
            }

            registration.status = RegistrationStatus.CANCELLED;
            const saved = await registrationRepo.save(registration);

            const updatedRegisteredCount = await registrationRepo.count({
                where: {
                    courseOfferingId: registration.courseOfferingId,
                    status: RegistrationStatus.REGISTERED,
                },
            });

            await courseOfferingRepo.update(registration.courseOfferingId, {
                enrolledCount: updatedRegisteredCount,
            });

            return {
                message: 'Hủy đăng ký môn học thành công',
                data: saved,
            };
        });
    }

    async myRegistrations(studentUserId: string, termId?: number) {
        const student = await this.studentRepo.findOne({
            where: { user: { id: studentUserId } },
            relations: { user: true },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const qb = this.registrationRepo
            .createQueryBuilder('registration')
            .distinct(true)
            .leftJoinAndSelect('registration.courseOffering', 'courseOffering')
            .leftJoinAndSelect('courseOffering.term', 'term')
            .leftJoinAndSelect('courseOffering.adminClass', 'adminClass')
            .leftJoinAndSelect(
                'courseOffering.teacherSubject',
                'teacherSubject',
            )
            .leftJoinAndSelect('teacherSubject.subject', 'subject')
            .leftJoinAndSelect('teacherSubject.teacher', 'teacher')
            .leftJoinAndSelect('teacher.user', 'teacherUser')
            .leftJoinAndSelect('courseOffering.schedules', 'schedules')
            .where('registration.studentId = :studentId', {
                studentId: student.id,
            })
            .andWhere('registration.status = :status', {
                status: RegistrationStatus.REGISTERED,
            });

        if (termId) {
            qb.andWhere('term.id = :termId', { termId });
        }

        qb.andWhere(
            '(schedules.id IS NULL OR schedules.isActive = :scheduleActive)',
            { scheduleActive: true },
        );

        qb.orderBy('registration.createdAt', 'DESC');

        return await qb.getMany();
    }

    async availableCourseOfferings(studentUserId: string, termId?: number) {
        const student = await this.studentRepo.findOne({
            where: { user: { id: studentUserId } },
            relations: {
                user: true,
                adminClass: true,
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const qb = this.courseOfferingRepo
            .createQueryBuilder('courseOffering')
            .leftJoinAndSelect('courseOffering.term', 'term')
            .leftJoinAndSelect('courseOffering.adminClass', 'adminClass')
            .leftJoinAndSelect(
                'courseOffering.teacherSubject',
                'teacherSubject',
            )
            .leftJoinAndSelect('teacherSubject.subject', 'subject')
            .leftJoinAndSelect('teacherSubject.teacher', 'teacher')
            .leftJoinAndSelect('teacher.user', 'teacherUser')
            .where('courseOffering.isActive = true');

        if (termId) {
            qb.andWhere('courseOffering.termId = :termId', { termId });
        }

        qb.orderBy('courseOffering.id', 'DESC');

        const items = await qb.getMany();

        const result = await Promise.all(
            items.map(async (item) => {
                const registeredCount = await this.registrationRepo.count({
                    where: {
                        courseOfferingId: item.id,
                        status: RegistrationStatus.REGISTERED,
                    },
                });

                const alreadyRegistered = await this.registrationRepo.findOne({
                    where: {
                        studentId: student.id,
                        courseOfferingId: item.id,
                        status: RegistrationStatus.REGISTERED,
                    },
                });

                return {
                    ...item,
                    registeredCount,
                    remainingSlots: Math.max(
                        (item.maxStudents ?? 0) - registeredCount,
                        0,
                    ),
                    alreadyRegistered: !!alreadyRegistered,
                };
            }),
        );

        return result;
    }

    private async checkScheduleConflict(
        studentId: number,
        courseOfferingId: number,
    ) {
        const newSchedules = await this.scheduleRepo.find({
            where: { courseOfferingId, isActive: true },
        });

        if (!newSchedules.length) return true;

        const registrations = await this.registrationRepo.find({
            where: {
                studentId,
                status: RegistrationStatus.REGISTERED,
                courseOfferingId: Not(courseOfferingId),
            },
            relations: {
                courseOffering: true,
            },
        });

        const registeredCourseOfferingIds = registrations.map(
            (item) => item.courseOfferingId,
        );

        if (!registeredCourseOfferingIds.length) return true;

        const oldSchedules = await this.scheduleRepo
            .createQueryBuilder('schedule')
            .where('schedule.courseOfferingId IN (:...ids)', {
                ids: registeredCourseOfferingIds,
            })
            .andWhere('schedule.isActive = true')
            .getMany();

        for (const newItem of newSchedules) {
            for (const oldItem of oldSchedules) {
                const sameDay = newItem.dayOfWeek === oldItem.dayOfWeek;
                const overlapLesson =
                    newItem.lessonStart <= oldItem.lessonEnd &&
                    newItem.lessonEnd >= oldItem.lessonStart;

                if (sameDay && overlapLesson) {
                    throw new BadRequestException(
                        'Lịch học bị trùng với môn đã đăng ký',
                    );
                }
            }
        }

        return true;
    }

    async getAvailableForStudent(
        userId: string,
        currentPage: number,
        limit: number,
        qs: string,
    ) {
        const queryParams = new URLSearchParams(qs);

        const keyword = queryParams.get('keyword')?.trim();
        const termId = queryParams.get('termId');
        const page = Number(currentPage) > 0 ? Number(currentPage) : 1;
        const pageSize = Number(limit) > 0 ? Number(limit) : 10;
        const skip = (page - 1) * pageSize;

        const student = await this.studentRepo.findOne({
            where: {
                user: { id: userId },
            },
            relations: {
                user: true,
                adminClass: true,
                major: true,
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const qb = this.courseOfferingRepo
            .createQueryBuilder('courseOffering')
            .leftJoinAndSelect('courseOffering.term', 'term')
            .leftJoinAndSelect('courseOffering.adminClass', 'adminClass')
            .leftJoinAndSelect(
                'courseOffering.teacherSubject',
                'teacherSubject',
            )
            .leftJoinAndSelect('teacherSubject.subject', 'subject')
            .leftJoinAndSelect('teacherSubject.teacher', 'teacher')
            .leftJoinAndSelect('teacher.user', 'teacherUser')
            .leftJoinAndSelect('courseOffering.schedules', 'schedules')
            .where('courseOffering.status = :status', {
                status: CourseOfferingStatus.OPEN,
            });

        if (termId) {
            qb.andWhere('courseOffering.term_id = :termId', {
                termId: +termId,
            });
        }

        if (keyword) {
            qb.andWhere(
                new Brackets((subQb) => {
                    subQb
                        .where('courseOffering.code ILIKE :keyword', {
                            keyword: `%${keyword}%`,
                        })
                        .orWhere('subject.code ILIKE :keyword', {
                            keyword: `%${keyword}%`,
                        })
                        .orWhere('subject.name ILIKE :keyword', {
                            keyword: `%${keyword}%`,
                        })
                        .orWhere('teacherUser.name ILIKE :keyword', {
                            keyword: `%${keyword}%`,
                        })
                        .orWhere('adminClass.code ILIKE :keyword', {
                            keyword: `%${keyword}%`,
                        })
                        .orWhere('adminClass.name ILIKE :keyword', {
                            keyword: `%${keyword}%`,
                        });
                }),
            );
        }

        qb.orderBy('courseOffering.createdAt', 'DESC');
        qb.addOrderBy('schedules.dayOfWeek', 'ASC');
        qb.addOrderBy('schedules.lessonStart', 'ASC');
        qb.skip(skip).take(pageSize);

        const [items, totalItems] = await qb.getManyAndCount();

        const result = await Promise.all(
            items.map(async (item) => {
                const registeredCount = await this.registrationRepo.count({
                    where: {
                        courseOfferingId: item.id,
                        status: RegistrationStatus.REGISTERED,
                    },
                });

                const myRegistration = await this.registrationRepo.findOne({
                    where: {
                        studentId: student.id,
                        courseOfferingId: item.id,
                        status: RegistrationStatus.REGISTERED,
                    },
                });

                return {
                    ...item,
                    schedules: (item.schedules ?? []).sort((a, b) => {
                        if ((a.dayOfWeek ?? 0) !== (b.dayOfWeek ?? 0)) {
                            return (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0);
                        }
                        return (a.lessonStart ?? 0) - (b.lessonStart ?? 0);
                    }),
                    registeredCount,
                    remainingSlots: Math.max(
                        (item.maxStudents ?? 0) - registeredCount,
                        0,
                    ),
                    alreadyRegistered: !!myRegistration,
                    canRegister:
                        !myRegistration &&
                        registeredCount < (item.maxStudents ?? 0),
                };
            }),
        );

        return {
            result,
            meta: {
                current: page,
                pageSize,
                pages: Math.ceil(totalItems / pageSize),
                total: totalItems,
            },
        };
    }

    async checkConflict(
        studentUserId: string,
        dto: CheckCourseRegistrationConflictDto,
    ) {
        const student = await this.studentRepo.findOne({
            where: { user: { id: studentUserId } },
            relations: { user: true },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const courseOffering = await this.courseOfferingRepo.findOne({
            where: { id: dto.courseOfferingId },
            relations: {
                term: true,
                schedules: true,
            },
        });

        if (!courseOffering) {
            throw new NotFoundException('Không tìm thấy lớp học phần');
        }

        const existed = await this.registrationRepo.findOne({
            where: {
                studentId: student.id,
                courseOfferingId: dto.courseOfferingId,
                status: RegistrationStatus.REGISTERED,
            },
        });

        if (existed) {
            return {
                canRegister: false,
                isConflict: true,
                message: 'Bạn đã đăng ký lớp học phần này rồi',
                conflictCourseOffering: null,
            };
        }

        const newSchedules = courseOffering.schedules ?? [];

        if (!newSchedules.length) {
            return {
                canRegister: false,
                isConflict: true,
                message: 'Lớp học phần chưa có lịch học',
                conflictCourseOffering: null,
            };
        }

        // 1. Các lớp đã REGISTERED trong DB
        const registeredRegs = await this.registrationRepo
            .createQueryBuilder('registration')
            .innerJoinAndSelect('registration.courseOffering', 'courseOffering')
            .innerJoin('courseOffering.term', 'term')
            .where('registration.studentId = :studentId', {
                studentId: student.id,
            })
            .andWhere('registration.status = :status', {
                status: RegistrationStatus.REGISTERED,
            })
            .andWhere('term.id = :termId', {
                termId: courseOffering.term.id,
            })
            .andWhere('courseOffering.id != :courseOfferingId', {
                courseOfferingId: courseOffering.id,
            })
            .getMany();

        const registeredIds = registeredRegs.map(
            (item) => item.courseOfferingId,
        );

        // 2. Các lớp đang chọn tạm ở FE
        const selectedIds = (dto.selectedCourseOfferingIds ?? [])
            .map(Number)
            .filter((id) => !!id && id !== courseOffering.id);

        // Gộp lại
        const idsToCheck = Array.from(
            new Set([...registeredIds, ...selectedIds]),
        );

        if (!idsToCheck.length) {
            return {
                canRegister: true,
                isConflict: false,
                message: 'Không trùng lịch',
                conflictCourseOffering: null,
            };
        }

        const conflictSchedule = await this.scheduleRepo
            .createQueryBuilder('schedule')
            .leftJoinAndSelect('schedule.courseOffering', 'courseOffering')
            .leftJoinAndSelect(
                'courseOffering.teacherSubject',
                'teacherSubject',
            )
            .leftJoinAndSelect('teacherSubject.subject', 'subject')
            .where('schedule.courseOfferingId IN (:...ids)', {
                ids: idsToCheck,
            })
            .andWhere(
                new Brackets((qb) => {
                    newSchedules.forEach((item, index) => {
                        qb.orWhere(
                            `
                        (
                            schedule.dayOfWeek = :dayOfWeek${index}
                            AND schedule.lessonStart <= :lessonEnd${index}
                            AND schedule.lessonEnd >= :lessonStart${index}
                        )
                        `,
                            {
                                [`dayOfWeek${index}`]: Number(item.dayOfWeek),
                                [`lessonStart${index}`]: Number(
                                    item.lessonStart,
                                ),
                                [`lessonEnd${index}`]: Number(item.lessonEnd),
                            },
                        );
                    });
                }),
            )
            .getOne();

        if (conflictSchedule) {
            return {
                canRegister: false,
                isConflict: true,
                message: `Trùng tiết học với môn ${conflictSchedule.courseOffering?.teacherSubject.subject.name ?? ''}`,
                conflictCourseOffering: conflictSchedule.courseOffering,
            };
        }

        return {
            canRegister: true,
            isConflict: false,
            message: 'Không trùng lịch',
            conflictCourseOffering: null,
        };
    }
}
