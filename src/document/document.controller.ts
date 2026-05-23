import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    ParseIntPipe,
    UseInterceptors,
    UploadedFile,
    Res,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Public } from '@/helpers/decorator/customize';

@Controller('documents')
export class DocumentController {
    constructor(private readonly documentService: DocumentService) {}

    @Post('course-offering/:courseOfferingId/upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadCourseOfferingDocument(
        @Param('courseOfferingId', ParseIntPipe) courseOfferingId: number,
        @UploadedFile() file: Express.Multer.File,
        @Body('title') title?: string,
    ) {
        const data = await this.documentService.uploadCourseOfferingDocument(
            courseOfferingId,
            file,
            title,
        );

        return {
            statusCode: 201,
            message: 'Upload tài liệu thành công',
            data,
        };
    }

    @Get('course-offering/:courseOfferingId')
    async findByCourseOffering(
        @Param('courseOfferingId', ParseIntPipe) courseOfferingId: number,
    ) {
        const data =
            await this.documentService.findByCourseOffering(courseOfferingId);

        return {
            statusCode: 200,
            message: '',
            data,
        };
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const data = await this.documentService.findOne(id);

        return {
            statusCode: 200,
            message: '',
            data,
        };
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        const data = await this.documentService.remove(id);

        return {
            statusCode: 200,
            message: 'Xóa tài liệu thành công',
            data,
        };
    }
}
