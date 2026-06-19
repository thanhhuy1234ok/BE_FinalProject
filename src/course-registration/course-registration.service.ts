import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, Brackets, DataSource, In } from 'typeorm';
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
    PaymentItemStatus,
    PaymentStatus,
    RegistrationStatus,
} from '@/helpers/enum/enum.global';
import { PaymentService } from '@/payment/payment.service';

import { Payment } from '@/payment/entities/payment.entity';
import { PaymentItem } from '@/payment-item/entities/payment-item.entity';
import { v4 as uuidv4 } from 'uuid';
import { Term } from '@/terms/entities/term.entity';
import { CurriculumSubject } from '@/curriculum_subjects/entities/curriculum_subject.entity';
import { CurriculumStatus } from '@/curriculum/entities/curriculum.entity';
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

        @InjectRepository(Term)
        private readonly termRepo: Repository<Term>,

        private readonly dataSource: DataSource,

        private readonly paymentsService: PaymentService,

        @InjectRepository(Student)
        private readonly studentRepository: Repository<Student>,

        @InjectRepository(CurriculumSubject)
        private readonly curriculumSubjectRepo: Repository<CurriculumSubject>,
    ) {}

    async registerMany(
        studentUserId: string,
        dto: CreateCourseRegistrationDto,
    ) {
        return await this.dataSource.transaction(async (manager) => {
            const studentRepo = manager.getRepository(Student);
            const courseOfferingRepo = manager.getRepository(CourseOffering);
            const registrationRepo = manager.getRepository(CourseRegistration);

            const student = await studentRepo.findOne({
                where: { user: { id: studentUserId } },
            });

            if (!student) {
                throw new NotFoundException('Không tìm thấy sinh viên');
            }

            const courseOfferingIds = [...new Set(dto.courseOfferingIds)];

            if (!courseOfferingIds.length) {
                throw new BadRequestException(
                    'Vui lòng chọn ít nhất 1 môn học',
                );
            }

            const courseOfferings: CourseOffering[] = [];

            for (const id of courseOfferingIds) {
                const lockedCourseOffering = await courseOfferingRepo.findOne({
                    where: { id },
                    lock: { mode: 'pessimistic_write' },
                });

                if (!lockedCourseOffering) {
                    throw new NotFoundException(
                        `Không tìm thấy lớp học phần ID ${id}`,
                    );
                }

                const courseOffering = await courseOfferingRepo.findOne({
                    where: { id },
                    relations: {
                        term: true,
                        schedules: true,
                        teacherSubject: {
                            subject: true,
                        },
                    },
                });

                if (!courseOffering) {
                    throw new NotFoundException(
                        `Không tìm thấy lớp học phần ID ${id}`,
                    );
                }

                if (!courseOffering.term?.isActive) {
                    throw new BadRequestException(
                        `Lớp học phần ${id} không thuộc học kỳ đang mở`,
                    );
                }

                courseOfferings.push(courseOffering);
            }

            const existedRegistrations = await registrationRepo.find({
                where: {
                    studentId: student.id,
                },
                relations: {
                    courseOffering: {
                        schedules: true,
                        teacherSubject: {
                            subject: true,
                        },
                    },
                },
            });

            const registrationsToCreate: CourseRegistration[] = [];
            const registrationsToReactivate: CourseRegistration[] = [];

            for (const courseOffering of courseOfferings) {
                const existed = existedRegistrations.find(
                    (r) => r.courseOfferingId === courseOffering.id,
                );

                if (existed?.status === RegistrationStatus.REGISTERED) {
                    throw new BadRequestException(
                        `Bạn đã đăng ký môn ${courseOffering.teacherSubject.subject.name}`,
                    );
                }

                if (courseOffering.maxStudents !== null) {
                    const currentRegistered = await registrationRepo.count({
                        where: {
                            courseOfferingId: courseOffering.id,
                            status: RegistrationStatus.REGISTERED,
                        },
                    });

                    if (currentRegistered >= courseOffering.maxStudents) {
                        throw new BadRequestException(
                            `Lớp ${courseOffering.teacherSubject.subject.name} đã đủ số lượng`,
                        );
                    }
                }

                if (existed?.status === RegistrationStatus.CANCELLED) {
                    existed.status = RegistrationStatus.REGISTERED;
                    existed.registeredAt = new Date();
                    existed.cancelledAt = null;

                    registrationsToReactivate.push(existed);
                } else {
                    registrationsToCreate.push(
                        registrationRepo.create({
                            studentId: student.id,
                            courseOfferingId: courseOffering.id,
                            status: RegistrationStatus.REGISTERED,
                            registeredAt: new Date(),
                        }),
                    );
                }
            }

            // Chỉ check conflict với các môn đã REGISTERED cũ,
            // loại bỏ các môn đang đăng ký lại để tránh tự conflict với môn đã hủy.
            const activeRegistrations = existedRegistrations.filter(
                (item) =>
                    item.status === RegistrationStatus.REGISTERED &&
                    !courseOfferingIds.includes(item.courseOfferingId),
            );

            const allRegistrationsToCheck = [...activeRegistrations];

            for (const newCourse of courseOfferings) {
                for (const oldRegistration of allRegistrationsToCheck) {
                    const oldCourse = oldRegistration.courseOffering;

                    if (!oldCourse?.schedules?.length) continue;

                    for (const oldSchedule of oldCourse.schedules) {
                        for (const newSchedule of newCourse.schedules ?? []) {
                            const sameDay =
                                oldSchedule.dayOfWeek === newSchedule.dayOfWeek;

                            const conflictTime =
                                oldSchedule.lessonStart <
                                    newSchedule.lessonEnd &&
                                newSchedule.lessonStart < oldSchedule.lessonEnd;

                            if (sameDay && conflictTime) {
                                throw new BadRequestException(
                                    `Môn ${newCourse.teacherSubject.subject.name} trùng lịch với môn ${oldCourse.teacherSubject.subject.name}`,
                                );
                            }
                        }
                    }
                }

                allRegistrationsToCheck.push({
                    courseOffering: newCourse,
                } as CourseRegistration);
            }

            const saved = await registrationRepo.save([
                ...registrationsToReactivate,
                ...registrationsToCreate,
            ]);

            return {
                message: 'Đăng ký môn học thành công',
                total: saved.length,
                data: saved,
            };
        });
    }

    async getOpenOfferings(studentUserId: string) {
        const student = await this.studentRepo.findOne({
            where: {
                user: {
                    id: studentUserId,
                },
            },
            relations: {
                user: true,
                major: true,
                yearOfAdmission: true,
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const isDemoUser =
            student.user?.email === 'nguyenvothanhhuy2002@gmail.com';

        const activeTerm = isDemoUser
            ? await this.termRepo.findOne({
                  where: {
                      id: 18,
                  },
              })
            : await this.termRepo.findOne({
                  where: {
                      isActive: true,
                  },
              });

        if (!activeTerm) {
            return {
                message: isDemoUser
                    ? 'Không tìm thấy học kỳ demo id = 18'
                    : 'Hiện chưa có học kỳ nào đang mở',
                data: [],
            };
        }

        const where: any = {
            term: {
                id: activeTerm.id,
            },
        };

        // User thường: chỉ hiện lớp OPEN
        // Demo user: hiện tất cả lớp của học kỳ 18, không cần term active
        if (!isDemoUser) {
            where.status = CourseOfferingStatus.OPEN;
        }

        const offerings = await this.courseOfferingRepo.find({
            where,
            relations: {
                term: true,
                teacherSubject: {
                    teacher: {
                        user: true,
                    },
                    subject: true,
                },
                schedules: {
                    room: true,
                },
                adminClass: true,
            },
            order: {
                id: 'DESC',
            },
        });

        const offeringIds = offerings.map((item) => item.id);

        if (!offeringIds.length) {
            return {
                message: isDemoUser
                    ? 'Demo user chưa có lớp học phần nào trong học kỳ 18'
                    : 'Không có lớp học phần nào đang mở trong học kỳ hiện tại',
                data: [],
            };
        }

        const subjectIds = offerings
            .map((item) => item.teacherSubject?.subject?.id)
            .filter((id): id is number => !!id);

        const registeredRows = await this.registrationRepo.find({
            where: {
                studentId: student.id,
                status: RegistrationStatus.REGISTERED,
                courseOffering: {
                    term: {
                        id: activeTerm.id,
                    },
                },
            },
            relations: {
                courseOffering: {
                    term: true,
                    teacherSubject: {
                        subject: true,
                    },
                },
            },
        });

        const registeredOfferingSet = new Set(
            registeredRows.map((item) => item.courseOfferingId),
        );

        const registeredSubjectSet = new Set(
            registeredRows
                .map((item) => item.courseOffering?.teacherSubject?.subject?.id)
                .filter((id): id is number => !!id),
        );

        const counts = await this.registrationRepo
            .createQueryBuilder('registration')
            .select('registration.courseOfferingId', 'courseOfferingId')
            .addSelect('COUNT(registration.id)', 'total')
            .innerJoin('registration.courseOffering', 'courseOffering')
            .where('registration.courseOfferingId IN (:...offeringIds)', {
                offeringIds,
            })
            .andWhere('registration.status = :status', {
                status: RegistrationStatus.REGISTERED,
            })
            .andWhere('courseOffering.termId = :termId', {
                termId: activeTerm.id,
            })
            .groupBy('registration.courseOfferingId')
            .getRawMany();

        const countMap = new Map<number, number>();

        counts.forEach((item) => {
            countMap.set(Number(item.courseOfferingId), Number(item.total));
        });

        let curriculumSubjects: any[] = [];

        // Demo user bỏ lọc chương trình đào tạo
        if (!isDemoUser && subjectIds.length) {
            curriculumSubjects = await this.curriculumSubjectRepo
                .createQueryBuilder('cs')
                .leftJoinAndSelect('cs.curriculum', 'curriculum')
                .leftJoinAndSelect('cs.subject', 'subject')
                .where('subject.id IN (:...subjectIds)', { subjectIds })
                .andWhere('curriculum.major_id = :majorId', {
                    majorId: student.major_id,
                })
                .andWhere(
                    'curriculum.year_of_admission_id = :yearOfAdmissionId',
                    {
                        yearOfAdmissionId: student.yearOfAdmissionId,
                    },
                )
                .getMany();
        }

        const curriculumSubjectMap = new Map<number, any>();

        curriculumSubjects.forEach((item) => {
            if (item.subject?.id) {
                curriculumSubjectMap.set(item.subject.id, item);
            }
        });

        const data = offerings.map((offering) => {
            const registeredCount = countMap.get(offering.id) || 0;
            const maxStudents = offering.maxStudents || 0;

            const subject = offering.teacherSubject?.subject;
            const subjectId = subject?.id;

            const curriculumSubject = subjectId
                ? curriculumSubjectMap.get(subjectId)
                : null;

            const isRequired = isDemoUser
                ? false
                : curriculumSubject?.isRequired === true ||
                  curriculumSubject?.type === 'REQUIRED';

            const isRegistered = registeredOfferingSet.has(offering.id);

            const isSameSubjectRegistered =
                !!subjectId &&
                registeredSubjectSet.has(subjectId) &&
                !isRegistered;

            const isFull =
                maxStudents > 0 ? registeredCount >= maxStudents : false;

            return {
                id: offering.id,
                code: offering.code,
                status: offering.status,
                term: offering.term,
                teacher: offering.teacherSubject?.teacher,
                schedules: offering.schedules,
                adminClass: offering.adminClass,

                subject: {
                    ...subject,
                    isRequired,
                    curriculumSubjectType: isRequired ? 'REQUIRED' : 'ELECTIVE',
                },

                isRequired,
                curriculumSubjectType: isRequired ? 'REQUIRED' : 'ELECTIVE',

                credits: subject?.credit || 0,
                maxStudents,
                registeredCount,
                remainingSlots:
                    maxStudents > 0 ? maxStudents - registeredCount : null,

                isRegistered,
                isSameSubjectRegistered,
                isFull,

                canRegister:
                    !isRegistered && !isSameSubjectRegistered && !isFull,

                isDemoUser,
            };
        });

        return {
            message: 'Lấy danh sách lớp học phần đang mở thành công',
            data,
        };
    }

    async checkConflict(
        studentUserId: string,
        dto: CheckCourseRegistrationConflictDto,
    ) {
        const student = await this.studentRepo.findOne({
            where: {
                user: {
                    id: studentUserId,
                },
            },
            relations: {
                user: true,
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const isDemoUser =
            student.user?.email === 'nguyenvothanhhuy2002@gmail.com';

        const courseOffering = await this.courseOfferingRepo.findOne({
            where: {
                id: dto.courseOfferingId,
            },
            relations: {
                term: true,
                schedules: true,
                teacherSubject: {
                    subject: true,
                },
            },
        });

        if (!courseOffering) {
            throw new NotFoundException('Không tìm thấy lớp học phần');
        }

        // Demo user chỉ cho check đăng ký trong học kỳ 18
        if (isDemoUser && courseOffering.term?.id !== 18) {
            return {
                canRegister: false,
                isConflict: true,
                reason: 'NOT_DEMO_TERM',
                message: 'Demo chỉ cho đăng ký môn học kỳ 18',
                conflictCourseOffering: null,
            };
        }

        const currentTermId = courseOffering.term?.id;

        const existed = await this.registrationRepo.findOne({
            where: {
                studentId: student.id,
                courseOfferingId: dto.courseOfferingId,
                status: RegistrationStatus.REGISTERED,
                courseOffering: {
                    term: {
                        id: currentTermId,
                    },
                },
            },
        });

        if (existed) {
            return {
                canRegister: false,
                isConflict: true,
                reason: 'ALREADY_REGISTERED',
                message: 'Bạn đã đăng ký lớp học phần này rồi',
                conflictCourseOffering: null,
            };
        }

        const registeredCount = await this.registrationRepo.count({
            where: {
                courseOfferingId: dto.courseOfferingId,
                status: RegistrationStatus.REGISTERED,
                courseOffering: {
                    term: {
                        id: currentTermId,
                    },
                },
            },
        });

        if (
            courseOffering.maxStudents &&
            registeredCount >= courseOffering.maxStudents
        ) {
            return {
                canRegister: false,
                isConflict: true,
                reason: 'FULL',
                message: 'Lớp học phần đã đủ số lượng',
                conflictCourseOffering: null,
            };
        }

        const registeredCourses = await this.registrationRepo.find({
            where: {
                studentId: student.id,
                status: RegistrationStatus.REGISTERED,
                courseOffering: {
                    term: {
                        id: currentTermId,
                    },
                },
            },
            relations: {
                courseOffering: {
                    term: true,
                    schedules: true,
                    teacherSubject: {
                        subject: true,
                    },
                },
            },
        });

        const selectedIds = (dto.selectedCourseOfferingIds || []).filter(
            (id) => id !== dto.courseOfferingId,
        );

        let selectedCourses: CourseOffering[] = [];

        if (selectedIds.length > 0) {
            selectedCourses = await this.courseOfferingRepo.find({
                where: {
                    id: In(selectedIds),
                    term: {
                        id: currentTermId,
                    },
                },
                relations: {
                    term: true,
                    schedules: true,
                    teacherSubject: {
                        subject: true,
                    },
                },
            });
        }

        const currentSubjectId = courseOffering.teacherSubject?.subject?.id;

        const coursesToCheck = [
            ...registeredCourses.map((r) => r.courseOffering).filter(Boolean),
            ...selectedCourses,
        ];

        for (const oldCourse of coursesToCheck) {
            const oldSubjectId = oldCourse.teacherSubject?.subject?.id;

            if (currentSubjectId && oldSubjectId === currentSubjectId) {
                return {
                    canRegister: false,
                    isConflict: true,
                    reason: 'SAME_SUBJECT_REGISTERED',
                    message: `Bạn đã chọn hoặc đăng ký môn ${oldCourse.teacherSubject.subject.name} trong học kỳ này`,
                    conflictCourseOffering: {
                        id: oldCourse.id,
                        subject: oldCourse.teacherSubject.subject,
                        schedules: oldCourse.schedules,
                    },
                };
            }

            for (const oldSchedule of oldCourse.schedules || []) {
                for (const newSchedule of courseOffering.schedules || []) {
                    const sameDay =
                        oldSchedule.dayOfWeek === newSchedule.dayOfWeek;

                    const conflictTime =
                        oldSchedule.lessonStart <= newSchedule.lessonEnd &&
                        newSchedule.lessonStart <= oldSchedule.lessonEnd;

                    if (sameDay && conflictTime) {
                        return {
                            canRegister: false,
                            isConflict: true,
                            reason: 'SCHEDULE_CONFLICT',
                            message: `Trùng lịch với môn ${oldCourse.teacherSubject.subject.name}`,
                            conflictCourseOffering: {
                                id: oldCourse.id,
                                subject: oldCourse.teacherSubject.subject,
                                schedules: oldCourse.schedules,
                            },
                        };
                    }
                }
            }
        }

        return {
            canRegister: true,
            isConflict: false,
            reason: null,
            message: isDemoUser
                ? 'Demo user có thể đăng ký lớp học phần học kỳ 18'
                : 'Có thể đăng ký lớp học phần này',
            conflictCourseOffering: null,
        };
    }

    async getMyRegistrations(studentUserId: string, query: any) {
        const current = Number(query.current || 1);
        const pageSize = Number(query.pageSize || 10);
        const termId = query.termId ? Number(query.termId) : null;

        const student = await this.studentRepo.findOne({
            where: { user: { id: studentUserId } },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const qb = this.registrationRepo
            .createQueryBuilder('registration')
            .leftJoinAndSelect('registration.courseOffering', 'courseOffering')
            .leftJoinAndSelect('courseOffering.term', 'term')
            .leftJoinAndSelect('courseOffering.schedules', 'schedules')
            .leftJoinAndSelect('schedules.room', 'room')
            .leftJoinAndSelect('courseOffering.adminClass', 'adminClass')
            .leftJoinAndSelect(
                'courseOffering.teacherSubject',
                'teacherSubject',
            )
            .leftJoinAndSelect('teacherSubject.subject', 'subject')
            .leftJoinAndSelect('teacherSubject.teacher', 'teacher')
            .leftJoinAndSelect('teacher.user', 'teacherUser')
            .leftJoinAndSelect('registration.paymentItem', 'paymentItem')
            .leftJoinAndSelect('paymentItem.payment', 'payment')
            .where('registration.studentId = :studentId', {
                studentId: student.id,
            })
            .andWhere('registration.status = :status', {
                status: RegistrationStatus.REGISTERED,
            });

        if (termId) {
            qb.andWhere('term.id = :termId', { termId });
        }

        qb.orderBy('registration.createdAt', 'DESC')
            .skip((current - 1) * pageSize)
            .take(pageSize);

        const [result, total] = await qb.getManyAndCount();

        const data = result.map((item) => ({
            id: item.id,
            status: item.status,
            registeredAt: item.registeredAt,
            isPaid: item.paymentItem?.payment?.status === PaymentStatus.PAID,
            paymentStatus: item.paymentItem?.payment?.status ?? null,
            courseOffering: item.courseOffering,
        }));

        return {
            meta: {
                current,
                pageSize,
                pages: Math.ceil(total / pageSize),
                total,
            },
            result: data,
        };
    }

    async cancel(studentUserId: string, registrationId: number) {
        return await this.dataSource.transaction(async (manager) => {
            const studentRepo = manager.getRepository(Student);
            const registrationRepo = manager.getRepository(CourseRegistration);

            const student = await studentRepo.findOne({
                where: { user: { id: studentUserId } },
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
                    courseOffering: {
                        teacherSubject: {
                            subject: true,
                        },
                    },
                    paymentItem: {
                        payment: true,
                    },
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

            if (
                registration.paymentItem?.payment?.status === PaymentStatus.PAID
            ) {
                throw new BadRequestException(
                    'Không thể hủy môn đã thanh toán học phí',
                );
            }

            registration.status = RegistrationStatus.CANCELLED;
            registration.cancelledAt = new Date();

            await registrationRepo.save(registration);

            return {
                message: 'Hủy đăng ký môn học thành công',
                data: {
                    id: registration.id,
                    status: registration.status,
                    cancelledAt: registration.cancelledAt,
                    courseOfferingId: registration.courseOfferingId,
                    subject:
                        registration.courseOffering?.teacherSubject?.subject ??
                        null,
                },
            };
        });
    }

    async getMyClasses(studentUserId: string) {
        const student = await this.studentRepository.findOne({
            where: {
                user: {
                    id: studentUserId,
                },
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        return this.courseRegistrationRepository
            .createQueryBuilder('registration')
            .leftJoinAndSelect('registration.courseOffering', 'courseOffering')
            .leftJoinAndSelect(
                'courseOffering.teacherSubject',
                'teacherSubject',
            )
            .leftJoinAndSelect('teacherSubject.subject', 'subject')
            .leftJoinAndSelect('teacherSubject.teacher', 'teacher')
            .leftJoinAndSelect('teacher.user', 'teacherUser')
            .leftJoinAndSelect('courseOffering.term', 'term')
            .leftJoinAndSelect('courseOffering.adminClass', 'adminClass')
            .leftJoinAndSelect('courseOffering.schedules', 'schedules')
            .leftJoinAndSelect('schedules.room', 'room')
            .innerJoin('registration.paymentItem', 'paymentItem')
            .innerJoin('paymentItem.payment', 'payment')
            .where('registration.studentId = :studentId', {
                studentId: student.id,
            })
            .andWhere('registration.status = :registrationStatus', {
                registrationStatus: RegistrationStatus.REGISTERED,
            })
            .andWhere('payment.status = :paymentStatus', {
                paymentStatus: PaymentStatus.PAID,
            })
            .orderBy('registration.id', 'DESC')
            .getMany();
    }

    async getMyClassDetail(studentUserId: string, courseId: number) {
        const student = await this.studentRepository.findOne({
            where: {
                user: { id: studentUserId },
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const registration = await this.courseRegistrationRepository
            .createQueryBuilder('registration')
            .leftJoinAndSelect('registration.courseOffering', 'courseOffering')
            .leftJoinAndSelect(
                'courseOffering.teacherSubject',
                'teacherSubject',
            )
            .leftJoinAndSelect('teacherSubject.subject', 'subject')
            .leftJoinAndSelect('teacherSubject.teacher', 'teacher')
            .leftJoinAndSelect('teacher.user', 'teacherUser')
            .leftJoinAndSelect('courseOffering.term', 'term')
            .leftJoinAndSelect('courseOffering.adminClass', 'adminClass')
            .leftJoinAndSelect('courseOffering.schedules', 'schedules')
            .leftJoinAndSelect('schedules.room', 'room')

            // danh sách sinh viên cùng lớp
            .leftJoinAndSelect(
                'courseOffering.courseRegistrations',
                'classRegistrations',
            )
            .leftJoinAndSelect('classRegistrations.student', 'classStudent')
            .leftJoinAndSelect('classStudent.user', 'classStudentUser')

            // tài liệu giáo viên upload
            .leftJoinAndSelect('courseOffering.documents', 'documents')

            // bắt buộc sinh viên hiện tại đã thanh toán
            .innerJoin('registration.paymentItem', 'paymentItem')
            .innerJoin('paymentItem.payment', 'payment')

            .where('registration.studentId = :studentId', {
                studentId: student.id,
            })
            .andWhere('courseOffering.id = :courseId', {
                courseId,
            })
            .andWhere('registration.status = :registrationStatus', {
                registrationStatus: RegistrationStatus.REGISTERED,
            })
            .andWhere('payment.status = :paymentStatus', {
                paymentStatus: PaymentStatus.PAID,
            })
            .orderBy('documents.createdAt', 'DESC')
            .getOne();

        if (!registration) {
            throw new NotFoundException(
                'Không tìm thấy lớp học hoặc bạn chưa thanh toán lớp này',
            );
        }

        return registration;
    }
}
