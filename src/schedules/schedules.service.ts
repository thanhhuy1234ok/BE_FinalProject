import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { Repository } from 'typeorm';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { Room } from '@/rooms/entities/room.entity';
import { buildAqpQueryOptions } from '@/helpers/func/buildAqpOptions';
import { CourseOfferingStatus, LessonStatus } from '@/helpers/enum/enum.global';
import { Lesson } from '@/lesson/entities/lesson.entity';

@Injectable()
export class SchedulesService {
    constructor(
        @InjectRepository(Schedule)
        private readonly scheduleRepository: Repository<Schedule>,

        @InjectRepository(CourseOffering)
        private readonly courseOfferingRepository: Repository<CourseOffering>,

        @InjectRepository(Room)
        private readonly roomRepository: Repository<Room>,

        @InjectRepository(Lesson)
        private readonly lessonRepository: Repository<Lesson>,
    ) {}
    // async create(createScheduleDto: CreateScheduleDto) {
    //     const { courseOfferingId, startDate, endDate, slots } =
    //         createScheduleDto;

    //     const isValidDate = (value?: string | Date) => {
    //         if (!value) return false;
    //         const d = new Date(value);
    //         return !isNaN(d.getTime());
    //     };

    //     const isLessonOverlap = (
    //         start1: number,
    //         end1: number,
    //         start2: number,
    //         end2: number,
    //     ) => {
    //         return start1 <= end2 && end1 >= start2;
    //     };

    //     const isDateOverlap = (
    //         start1?: Date | string,
    //         end1?: Date | string,
    //         start2?: Date | string,
    //         end2?: Date | string,
    //     ) => {
    //         if (!start1 || !end1 || !start2 || !end2) return true;

    //         const s1 = new Date(start1);
    //         const e1 = new Date(end1);
    //         const s2 = new Date(start2);
    //         const e2 = new Date(end2);

    //         return s1 <= e2 && e1 >= s2;
    //     };

    //     // 1) Validate cơ bản
    //     if (!isValidDate(startDate)) {
    //         throw new BadRequestException('Ngày bắt đầu không hợp lệ');
    //     }

    //     if (!isValidDate(endDate)) {
    //         throw new BadRequestException('Ngày kết thúc không hợp lệ');
    //     }

    //     if (new Date(startDate) > new Date(endDate)) {
    //         throw new BadRequestException(
    //             'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc',
    //         );
    //     }

    //     if (!slots || slots.length === 0) {
    //         throw new BadRequestException('Phải chọn ít nhất một buổi học');
    //     }

    //     // 2) Kiểm tra lớp học phần
    //     const courseOffering = await this.courseOfferingRepository.findOne({
    //         where: { id: courseOfferingId },
    //         relations: {
    //             teacherSubject: {
    //                 teacher: true,
    //                 subject: true,
    //             },
    //             adminClass: true,
    //             term: true,
    //         },
    //     });

    //     if (!courseOffering) {
    //         throw new NotFoundException('Không tìm thấy lớp học phần');
    //     }

    //     if (
    //         courseOffering.status === CourseOfferingStatus.CLOSED ||
    //         courseOffering.status === CourseOfferingStatus.FINISHED
    //     ) {
    //         throw new BadRequestException(
    //             'Không thể tạo lịch cho lớp học phần đã đóng hoặc đã kết thúc',
    //         );
    //     }

    //     // 3) Kiểm tra thời gian lịch học có nằm trong học kỳ không
    //     if (courseOffering.term) {
    //         const termStart = new Date(courseOffering.term.startDate);
    //         const termEnd = new Date(courseOffering.term.endDate);
    //         const scheduleStart = new Date(startDate);
    //         const scheduleEnd = new Date(endDate);

    //         const formatDate = (date: Date) => date.toLocaleDateString('vi-VN');
    //         const { semester, year } = courseOffering.term;

    //         if (scheduleStart < termStart || scheduleEnd > termEnd) {
    //             throw new BadRequestException(
    //                 `Lịch học phải nằm trong thời gian của kỳ ${semester} - ${year} (${formatDate(termStart)} đến ${formatDate(termEnd)})`,
    //             );
    //         }
    //     }

    //     // 4) Kiểm tra trùng giữa các slot ngay trong cùng request
    //     for (let i = 0; i < slots.length; i++) {
    //         const slot = slots[i];

    //         if (slot.dayOfWeek < 2 || slot.dayOfWeek > 8) {
    //             throw new BadRequestException(
    //                 'Thứ học không hợp lệ. Chỉ nhận giá trị từ 2 đến 8',
    //             );
    //         }

    //         if (slot.lessonStart < 1 || slot.lessonEnd > 15) {
    //             throw new BadRequestException(
    //                 'Tiết học phải nằm trong khoảng từ 1 đến 15',
    //             );
    //         }

    //         if (slot.lessonStart >= slot.lessonEnd) {
    //             throw new BadRequestException(
    //                 'Tiết bắt đầu phải nhỏ hơn tiết kết thúc',
    //             );
    //         }

    //         for (let j = i + 1; j < slots.length; j++) {
    //             const compareSlot = slots[j];

    //             if (
    //                 slot.dayOfWeek === compareSlot.dayOfWeek &&
    //                 isLessonOverlap(
    //                     slot.lessonStart,
    //                     slot.lessonEnd,
    //                     compareSlot.lessonStart,
    //                     compareSlot.lessonEnd,
    //                 )
    //             ) {
    //                 throw new BadRequestException(
    //                     `Các buổi học trong cùng yêu cầu đang bị trùng nhau ở thứ ${slot.dayOfWeek}`,
    //                 );
    //             }
    //         }
    //     }

    //     const schedulesToSave: Schedule[] = [];

    //     // 5) Xử lý từng slot
    //     for (const slot of slots) {
    //         const { roomId, dayOfWeek, lessonStart, lessonEnd } = slot;

    //         // 5.1) Kiểm tra phòng học
    //         let room: Room | null = null;
    //         if (roomId) {
    //             room = await this.roomRepository.findOne({
    //                 where: { id: roomId },
    //             });

    //             if (!room) {
    //                 throw new NotFoundException('Không tìm thấy phòng học');
    //             }

    //             if (room.isActive === false) {
    //                 throw new BadRequestException(
    //                     'Phòng học hiện đang ngưng hoạt động',
    //                 );
    //             }

    //             if (
    //                 room.capacity &&
    //                 courseOffering.maxStudents &&
    //                 room.capacity < courseOffering.maxStudents
    //             ) {
    //                 throw new BadRequestException(
    //                     `Sức chứa phòng (${room.capacity}) không đủ cho sĩ số tối đa của lớp học phần (${courseOffering.maxStudents})`,
    //                 );
    //             }
    //         }

    //         // 5.2) Lấy các lịch cùng thứ để kiểm tra xung đột
    //         const sameDaySchedules = await this.scheduleRepository.find({
    //             where: {
    //                 dayOfWeek,
    //             },
    //             relations: {
    //                 room: true,
    //                 courseOffering: {
    //                     teacherSubject: {
    //                         teacher: true,
    //                         subject: true,
    //                     },
    //                     adminClass: true,
    //                     term: true,
    //                 },
    //             },
    //         });

    //         for (const item of sameDaySchedules) {
    //             const lessonOverlap = isLessonOverlap(
    //                 lessonStart,
    //                 lessonEnd,
    //                 item.lessonStart,
    //                 item.lessonEnd,
    //             );

    //             const dateOverlap = isDateOverlap(
    //                 startDate,
    //                 endDate,
    //                 item.startDate,
    //                 item.endDate,
    //             );

    //             if (!lessonOverlap || !dateOverlap) continue;

    //             // Trùng chính lớp học phần
    //             if (item.courseOfferingId === courseOfferingId) {
    //                 throw new BadRequestException(
    //                     'Lớp học phần này đã có lịch bị trùng trong khung giờ đã chọn',
    //                 );
    //             }

    //             // Trùng phòng học
    //             if (roomId && item.roomId && item.roomId === roomId) {
    //                 throw new BadRequestException(
    //                     `Phòng học đã có lịch trong khung giờ này ở thứ ${dayOfWeek}`,
    //                 );
    //             }

    //             // Trùng giảng viên
    //             if (
    //                 courseOffering.teacherSubject?.teacher?.id &&
    //                 item.courseOffering?.teacherSubject?.teacher?.id &&
    //                 courseOffering.teacherSubject.teacher.id ===
    //                     item.courseOffering.teacherSubject.teacher.id
    //             ) {
    //                 throw new BadRequestException(
    //                     `Giảng viên đã có lịch dạy trong khung giờ này ở thứ ${dayOfWeek}`,
    //                 );
    //             }

    //             // Trùng lớp hành chính
    //             if (
    //                 courseOffering.adminClass?.id &&
    //                 item.courseOffering?.adminClass?.id &&
    //                 courseOffering.adminClass.id ===
    //                     item.courseOffering.adminClass.id
    //             ) {
    //                 throw new BadRequestException(
    //                     `Lớp hành chính đã có lịch học trong khung giờ này ở thứ ${dayOfWeek}`,
    //                 );
    //             }
    //         }

    //         const totalLessons = this.countLessonsInRange(
    //             startDate,
    //             endDate,
    //             dayOfWeek,
    //         );

    //         schedulesToSave.push(
    //             this.scheduleRepository.create({
    //                 courseOfferingId,
    //                 roomId: roomId,
    //                 dayOfWeek,
    //                 lessonStart,
    //                 lessonEnd,
    //                 startDate,
    //                 endDate,
    //                 totalLessons,
    //             }),
    //         );
    //     }

    //     // 6) Lưu nhiều lịch
    //     const createdSchedules =
    //         await this.scheduleRepository.save(schedulesToSave);

    //     // 7) Tạo lịch xong thì chuyển trạng thái sang chờ đăng ký
    //     if (courseOffering.status === CourseOfferingStatus.CREATED) {
    //         await this.courseOfferingRepository.update(courseOffering.id, {
    //             status: CourseOfferingStatus.WAITING_REGISTRATION,
    //         });
    //     }

    //     const totalSessions = createdSchedules.reduce(
    //         (sum, item) => sum + (item.totalLessons ?? 0),
    //         0,
    //     );

    //     return {
    //         message: 'Tạo lịch học thành công',
    //         data: {
    //             schedules: createdSchedules,
    //             totalSchedules: createdSchedules.length,
    //             totalSessions,
    //         },
    //     };
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
    //         textSearchFields: ['name'],
    //         exactFields: [
    //             'dayOfWeek',
    //             'roomId',
    //             'courseOfferingId',
    //             'isActive',
    //         ],
    //         ignoreFilters: ['current', 'pageSize'],
    //         defaultSort: { createdAt: 'DESC' },
    //     });

    //     const totalItems = await this.scheduleRepository.count({
    //         where,
    //     });

    //     const totalPages = Math.ceil(totalItems / pageLimit);

    //     const result = await this.scheduleRepository.find({
    //         where,
    //         relations: {
    //             room: true,
    //             courseOffering: {
    //                 teacherSubject: {
    //                     teacher: {
    //                         user: true,
    //                     },
    //                     subject: true,
    //                 },
    //                 term: true,
    //                 adminClass: true,
    //             },
    //         },
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

    async create(createScheduleDto: CreateScheduleDto) {
        const { courseOfferingId, startDate, endDate, slots } =
            createScheduleDto;

        const isValidDate = (value?: string | Date) => {
            if (!value) return false;
            const d = new Date(value);
            return !isNaN(d.getTime());
        };

        const isLessonOverlap = (
            start1: number,
            end1: number,
            start2: number,
            end2: number,
        ) => {
            return start1 <= end2 && end1 >= start2;
        };

        const isDateOverlap = (
            start1?: Date | string,
            end1?: Date | string,
            start2?: Date | string,
            end2?: Date | string,
        ) => {
            if (!start1 || !end1 || !start2 || !end2) return true;

            const s1 = new Date(start1);
            const e1 = new Date(end1);
            const s2 = new Date(start2);
            const e2 = new Date(end2);

            return s1 <= e2 && e1 >= s2;
        };

        // 1) Validate cơ bản
        if (!isValidDate(startDate)) {
            throw new BadRequestException('Ngày bắt đầu không hợp lệ');
        }

        if (!isValidDate(endDate)) {
            throw new BadRequestException('Ngày kết thúc không hợp lệ');
        }

        if (new Date(startDate) > new Date(endDate)) {
            throw new BadRequestException(
                'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc',
            );
        }

        if (!slots || slots.length === 0) {
            throw new BadRequestException('Phải chọn ít nhất một buổi học');
        }

        // 2) Kiểm tra lớp học phần
        const courseOffering = await this.courseOfferingRepository.findOne({
            where: { id: courseOfferingId },
            relations: {
                teacherSubject: {
                    teacher: true,
                    subject: true,
                },
                adminClass: true,
                term: true,
            },
        });

        if (!courseOffering) {
            throw new NotFoundException('Không tìm thấy lớp học phần');
        }

        if (
            courseOffering.status === CourseOfferingStatus.CLOSED ||
            courseOffering.status === CourseOfferingStatus.FINISHED
        ) {
            throw new BadRequestException(
                'Không thể tạo lịch cho lớp học phần đã đóng hoặc đã kết thúc',
            );
        }

        // 3) Kiểm tra thời gian lịch học có nằm trong học kỳ không
        if (courseOffering.term) {
            const termStart = new Date(courseOffering.term.startDate);
            const termEnd = new Date(courseOffering.term.endDate);
            const scheduleStart = new Date(startDate);
            const scheduleEnd = new Date(endDate);

            const formatDate = (date: Date) => date.toLocaleDateString('vi-VN');
            const { semester, year } = courseOffering.term;

            if (scheduleStart < termStart || scheduleEnd > termEnd) {
                throw new BadRequestException(
                    `Lịch học phải nằm trong thời gian của kỳ ${semester} - ${year} (${formatDate(termStart)} đến ${formatDate(termEnd)})`,
                );
            }
        }

        // 4) Kiểm tra trùng giữa các slot ngay trong cùng request
        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];

            if (slot.dayOfWeek < 2 || slot.dayOfWeek > 8) {
                throw new BadRequestException(
                    'Thứ học không hợp lệ. Chỉ nhận giá trị từ 2 đến 8',
                );
            }

            if (slot.lessonStart < 1 || slot.lessonEnd > 15) {
                throw new BadRequestException(
                    'Tiết học phải nằm trong khoảng từ 1 đến 15',
                );
            }

            if (slot.lessonStart >= slot.lessonEnd) {
                throw new BadRequestException(
                    'Tiết bắt đầu phải nhỏ hơn tiết kết thúc',
                );
            }

            for (let j = i + 1; j < slots.length; j++) {
                const compareSlot = slots[j];

                if (
                    slot.dayOfWeek === compareSlot.dayOfWeek &&
                    isLessonOverlap(
                        slot.lessonStart,
                        slot.lessonEnd,
                        compareSlot.lessonStart,
                        compareSlot.lessonEnd,
                    )
                ) {
                    throw new BadRequestException(
                        `Các buổi học trong cùng yêu cầu đang bị trùng nhau ở thứ ${slot.dayOfWeek}`,
                    );
                }
            }
        }

        const schedulesToSave: Schedule[] = [];

        // 5) Xử lý từng slot
        for (const slot of slots) {
            const { roomId, dayOfWeek, lessonStart, lessonEnd } = slot;

            // 5.1) Kiểm tra phòng học
            let room: Room | null = null;
            if (roomId) {
                room = await this.roomRepository.findOne({
                    where: { id: roomId },
                });

                if (!room) {
                    throw new NotFoundException('Không tìm thấy phòng học');
                }

                if (room.isActive === false) {
                    throw new BadRequestException(
                        'Phòng học hiện đang ngưng hoạt động',
                    );
                }

                if (
                    room.capacity &&
                    courseOffering.maxStudents &&
                    room.capacity < courseOffering.maxStudents
                ) {
                    throw new BadRequestException(
                        `Sức chứa phòng (${room.capacity}) không đủ cho sĩ số tối đa của lớp học phần (${courseOffering.maxStudents})`,
                    );
                }
            }

            // 5.2) Lấy các lịch cùng thứ để kiểm tra xung đột
            const sameDaySchedules = await this.scheduleRepository.find({
                where: {
                    dayOfWeek,
                },
                relations: {
                    room: true,
                    courseOffering: {
                        teacherSubject: {
                            teacher: true,
                            subject: true,
                        },
                        adminClass: true,
                        term: true,
                    },
                },
            });

            for (const item of sameDaySchedules) {
                const lessonOverlap = isLessonOverlap(
                    lessonStart,
                    lessonEnd,
                    item.lessonStart,
                    item.lessonEnd,
                );

                const dateOverlap = isDateOverlap(
                    startDate,
                    endDate,
                    item.startDate,
                    item.endDate,
                );

                if (!lessonOverlap || !dateOverlap) continue;

                if (item.courseOfferingId === courseOfferingId) {
                    throw new BadRequestException(
                        'Lớp học phần này đã có lịch bị trùng trong khung giờ đã chọn',
                    );
                }

                if (roomId && item.roomId && item.roomId === roomId) {
                    throw new BadRequestException(
                        `Phòng học đã có lịch trong khung giờ này ở thứ ${dayOfWeek}`,
                    );
                }

                if (
                    courseOffering.teacherSubject?.teacher?.id &&
                    item.courseOffering?.teacherSubject?.teacher?.id &&
                    courseOffering.teacherSubject.teacher.id ===
                        item.courseOffering.teacherSubject.teacher.id
                ) {
                    throw new BadRequestException(
                        `Giảng viên đã có lịch dạy trong khung giờ này ở thứ ${dayOfWeek}`,
                    );
                }

                if (
                    courseOffering.adminClass?.id &&
                    item.courseOffering?.adminClass?.id &&
                    courseOffering.adminClass.id ===
                        item.courseOffering.adminClass.id
                ) {
                    throw new BadRequestException(
                        `Lớp hành chính đã có lịch học trong khung giờ này ở thứ ${dayOfWeek}`,
                    );
                }
            }

            const totalLessons = this.countLessonsInRange(
                startDate,
                endDate,
                dayOfWeek,
            );

            schedulesToSave.push(
                this.scheduleRepository.create({
                    courseOfferingId,
                    roomId,
                    dayOfWeek,
                    lessonStart,
                    lessonEnd,
                    startDate,
                    endDate,
                    totalLessons,
                }),
            );
        }

        // 6) Lưu nhiều lịch
        const createdSchedules =
            await this.scheduleRepository.save(schedulesToSave);

        // 7) Auto tạo lesson từ các schedule vừa tạo
        const lessonsToSave: Lesson[] = [];

        for (const schedule of createdSchedules) {
            const generatedLessons = this.generateLessonsFromSchedule(schedule);
            lessonsToSave.push(...generatedLessons);
        }

        if (lessonsToSave.length > 0) {
            await this.lessonRepository.save(lessonsToSave);
        }

        // 8) Tạo lịch xong thì chuyển trạng thái sang chờ đăng ký
        if (courseOffering.status === CourseOfferingStatus.CREATED) {
            await this.courseOfferingRepository.update(courseOffering.id, {
                status: CourseOfferingStatus.WAITING_REGISTRATION,
            });
        }

        const totalSessions = createdSchedules.reduce(
            (sum, item) => sum + (item.totalLessons ?? 0),
            0,
        );

        return {
            message: 'Tạo lịch học và lesson thành công',
            data: {
                schedules: createdSchedules,
                totalSchedules: createdSchedules.length,
                totalSessions,
                totalLessonsCreated: lessonsToSave.length,
            },
        };
    }

    async findAll(currentPage: number, limit: number, qs: string) {
        const queryParams = new URLSearchParams(qs);

        const subjectName = queryParams.get('subjectName')?.trim();
        const page = Number(currentPage) > 0 ? Number(currentPage) : 1;
        const pageSize = Number(limit) > 0 ? Number(limit) : 10;
        const skip = (page - 1) * pageSize;

        const qb = this.scheduleRepository
            .createQueryBuilder('schedule')
            .leftJoinAndSelect('schedule.room', 'room')
            .leftJoinAndSelect('schedule.courseOffering', 'courseOffering')
            .leftJoinAndSelect('courseOffering.term', 'term')
            .leftJoinAndSelect('courseOffering.adminClass', 'adminClass')
            .leftJoinAndSelect(
                'courseOffering.teacherSubject',
                'teacherSubject',
            )
            .leftJoinAndSelect('teacherSubject.subject', 'subject')
            .leftJoinAndSelect('teacherSubject.teacher', 'teacher')
            .leftJoinAndSelect('teacher.user', 'user');

        // ✅ filter theo subjectName
        if (subjectName) {
            qb.andWhere('subject.name ILIKE :subjectName', {
                subjectName: `%${subjectName}%`,
            });
        }

        qb.orderBy('schedule.createdAt', 'DESC').skip(skip).take(pageSize);

        const [result, totalItems] = await qb.getManyAndCount();

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

    findOne(id: number) {
        return `This action returns a #${id} schedule`;
    }

    update(id: number, updateScheduleDto: UpdateScheduleDto) {
        return `This action updates a #${id} schedule`;
    }

    remove(id: number) {
        return `This action removes a #${id} schedule`;
    }

    private countLessonsInRange(
        startDate: string | Date,
        endDate: string | Date,
        dayOfWeek: number,
    ): number {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new BadRequestException(
                'Ngày bắt đầu hoặc ngày kết thúc không hợp lệ',
            );
        }

        let count = 0;

        for (
            const current = new Date(start);
            current <= end;
            current.setDate(current.getDate() + 1)
        ) {
            const jsDay = current.getDay(); // CN=0, T2=1...
            const mappedDay = jsDay === 0 ? 8 : jsDay + 1;

            if (mappedDay === dayOfWeek) {
                count++;
            }
        }

        return count;
    }

    private generateLessonsFromSchedule(schedule: Schedule): Lesson[] {
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
            const jsDay = current.getDay(); // 0=CN, 1=T2, ...
            const systemDay = jsDay === 0 ? 8 : jsDay + 1; // 2=T2 ... 8=CN

            if (systemDay === schedule.dayOfWeek) {
                lessons.push(
                    this.lessonRepository.create({
                        scheduleId: schedule.id,
                        courseOfferingId: schedule.courseOfferingId,
                        roomId: schedule.roomId,
                        date: this.formatDateOnly(current),
                        dayOfWeek: schedule.dayOfWeek,
                        lessonStart: schedule.lessonStart,
                        lessonEnd: schedule.lessonEnd,
                        status: LessonStatus.UPCOMING,
                    }),
                );
            }
        }

        return lessons;
    }

    private formatDateOnly(date: Date): string {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');

        return `${year}-${month}-${day}`;
    }
}
