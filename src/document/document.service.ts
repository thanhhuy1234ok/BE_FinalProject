import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { CloudinaryService } from '@/file/file.service';
import { Notification } from '@/notification/entities/notification.entity';
import { NotificationService } from '@/notification/notification.service';

@Injectable()
export class DocumentService {
    constructor(
        @InjectRepository(Document)
        private readonly documentRepo: Repository<Document>,

        @InjectRepository(CourseOffering)
        private readonly courseOfferingRepo: Repository<CourseOffering>,

        private readonly notificationService: NotificationService,

        private readonly cloudinaryService: CloudinaryService,
    ) {}
    async uploadCourseOfferingDocument(
        courseOfferingId: number,
        file: Express.Multer.File,
        title?: string,
    ) {
        if (!file) {
            throw new BadRequestException('Vui lòng chọn file');
        }

        const courseOffering = await this.courseOfferingRepo.findOne({
            where: { id: courseOfferingId },
            relations: {
                courseRegistrations: {
                    student: {
                        user: true,
                    },
                },
                teacherSubject: {
                    teacher: {
                        user: true,
                    },
                    subject: true,
                },
            },
        });

        if (!courseOffering) {
            throw new NotFoundException('Không tìm thấy lớp học phần');
        }

        // upload cloudinary
        const uploaded = await this.cloudinaryService.uploadFile(
            file,
            'course-documents',
        );

        const document = this.documentRepo.create({
            title: title || file.originalname,
            fileName: file.originalname,
            fileUrl: uploaded.secure_url,
            publicId: uploaded.public_id,
            fileType: file.mimetype,
            fileSize: file.size,
            courseOfferingId,
        });

        const savedDocument = await this.documentRepo.save(document);

        const studentUserIds = courseOffering.courseRegistrations
            .map((registration) => registration.student?.user?.id)
            .filter((id): id is string => Boolean(id));

        await this.notificationService.sendToUsers(studentUserIds, {
            title: 'Có tài liệu mới',
            content: `Giáo viên vừa tải tài liệu "${file.originalname}" cho môn ${courseOffering.teacherSubject.subject.name}`,
            type: 'DOCUMENT',
            referenceType: 'COURSE_OFFERING',
            referenceId: courseOffering.id,
        });

        return savedDocument;
    }

    async findByCourseOffering(courseOfferingId: number) {
        return await this.documentRepo.find({
            where: { courseOfferingId },
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: number) {
        const document = await this.documentRepo.findOne({
            where: { id },
            relations: {
                courseOffering: {
                    teacherSubject: {
                        subject: true,
                        teacher: {
                            user: true,
                        },
                    },
                    term: true,
                },
            },
        });

        if (!document) {
            throw new NotFoundException('Không tìm thấy tài liệu');
        }

        return document;
    }

    async remove(id: number) {
        const document = await this.documentRepo.findOne({
            where: { id },
        });

        if (!document) {
            throw new NotFoundException('Không tìm thấy tài liệu');
        }

        const isRawFile = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ].includes(document.fileType);

        await cloudinary.uploader.destroy(document.publicId, {
            resource_type: isRawFile ? 'raw' : 'image',
        });

        await this.notificationService.deleteUnreadDocumentNotificationsByFile({
            courseOfferingId: document.courseOfferingId,
            fileName: document.fileName,
        });

        await this.documentRepo.remove(document);

        return {
            message: 'Xóa tài liệu thành công',
        };
    }
}
