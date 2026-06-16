import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import {
    AttendanceMethod,
    AttendanceStatus,
    LessonStatus,
    RegistrationStatus,
} from '@/helpers/enum/enum.global';
import { Attendance } from './entities/attendance.entity';

import { Teacher } from '@/users/entities/teacher.entity';
import { CourseRegistration } from '@/course-registration/entities/course-registration.entity';
import { Lesson } from '@/lesson/entities/lesson.entity';

import * as QRCode from 'qrcode';
import * as jwt from 'jsonwebtoken';
import { Student } from '@/users/entities/student.entity';
import {
    GenerateAttendanceQRDto,
    ScanAttendanceQRDto,
} from './dto/create-attendance.dto';

@Injectable()
export class AttendanceService {
    constructor(
        @InjectRepository(Attendance)
        private readonly attendanceRepo: Repository<Attendance>,

        @InjectRepository(Lesson)
        private readonly lessonRepo: Repository<Lesson>,

        @InjectRepository(Teacher)
        private readonly teacherRepo: Repository<Teacher>,

        @InjectRepository(CourseRegistration)
        private readonly registrationRepo: Repository<CourseRegistration>,
        @InjectRepository(Student)
        private readonly studentRepo: Repository<Student>,

        private readonly dataSource: DataSource,
    ) {}

    private async checkTeacherOwnLesson(
        teacherUserId: string,
        lessonId: number,
    ) {
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

        const lesson = await this.lessonRepo.findOne({
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
            throw new ForbiddenException(
                'Bạn không có quyền điểm danh buổi học này',
            );
        }

        return lesson;
    }

    async markManualAttendance(
        teacherUserId: string,
        lessonId: number,
        dto: {
            registrationId: number;
            status: AttendanceStatus;
            note?: string;
        },
    ) {
        const lesson = await this.checkTeacherOwnLesson(
            teacherUserId,
            lessonId,
        );

        if (lesson.status !== LessonStatus.ONGOING) {
            throw new BadRequestException(
                'Chỉ được điểm danh khi buổi học đang diễn ra',
            );
        }

        if (
            ![
                AttendanceStatus.PRESENT,
                AttendanceStatus.ABSENT,
                AttendanceStatus.LATE,
            ].includes(dto.status)
        ) {
            throw new BadRequestException('Trạng thái điểm danh không hợp lệ');
        }

        const registration = await this.registrationRepo.findOne({
            where: {
                id: dto.registrationId,
                courseOfferingId: lesson.courseOfferingId,
                status: RegistrationStatus.REGISTERED,
            },
            relations: {
                student: {
                    user: true,
                },
            },
        });

        if (!registration) {
            throw new NotFoundException(
                'Sinh viên không thuộc lớp học phần này',
            );
        }

        let attendance = await this.attendanceRepo.findOne({
            where: {
                lessonId: lesson.id,
                studentId: registration.studentId,
            },
        });

        if (!attendance) {
            attendance = this.attendanceRepo.create({
                lessonId: lesson.id,
                studentId: registration.studentId,
                registrationId: registration.id,
            });
        }

        attendance.status = dto.status;
        attendance.method = AttendanceMethod.MANUAL;
        attendance.checkedAt = new Date();

        await this.attendanceRepo.save(attendance);

        return {
            message: 'Điểm danh thành công',
            result: {
                id: attendance.id,
                lessonId: attendance.lessonId,
                registrationId: attendance.registrationId,
                studentId: attendance.studentId,
                status: attendance.status,
                method: attendance.method,
                checkedAt: attendance.checkedAt,
            },
        };
    }

    async bulkAttendance(
        teacherUserId: string,
        lessonId: number,
        dto: {
            registrationIds: number[];
            status: AttendanceStatus;
            note?: string;
        },
    ) {
        const lesson = await this.checkTeacherOwnLesson(
            teacherUserId,
            lessonId,
        );

        if (lesson.status !== LessonStatus.ONGOING) {
            throw new BadRequestException(
                'Chỉ được điểm danh khi buổi học đang diễn ra',
            );
        }

        if (
            ![
                AttendanceStatus.PRESENT,
                AttendanceStatus.ABSENT,
                AttendanceStatus.LATE,
            ].includes(dto.status)
        ) {
            throw new BadRequestException('Trạng thái điểm danh không hợp lệ');
        }

        const uniqueRegistrationIds = [...new Set(dto.registrationIds)];

        return this.dataSource.transaction(async (manager) => {
            const registrationRepo = manager.getRepository(CourseRegistration);
            const attendanceRepo = manager.getRepository(Attendance);

            const registrations = await registrationRepo.find({
                where: {
                    id: In(uniqueRegistrationIds),
                    courseOfferingId: lesson.courseOfferingId,
                    status: RegistrationStatus.REGISTERED,
                },
                relations: {
                    student: true,
                },
            });

            if (registrations.length !== uniqueRegistrationIds.length) {
                throw new BadRequestException(
                    'Có sinh viên không thuộc lớp học phần này hoặc chưa đăng ký hợp lệ',
                );
            }

            const studentIds = registrations.map((item) => item.studentId);

            const existedAttendances = await attendanceRepo.find({
                where: {
                    lessonId: lesson.id,
                    studentId: In(studentIds),
                },
            });

            const attendanceMap = new Map(
                existedAttendances.map((item) => [item.studentId, item]),
            );

            const now = new Date();

            const saveItems = registrations.map((registration) => {
                const existed = attendanceMap.get(registration.studentId);

                if (existed) {
                    existed.status = dto.status;
                    existed.method = AttendanceMethod.MANUAL;
                    existed.checkedAt = now;
                    return existed;
                }

                return attendanceRepo.create({
                    lessonId: lesson.id,
                    studentId: registration.studentId,
                    registrationId: registration.id,
                    status: dto.status,
                    method: AttendanceMethod.MANUAL,
                    checkedAt: now,
                });
            });

            const saved = await attendanceRepo.save(saveItems);

            return {
                message: 'Điểm danh hàng loạt thành công',
                result: {
                    total: saved.length,
                    status: dto.status,
                    items: saved.map((item) => ({
                        id: item.id,
                        lessonId: item.lessonId,
                        registrationId: item.registrationId,
                        studentId: item.studentId,
                        status: item.status,
                        method: item.method,
                        checkedAt: item.checkedAt,
                    })),
                },
            };
        });
    }

    /*
    =========================================================
    CREATE QR
    =========================================================
    */

    // async generateAttendanceQR(lessonId: number, teacherUserId: string) {
    //     const lesson = await this.lessonRepo.findOne({
    //         where: { id: lessonId },
    //         relations: {
    //             courseOffering: {
    //                 teacherSubject: {
    //                     teacher: {
    //                         user: true,
    //                     },
    //                 },
    //             },
    //         },
    //     });

    //     if (!lesson) {
    //         throw new NotFoundException('Không tìm thấy buổi học');
    //     }

    //     const ownerId = lesson.courseOffering.teacherSubject.teacher.user.id;

    //     if (ownerId !== teacherUserId) {
    //         throw new ForbiddenException('Bạn không có quyền tạo QR');
    //     }

    //     const expiredAt = Date.now() + 1000 * 60 * 5;

    //     const token = jwt.sign(
    //         {
    //             lessonId,
    //             expiredAt,
    //         },
    //         process.env.JWT_ACCESS_SECRET!,
    //     );

    //     const qrImage = await QRCode.toDataURL(token);

    //     return {
    //         token,
    //         expiredAt,
    //         qrImage,
    //     };
    // }

    async generateAttendanceQR(
        lessonId: number,
        teacherUserId: string,
        dto: GenerateAttendanceQRDto,
    ) {
        const lesson = await this.lessonRepo.findOne({
            where: { id: lessonId },
            relations: {
                courseOffering: {
                    teacherSubject: {
                        teacher: {
                            user: true,
                        },
                    },
                },
            },
        });

        if (!lesson) {
            throw new NotFoundException('Không tìm thấy buổi học');
        }

        const ownerId = lesson.courseOffering.teacherSubject.teacher.user.id;

        if (ownerId !== teacherUserId) {
            throw new ForbiddenException('Bạn không có quyền tạo QR');
        }

        const expiredAt = Date.now() + 1000 * 60 * 5;

        const payload = {
            lessonId: lesson.id,
            courseOfferingId: lesson.courseOffering.id,
            teacherLatitude: dto.latitude ?? null,
            teacherLongitude: dto.longitude ?? null,
            expiredAt,
        };

        const token = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!);

        const qrImage = await QRCode.toDataURL(token);

        return {
            token,
            expiredAt,
            qrImage,
        };
    }

    /*
    =========================================================
    SCAN QR
    =========================================================
    */

    // async scanAttendanceQR(studentUserId: string, token: string) {
    //     let payload: any;

    //     try {
    //         payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    //     } catch (error) {
    //         throw new BadRequestException('QR không hợp lệ');
    //     }

    //     if (Date.now() > payload.expiredAt) {
    //         throw new BadRequestException('QR đã hết hạn');
    //     }

    //     const lessonId = payload.lessonId;

    //     const lesson = await this.lessonRepo.findOne({
    //         where: { id: lessonId },
    //         relations: {
    //             courseOffering: true,
    //         },
    //     });

    //     if (!lesson) {
    //         throw new NotFoundException('Không tìm thấy buổi học');
    //     }

    //     const student = await this.studentRepo.findOne({
    //         where: {
    //             user: {
    //                 id: studentUserId,
    //             },
    //         },
    //         relations: {
    //             user: true,
    //         },
    //     });

    //     if (!student) {
    //         throw new NotFoundException('Không tìm thấy sinh viên');
    //     }
    // }

    async scanAttendanceQR(studentUserId: string, dto: ScanAttendanceQRDto) {
        console.log('\n================ SCAN QR =================');
        console.log('📌 DTO:', dto);
        console.log('📌 Student User ID:', studentUserId);

        if (!dto.token) {
            throw new BadRequestException('Thiếu token QR');
        }

        if (!dto.lessonId) {
            throw new BadRequestException('Thiếu lessonId');
        }

        let payload: any;

        try {
            payload = jwt.verify(dto.token, process.env.JWT_ACCESS_SECRET!);
            console.log('✅ JWT Payload:', payload);
        } catch (error) {
            console.log('❌ JWT ERROR:', error);
            throw new BadRequestException('QR không hợp lệ');
        }

        if (!payload.lessonId) {
            throw new BadRequestException('QR thiếu thông tin buổi học');
        }

        if (!payload.courseOfferingId) {
            throw new BadRequestException('QR thiếu thông tin lớp học');
        }

        if (!payload.expiredAt || Date.now() > Number(payload.expiredAt)) {
            throw new BadRequestException('QR đã hết hạn');
        }

        const dtoLessonId = Number(dto.lessonId);
        const qrLessonId = Number(payload.lessonId);
        const qrCourseOfferingId = Number(payload.courseOfferingId);

        if (!dtoLessonId || Number.isNaN(dtoLessonId)) {
            throw new BadRequestException('lessonId không hợp lệ');
        }

        if (!qrLessonId || Number.isNaN(qrLessonId)) {
            throw new BadRequestException('lessonId trong QR không hợp lệ');
        }

        if (!qrCourseOfferingId || Number.isNaN(qrCourseOfferingId)) {
            throw new BadRequestException(
                'courseOfferingId trong QR không hợp lệ',
            );
        }

        console.log('📌 DTO Lesson ID:', dtoLessonId);
        console.log('📌 QR Lesson ID:', qrLessonId);

        if (dtoLessonId !== qrLessonId) {
            throw new BadRequestException(
                'QR không đúng buổi học bạn đang chọn',
            );
        }

        const hasTeacherLocation =
            payload.teacherLatitude != null && payload.teacherLongitude != null;

        const hasStudentLocation =
            dto.latitude != null && dto.longitude != null;

        if (!hasTeacherLocation) {
            throw new BadRequestException(
                'QR chưa có vị trí tạo mã. Giáo viên cần bật định vị',
            );
        }

        if (!hasStudentLocation) {
            throw new BadRequestException('Bạn cần bật định vị để điểm danh');
        }

        const distance = this.getDistanceMeters(
            Number(payload.teacherLatitude),
            Number(payload.teacherLongitude),
            Number(dto.latitude),
            Number(dto.longitude),
        );

        console.log('📏 Distance:', distance, 'meters');

        if (distance > 100) {
            throw new BadRequestException('Bạn không ở gần vị trí tạo mã QR');
        }

        const lesson = await this.lessonRepo.findOne({
            where: {
                id: qrLessonId,
            },
            relations: {
                courseOffering: {
                    teacherSubject: {
                        subject: true,
                    },
                },
            },
        });

        if (!lesson) {
            throw new NotFoundException('Không tìm thấy buổi học');
        }

        if (
            !lesson.courseOffering ||
            Number(lesson.courseOffering.id) !== qrCourseOfferingId
        ) {
            throw new BadRequestException('QR không đúng lớp học');
        }

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

        const registration = await this.registrationRepo.findOne({
            where: {
                student: {
                    id: student.id,
                },
                courseOffering: {
                    id: lesson.courseOffering.id,
                },
                status: RegistrationStatus.REGISTERED,
            },
            relations: {
                student: true,
                courseOffering: {
                    teacherSubject: {
                        subject: true,
                    },
                },
            },
        });

        if (!registration) {
            throw new ForbiddenException(
                'Bạn không thuộc lớp học của mã QR này',
            );
        }

        if (Number(registration.courseOffering.id) !== qrCourseOfferingId) {
            throw new ForbiddenException(
                'Đăng ký môn học không khớp với mã QR',
            );
        }

        let attendance = await this.attendanceRepo.findOne({
            where: {
                lesson: {
                    id: lesson.id,
                },
                student: {
                    id: student.id,
                },
            },
            relations: {
                registration: {
                    courseOffering: true,
                },
            },
        });

        if (
            attendance?.registrationId &&
            Number(attendance.registrationId) !== Number(registration.id)
        ) {
            throw new ForbiddenException(
                'Điểm danh cũ không thuộc đăng ký môn học của QR này',
            );
        }

        if (attendance) {
            attendance.status = AttendanceStatus.PRESENT;
            attendance.method = AttendanceMethod.QR;
            attendance.registrationId = registration.id;
            attendance.checkedAt = new Date();
        } else {
            attendance = this.attendanceRepo.create({
                lesson,
                student,
                registrationId: registration.id,
                status: AttendanceStatus.PRESENT,
                method: AttendanceMethod.QR,
                checkedAt: new Date(),
            });
        }

        await this.attendanceRepo.save(attendance);

        console.log('✅ Attendance Saved:', attendance.id);
        console.log('================ END SCAN =================\n');

        return {
            message: 'Điểm danh thành công',
            data: attendance,
        };
    }

    private normalizeIp(ip?: string) {
        if (!ip) return '';
        return ip.replace('::ffff:', '').replace('::1', '127.0.0.1');
    }

    private getSubnet(ip: string) {
        const clean = this.normalizeIp(ip);
        const parts = clean.split('.');
        if (parts.length !== 4) return clean;
        return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }

    private isSameWifi(teacherIp: string, studentIp: string) {
        const tIp = this.normalizeIp(teacherIp);
        const sIp = this.normalizeIp(studentIp);

        console.log('Teacher clean IP:', tIp);
        console.log('Student clean IP:', sIp);

        if (tIp === '127.0.0.1' || tIp === '::1') {
            console.log(
                '⚠️ DEV MODE: Teacher dùng localhost, bỏ qua check wifi',
            );
            return true;
        }

        return this.getSubnet(tIp) === this.getSubnet(sIp);
    }
    private getDistanceMeters(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number,
    ) {
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) ** 2;

        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
