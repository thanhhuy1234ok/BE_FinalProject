import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    CreateLessonDto,
    QueryStudentLessonsDto,
} from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Lesson } from './entities/lesson.entity';
import { In, Repository } from 'typeorm';
import { Schedule } from '@/schedules/entities/schedule.entity';
import {
    LESSON_TIME_MAP,
    LessonStatus,
    RegistrationStatus,
} from '@/helpers/enum/enum.global';
import { Student } from '@/users/entities/student.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import dayjs from 'dayjs';
import { Teacher } from '@/users/entities/teacher.entity';
import { Cron } from '@nestjs/schedule';
import { Attendance } from '@/attendance/entities/attendance.entity';

@Injectable()
export class LessonService {
    constructor(
        @InjectRepository(Lesson)
        private readonly lessonRepository: Repository<Lesson>,

        @InjectRepository(Schedule)
        private readonly scheduleRepository: Repository<Schedule>,

        @InjectRepository(Student)
        private readonly studentRepo: Repository<Student>,

        @InjectRepository(CourseRegistration)
        private readonly registrationRepo: Repository<CourseRegistration>,

        @InjectRepository(Teacher)
        private readonly teacherRepo: Repository<Teacher>,

        @InjectRepository(Attendance)
        private readonly attendanceRepo: Repository<Attendance>,
    ) {}

    async generateBySchedule(scheduleId: number) {
        const schedule = await this.scheduleRepository.findOne({
            where: { id: scheduleId },
        });

        if (!schedule) {
            throw new NotFoundException('Schedule not found');
        }

        const lessons = this.buildLessonsFromSchedule(schedule);

        if (!lessons.length) {
            return [];
        }

        return this.lessonRepository.save(lessons);
    }

    async generateByCourseOffering(courseOfferingId: number) {
        const schedules = await this.scheduleRepository.find({
            where: { courseOfferingId },
            order: {
                dayOfWeek: 'ASC',
                lessonStart: 'ASC',
            },
        });

        if (!schedules.length) {
            throw new NotFoundException(
                'No schedules found for this course offering',
            );
        }

        const allLessons: Lesson[] = [];

        for (const schedule of schedules) {
            const lessons = this.buildLessonsFromSchedule(schedule);
            allLessons.push(...lessons);
        }

        if (!allLessons.length) {
            return [];
        }

        return this.lessonRepository.save(allLessons);
    }

    async regenerateByCourseOffering(courseOfferingId: number) {
        await this.lessonRepository.delete({ courseOfferingId });

        return this.generateByCourseOffering(courseOfferingId);
    }

    async regenerateBySchedule(scheduleId: number) {
        await this.lessonRepository.delete({ scheduleId });

        return this.generateBySchedule(scheduleId);
    }

    async findByCourseOffering(courseOfferingId: number) {
        return this.lessonRepository.find({
            where: { courseOfferingId },
            relations: {
                room: true,
                schedule: true,
            },
            order: {
                date: 'ASC',
                lessonStart: 'ASC',
            },
        });
    }

    async findBySchedule(scheduleId: number) {
        return this.lessonRepository.find({
            where: { scheduleId },
            relations: {
                room: true,
                schedule: true,
            },
            order: {
                date: 'ASC',
                lessonStart: 'ASC',
            },
        });
    }

    private buildLessonsFromSchedule(schedule: Schedule): Lesson[] {
        const lessons: Lesson[] = [];

        if (!schedule.startDate || !schedule.endDate) {
            return lessons;
        }

        const start = new Date(schedule.startDate);
        const end = new Date(schedule.endDate);

        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        for (
            let current = new Date(start);
            current <= end;
            current.setDate(current.getDate() + 1)
        ) {
            const jsDay = current.getDay(); // 0=Sun,1=Mon,...6=Sat
            const systemDay = jsDay === 0 ? 8 : jsDay + 1; // 2=Mon ... 8=Sun

            if (systemDay === schedule.dayOfWeek) {
                const lesson = this.lessonRepository.create({
                    scheduleId: schedule.id,
                    courseOfferingId: schedule.courseOfferingId,
                    roomId: schedule.roomId,
                    date: this.formatDate(current),
                    dayOfWeek: schedule.dayOfWeek,
                    lessonStart: schedule.lessonStart,
                    lessonEnd: schedule.lessonEnd,
                    status: LessonStatus.UPCOMING,
                    isActive: true,
                });

                lessons.push(lesson);
            }
        }

        return lessons;
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    async getLessonsByStudentAndDate(
        studentUserId: string,
        dto: QueryStudentLessonsDto,
    ) {
        const { date, keyword } = dto;

        const student = await this.studentRepo.findOne({
            where: {
                user: { id: studentUserId },
            },
            relations: {
                user: true,
                major: true,
                adminClass: true,
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const registrations = await this.registrationRepo.find({
            where: {
                student: { id: student.id },
                status: RegistrationStatus.REGISTERED,
            },
            relations: {
                courseOffering: true,
            },
        });

        const courseOfferingIds = registrations
            .map((item) => item.courseOffering?.id)
            .filter(Boolean);

        if (!courseOfferingIds.length) {
            return {
                student: {
                    id: student.id,
                    name: student.user?.name,
                    major: student.major?.name,
                    adminClass: student.adminClass?.name,
                },
                date,
                total: 0,
                result: [],
            };
        }

        const qb = this.lessonRepository
            .createQueryBuilder('lesson')
            .leftJoinAndSelect('lesson.room', 'room')
            .leftJoinAndSelect('lesson.schedule', 'schedule')
            .leftJoinAndSelect('lesson.courseOffering', 'courseOffering')
            .leftJoinAndSelect('courseOffering.term', 'term')
            .leftJoinAndSelect('courseOffering.adminClass', 'adminClass')
            .leftJoinAndSelect(
                'courseOffering.teacherSubject',
                'teacherSubject',
            )
            .leftJoinAndSelect('teacherSubject.subject', 'subject')
            .leftJoinAndSelect('teacherSubject.teacher', 'teacher')
            .leftJoinAndSelect('teacher.user', 'teacherUser')
            .where('lesson.isActive = true')
            .andWhere('lesson.date = :date', { date })
            .andWhere('lesson.courseOfferingId IN (:...courseOfferingIds)', {
                courseOfferingIds,
            });

        if (keyword?.trim()) {
            qb.andWhere(
                `
                (
                    subject.name ILIKE :keyword
                    OR subject.code ILIKE :keyword
                    OR courseOffering.code ILIKE :keyword
                    OR teacherUser.name ILIKE :keyword
                    OR room.name ILIKE :keyword
                )
                `,
                { keyword: `%${keyword.trim()}%` },
            );
        }

        qb.orderBy('lesson.dayOfWeek', 'ASC')
            .addOrderBy('lesson.lessonStart', 'ASC')
            .addOrderBy('lesson.id', 'ASC');

        const lessons = await qb.getMany();

        return {
            student: {
                id: student.id,
                name: student.user?.name,
                major: student.major?.name,
                adminClass: student.adminClass?.name,
            },
            date,
            total: lessons.length,
            result: lessons.map((lesson: any) => ({
                id: lesson.id,
                date: lesson.date,
                dayOfWeek: lesson.dayOfWeek,
                lessonStart: lesson.lessonStart,
                lessonEnd: lesson.lessonEnd,
                status: lesson.status,
                room: lesson.room
                    ? {
                          id: lesson.room.id,
                          name: lesson.room.name,
                      }
                    : null,
                schedule: lesson.schedule
                    ? {
                          id: lesson.schedule.id,
                      }
                    : null,
                courseOffering: lesson.courseOffering
                    ? {
                          id: lesson.courseOffering.id,
                          code: lesson.courseOffering.code,
                          term: lesson.courseOffering.term
                              ? {
                                    id: lesson.courseOffering.term.id,
                                    year: lesson.courseOffering.term.year,
                                    semester:
                                        lesson.courseOffering.term.semester,
                                }
                              : null,
                          adminClass: lesson.courseOffering.adminClass
                              ? {
                                    id: lesson.courseOffering.adminClass.id,
                                    name: lesson.courseOffering.adminClass.name,
                                    code: lesson.courseOffering.adminClass.code,
                                }
                              : null,
                          subject: lesson.courseOffering.teacherSubject?.subject
                              ? {
                                    id: lesson.courseOffering.teacherSubject
                                        .subject.id,
                                    name: lesson.courseOffering.teacherSubject
                                        .subject.name,
                                    code: lesson.courseOffering.teacherSubject
                                        .subject.code,
                                }
                              : null,
                          teacher: lesson.courseOffering.teacherSubject?.teacher
                              ? {
                                    id: lesson.courseOffering.teacherSubject
                                        .teacher.id,
                                    name: lesson.courseOffering.teacherSubject
                                        .teacher.user?.name,
                                }
                              : null,
                      }
                    : null,
            })),
        };
    }

    async getTeacherLessonsByDate(teacherUserId: string, date: string) {
        if (!date || !dayjs(date, 'YYYY-MM-DD', true).isValid()) {
            throw new BadRequestException('Ngày không hợp lệ');
        }

        const teacher = await this.teacherRepo.findOne({
            where: {
                user: {
                    id: teacherUserId,
                },
            },
            relations: {
                user: true,
            },
        });

        if (!teacher) {
            throw new NotFoundException('Không tìm thấy giảng viên');
        }

        const lessons = await this.lessonRepository.find({
            where: {
                date,
                isActive: true,
                courseOffering: {
                    teacherSubject: {
                        teacher: {
                            id: teacher.id,
                        },
                    },
                },
            },
            relations: {
                room: true,
                schedule: true,
                courseOffering: {
                    term: true,
                    teacherSubject: {
                        teacher: {
                            user: true,
                        },
                        subject: true,
                    },
                },
            },
            order: {
                lessonStart: 'ASC',
            },
        });

        return {
            result: lessons.map((lesson) => ({
                id: lesson.id,
                date: lesson.date,
                dayOfWeek: lesson.dayOfWeek,
                lessonStart: lesson.lessonStart,
                lessonEnd: lesson.lessonEnd,
                status: lesson.status,
                isActive: lesson.isActive,

                room: lesson.room
                    ? {
                          id: lesson.room.id,
                          name: lesson.room.name,
                      }
                    : null,

                courseOffering: lesson.courseOffering
                    ? {
                          id: lesson.courseOffering.id,
                          code: lesson.courseOffering.code,

                          subject: lesson.courseOffering.teacherSubject?.subject
                              ? {
                                    id: lesson.courseOffering.teacherSubject
                                        .subject.id,
                                    name: lesson.courseOffering.teacherSubject
                                        .subject.name,
                                    code: lesson.courseOffering.teacherSubject
                                        .subject.code,
                                    credit: lesson.courseOffering.teacherSubject
                                        .subject.credit,
                                }
                              : null,

                          teacher: lesson.courseOffering.teacherSubject?.teacher
                              ? {
                                    id: lesson.courseOffering.teacherSubject
                                        .teacher.id,
                                    name:
                                        lesson.courseOffering.teacherSubject
                                            .teacher.user?.name ?? null,
                                }
                              : null,

                          term: lesson.courseOffering.term
                              ? {
                                    id: lesson.courseOffering.term.id,
                                    semester:
                                        lesson.courseOffering.term.semester,
                                    year: lesson.courseOffering.term.year,
                                }
                              : null,
                      }
                    : null,
            })),
        };
    }

    @Cron('*/30 * * * *')
    async updateLessonStatusCron() {
        await this.updateLessonStatuses();
    }

    async updateLessonStatuses() {
        const today = dayjs().format('YYYY-MM-DD');

        const lessons = await this.lessonRepository.find({
            where: {
                date: today,
                isActive: true,
                status: In([LessonStatus.UPCOMING, LessonStatus.ONGOING]),
            },
        });

        for (const lesson of lessons) {
            const nextStatus = this.calculateLessonStatus(lesson);

            if (lesson.status !== nextStatus) {
                lesson.status = nextStatus;
                await this.lessonRepository.save(lesson);
            }
        }
        console.log('Update Status');

        return {
            message: 'Cập nhật trạng thái lesson thành công',
            total: lessons.length,
        };
    }

    private calculateLessonStatus(lesson: Lesson): LessonStatus {
        const startTime = LESSON_TIME_MAP[lesson.lessonStart]?.start;
        const endTime = LESSON_TIME_MAP[lesson.lessonEnd]?.end;

        if (!startTime || !endTime) {
            return LessonStatus.UPCOMING;
        }

        const startAt = dayjs(
            `${lesson.date} ${startTime}`,
            'YYYY-MM-DD HH:mm',
        );

        const endAt = dayjs(`${lesson.date} ${endTime}`, 'YYYY-MM-DD HH:mm');

        const openAt = startAt.subtract(30, 'minute');
        const now = dayjs();

        if (now.isAfter(endAt)) {
            return LessonStatus.COMPLETED;
        }

        if (now.isSame(openAt) || now.isAfter(openAt)) {
            return LessonStatus.ONGOING;
        }

        return LessonStatus.UPCOMING;
    }

    async syncLessonStatus(lesson: Lesson) {
        const nextStatus = this.calculateLessonStatus(lesson);

        if (lesson.status !== nextStatus) {
            lesson.status = nextStatus;
            await this.lessonRepository.save(lesson);
        }

        return lesson;
    }

    async getTeacherLessonDetail(teacherUserId: string, lessonId: number) {
        const teacher = await this.teacherRepo.findOne({
            where: {
                user: {
                    id: teacherUserId,
                },
            },
            relations: {
                user: true,
            },
        });

        if (!teacher) {
            throw new NotFoundException('Không tìm thấy giảng viên');
        }

        const lesson = await this.lessonRepository.findOne({
            where: {
                id: lessonId,
                isActive: true,
                courseOffering: {
                    teacherSubject: {
                        teacher: {
                            id: teacher.id,
                        },
                    },
                },
            },
            relations: {
                room: true,
                schedule: true,
                courseOffering: {
                    term: true,
                    teacherSubject: {
                        teacher: {
                            user: true,
                        },
                        subject: true,
                    },
                },
            },
        });

        if (!lesson) {
            throw new NotFoundException('Không tìm thấy buổi học');
        }

        await this.syncLessonStatus(lesson);

        return {
            result: {
                id: lesson.id,
                date: lesson.date,
                dayOfWeek: lesson.dayOfWeek,
                lessonStart: lesson.lessonStart,
                lessonEnd: lesson.lessonEnd,
                status: lesson.status,
                isActive: lesson.isActive,

                room: lesson.room
                    ? {
                          id: lesson.room.id,
                          name: lesson.room.name,
                      }
                    : null,

                schedule: lesson.schedule
                    ? {
                          id: lesson.schedule.id,
                          dayOfWeek: lesson.schedule.dayOfWeek,
                          lessonStart: lesson.schedule.lessonStart,
                          lessonEnd: lesson.schedule.lessonEnd,
                      }
                    : null,

                courseOffering: lesson.courseOffering
                    ? {
                          id: lesson.courseOffering.id,
                          code: lesson.courseOffering.code,

                          subject: lesson.courseOffering.teacherSubject?.subject
                              ? {
                                    id: lesson.courseOffering.teacherSubject
                                        .subject.id,
                                    name: lesson.courseOffering.teacherSubject
                                        .subject.name,
                                    code: lesson.courseOffering.teacherSubject
                                        .subject.code,
                                    credit: lesson.courseOffering.teacherSubject
                                        .subject.credit,
                                }
                              : null,

                          teacher: lesson.courseOffering.teacherSubject?.teacher
                              ? {
                                    id: lesson.courseOffering.teacherSubject
                                        .teacher.id,
                                    name:
                                        lesson.courseOffering.teacherSubject
                                            .teacher.user?.name ?? null,
                                }
                              : null,

                          term: lesson.courseOffering.term
                              ? {
                                    id: lesson.courseOffering.term.id,
                                    semester:
                                        lesson.courseOffering.term.semester,
                                    year: lesson.courseOffering.term.year,
                                }
                              : null,
                      }
                    : null,
            },
        };
    }

    async getLessonStudents(teacherUserId: string, lessonId: number) {
        const teacher = await this.teacherRepo.findOne({
            where: {
                user: {
                    id: teacherUserId,
                },
            },
        });

        if (!teacher) {
            throw new NotFoundException('Không tìm thấy giảng viên');
        }

        const lesson = await this.lessonRepository.findOne({
            where: {
                id: lessonId,
                isActive: true,
                courseOffering: {
                    teacherSubject: {
                        teacher: {
                            id: teacher.id,
                        },
                    },
                },
            },
            relations: {
                courseOffering: {
                    teacherSubject: {
                        teacher: true,
                    },
                },
            },
        });

        if (!lesson) {
            throw new NotFoundException('Không tìm thấy buổi học');
        }

        const registrations = await this.registrationRepo.find({
            where: {
                courseOfferingId: lesson.courseOfferingId,
                status: RegistrationStatus.REGISTERED,
            },
            relations: {
                student: {
                    user: true,
                },
            },
            order: {
                student: {
                    id: 'ASC',
                },
            },
        });

        const attendances = await this.attendanceRepo.find({
            where: {
                lessonId: lesson.id,
            },
        });

        const attendanceMap = new Map(
            attendances.map((item) => [item.registrationId, item]),
        );

        return {
            result: registrations.map((item) => {
                const attendance = attendanceMap.get(item.id);

                return {
                    registrationId: item.id,
                    student: {
                        id: item.student.id,
                        userId: item.student.user_id,
                        mssv: item.student.mssv,
                        name: item.student.user?.name ?? null,
                        email: item.student.user?.email ?? null,
                    },
                    attendance: attendance
                        ? {
                              id: attendance.id,
                              status: attendance.status,
                              method: attendance.method,
                              checkedAt: attendance.checkedAt,
                          }
                        : {
                              status: 'NOT_ATTENDED',
                              method: null,
                              checkedAt: null,
                              note: null,
                          },
                };
            }),
        };
    }

    async getTeachingSessions(
        userId: string,
        fromDate?: string,
        toDate?: string,
    ) {
        const teacher = await this.teacherRepo.findOne({
            where: {
                user: {
                    id: userId,
                },
            },
            relations: {
                user: true,
            },
        });

        if (!teacher) {
            throw new NotFoundException('Không tìm thấy giáo viên');
        }

        const qb = this.lessonRepository
            .createQueryBuilder('lesson')
            .leftJoinAndSelect('lesson.schedule', 'schedule')
            .leftJoinAndSelect('schedule.room', 'room')
            .leftJoinAndSelect('lesson.courseOffering', 'courseOffering')
            .leftJoinAndSelect('courseOffering.adminClass', 'adminClass')
            .leftJoinAndSelect(
                'courseOffering.teacherSubject',
                'teacherSubject',
            )
            .leftJoinAndSelect('teacherSubject.subject', 'subject')
            .leftJoinAndSelect('teacherSubject.teacher', 'teacher')
            .where('lesson.deletedAt IS NULL')
            .andWhere('teacher.id = :teacherId', {
                teacherId: teacher.id,
            });

        if (fromDate) {
            qb.andWhere('lesson.date >= :fromDate', {
                fromDate,
            });
        }

        if (toDate) {
            qb.andWhere('lesson.date <= :toDate', {
                toDate,
            });
        }

        qb.orderBy('lesson.date', 'ASC');

        const lessons = await qb.getMany();

        return lessons.map((lesson) => {
            const startLesson = LESSON_TIME_MAP[lesson.schedule?.lessonStart];

            const endLesson = LESSON_TIME_MAP[lesson.schedule?.lessonEnd];

            return {
                id: lesson.id,

                subject:
                    lesson.courseOffering?.teacherSubject?.subject?.name ||
                    'Không rõ môn học',

                className:
                    lesson.courseOffering?.adminClass?.code ||
                    lesson.courseOffering?.adminClass?.name ||
                    'Môn chung',

                date: dayjs(lesson.date).format('YYYY-MM-DD'),

                startTime: startLesson?.start || '--:--',

                endTime: endLesson?.end || '--:--',
            };
        });
    }
}
