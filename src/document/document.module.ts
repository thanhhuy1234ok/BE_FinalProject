import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { MulterModule } from '@nestjs/platform-express';
import { CourseOffering } from '@/course-offering/entities/course-offering.entity';
import { MulterConfigService } from '@/file/multer.config';
import { FileModule } from '@/file/file.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Document, CourseOffering]),
        FileModule,
        NotificationModule,
    ],
    controllers: [DocumentController],
    providers: [DocumentService, MulterConfigService],
    exports: [DocumentService],
})
export class DocumentModule {}
