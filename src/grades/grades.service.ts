import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { In, Repository } from 'typeorm';
import { Grade } from './entities/grade.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { RegistrationStatus } from '@/helpers/enum/enum.global';
import { Student } from '@/users/entities/student.entity';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { NotificationService } from '@/notification/notification.service';

@Injectable()
export class GradesService {
    constructor(
        @InjectRepository(Grade)
        private readonly gradeRepo: Repository<Grade>,

        @InjectRepository(Student)
        private readonly studentRepo: Repository<Student>,

        @InjectRepository(CourseOffering)
        private readonly courseOfferingRepo: Repository<CourseOffering>,

        private readonly notificationService: NotificationService,
    ) {}
    async updateGrade(teacherUserId: string, dto: UpdateGradeDto) {
        const grade = await this.gradeRepo.findOne({
            where: {
                id: dto.gradeId,
            },
            relations: {
                registration: {
                    student: {
                        user: true,
                    },
                    courseOffering: {
                        teacherSubject: {
                            teacher: {
                                user: true,
                            },
                            subject: true,
                        },
                    },
                },
            },
        });

        if (!grade) {
            throw new NotFoundException('Không tìm thấy bảng điểm');
        }

        const teacherId =
            grade.registration.courseOffering.teacherSubject.teacher.user.id;

        if (teacherId !== teacherUserId) {
            throw new ForbiddenException(
                'Bạn không có quyền nhập điểm lớp này',
            );
        }

        const attendanceScore = Number(grade.attendanceScore || 0);
        const midtermScore = Number(dto.midtermScore);
        const finalScore = Number(dto.finalScore);

        const totalScore = Number(
            (
                attendanceScore * 0.1 +
                midtermScore * 0.3 +
                finalScore * 0.6
            ).toFixed(2),
        );

        grade.midtermScore = midtermScore;
        grade.finalScore = finalScore;
        grade.totalScore = totalScore;
        grade.letterGrade = this.getLetterGrade(totalScore);
        grade.isPassed = totalScore >= 4;

        return this.gradeRepo.save(grade);
    }

    async getMyGrades(userId: string) {
        const student = await this.studentRepo.findOne({
            where: {
                user: {
                    id: userId,
                },
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const grades = await this.gradeRepo.find({
            where: {
                registration: {
                    student: {
                        id: student.id,
                    },
                    status: RegistrationStatus.REGISTERED,
                },
                isPublished: true,
            },
            relations: {
                registration: {
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
            },
            order: {
                updatedAt: 'DESC',
            },
        });

        return grades.map((grade) => {
            const registration = grade.registration;
            const courseOffering = registration.courseOffering;
            const subject = courseOffering.teacherSubject.subject;
            const teacher = courseOffering.teacherSubject.teacher;

            return {
                gradeId: grade.id,
                courseOfferingId: courseOffering.id,
                courseCode: courseOffering.code,
                subjectCode: subject.code,
                subjectName: subject.name,
                credit: subject.credit,
                teacherName: teacher.user?.name,
                term: courseOffering.term,
                attendanceScore: grade.attendanceScore,
                midtermScore: grade.midtermScore,
                finalScore: grade.finalScore,
                totalScore: grade.totalScore,
                letterGrade: grade.letterGrade,
                isPassed: grade.isPassed,
                publishedAt: grade.publishedAt,
            };
        });
    }

    private getLetterGrade(score: number) {
        if (score >= 8.5) return 'A';
        if (score >= 7.0) return 'B';
        if (score >= 5.5) return 'C';
        if (score >= 4.0) return 'D';
        return 'F';
    }

    async getMyResults(userId: string) {
        const student = await this.studentRepo.findOne({
            where: {
                user: {
                    id: userId,
                },
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const grades = await this.gradeRepo.find({
            where: {
                registration: {
                    student: {
                        id: student.id,
                    },
                },
            },
            relations: {
                registration: {
                    courseOffering: {
                        term: true,
                        adminClass: true,
                        teacherSubject: {
                            subject: true,
                            teacher: {
                                user: true,
                            },
                        },
                    },
                },
            },
            order: {
                id: 'DESC',
            },
        });

        return grades.map((grade) => {
            const registration = grade.registration;
            const offering = registration?.courseOffering;
            const teacherSubject = offering?.teacherSubject;
            const subject = teacherSubject?.subject;
            const teacher = teacherSubject?.teacher;

            return {
                id: grade.id,
                registrationId: registration?.id,

                courseOfferingId: offering?.id,
                courseCode: offering?.code,

                subjectId: subject?.id,
                subjectCode: subject?.code,
                subjectName: subject?.name,
                credit: subject?.credit,

                teacherName: teacher?.user?.name,

                termId: offering?.term?.id,
                semester: offering?.term?.semester,
                year: offering?.term?.year,

                adminClassName: offering?.adminClass?.name,

                attendanceScore: Number(grade.attendanceScore ?? 0),
                midtermScore: Number(grade.midtermScore ?? 0),
                finalScore: Number(grade.finalScore ?? 0),
                totalScore: Number(grade.totalScore ?? 0),

                letterGrade: grade.letterGrade,
                isPassed: grade.isPassed,
                isPublished: grade.isPublished,
            };
        });
    }

    // grades.service.ts

    async publishGrades(courseOfferingId: number) {
        const courseOffering = await this.courseOfferingRepo.findOne({
            where: { id: courseOfferingId },
            relations: {
                teacherSubject: {
                    subject: true,
                },
                courseRegistrations: {
                    student: {
                        user: true,
                    },
                    grade: true,
                },
            },
        });

        if (!courseOffering) {
            throw new NotFoundException('Không tìm thấy lớp học phần');
        }

        const registrations = courseOffering.courseRegistrations || [];

        if (!registrations.length) {
            throw new BadRequestException('Lớp chưa có sinh viên đăng ký');
        }

        const registrationIds = registrations.map((item) => item.id);

        await this.gradeRepo.update(
            {
                registrationId: In(registrationIds),
            },
            {
                isPublished: true,
            },
        );

        const studentUserIds = registrations
            .map((item) => item.student?.user?.id)
            .filter((id): id is string => Boolean(id));

        await this.notificationService.sendToUsers(studentUserIds, {
            title: 'Điểm đã được công bố',
            content: `Điểm môn ${courseOffering.teacherSubject.subject.name} đã được công bố`,
            type: 'GRADE',
            referenceType: 'COURSE_OFFERING',
            referenceId: courseOffering.id,
        });

        return {
            message: 'Công bố điểm thành công',
        };
    }

    async getMyStudyResults(
        userId: string,
        query: {
            keyword?: string;
            termId?: number;
        },
    ) {
        const student = await this.studentRepo.findOne({
            where: {
                user: {
                    id: userId,
                },
            },
            relations: {
                user: true,
            },
        });

        if (!student) {
            throw new NotFoundException('Không tìm thấy sinh viên');
        }

        const qb = this.gradeRepo
            .createQueryBuilder('grade')
            .leftJoinAndSelect('grade.registration', 'registration')
            .leftJoinAndSelect('registration.courseOffering', 'courseOffering')
            .leftJoinAndSelect('courseOffering.term', 'term')
            .leftJoinAndSelect(
                'courseOffering.teacherSubject',
                'teacherSubject',
            )
            .leftJoinAndSelect('teacherSubject.subject', 'subject')
            .where('registration.student_id = :studentId', {
                studentId: student.id,
            });

        if (query.termId) {
            qb.andWhere('term.id = :termId', {
                termId: query.termId,
            });
        }

        if (query.keyword?.trim()) {
            const keyword = `%${query.keyword.trim().toLowerCase()}%`;

            qb.andWhere(
                `
                (
                    LOWER(subject.name) LIKE :keyword
                    OR LOWER(subject.code) LIKE :keyword
                    OR LOWER(courseOffering.code) LIKE :keyword
                )
                `,
                { keyword },
            );
        }

        qb.orderBy('term.year', 'DESC')
            .addOrderBy('term.semester', 'DESC')
            .addOrderBy('subject.name', 'ASC');

        const grades = await qb.getMany();

        return grades.map((grade) => {
            const registration = grade.registration;
            const courseOffering = registration?.courseOffering;
            const term = courseOffering?.term;
            const subject = courseOffering?.teacherSubject?.subject;

            return {
                id: grade.id,

                registrationId: registration?.id,
                courseOfferingId: courseOffering?.id,
                courseCode: courseOffering?.code,

                termId: term?.id,
                semester: term?.semester,
                year: term?.year,

                subjectId: subject?.id,
                subjectCode: subject?.code,
                subjectName: subject?.name,
                credit: subject?.credit,

                attendanceScore: grade.isPublished
                    ? Number(grade.attendanceScore || 0)
                    : null,

                midtermScore: grade.isPublished
                    ? Number(grade.midtermScore || 0)
                    : null,

                finalScore: grade.isPublished
                    ? Number(grade.finalScore || 0)
                    : null,

                totalScore: grade.isPublished
                    ? Number(grade.totalScore || 0)
                    : null,

                letterGrade: grade.isPublished ? grade.letterGrade : null,
                isPassed: grade.isPublished ? grade.isPassed : false,
                isPublished: grade.isPublished,
            };
        });
    }
}
