import {
    BadRequestException,
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public, ResponseMessage } from '@/helpers/decorator/customize';
import { CloudinaryService } from './file.service';

@Controller('file')
export class FileController {
    constructor(private readonly cloudinaryService: CloudinaryService) {}

    @Public()
    @Post('single')
    @ResponseMessage('Upload Single File')
    @UseInterceptors(FileInterceptor('file'))
    async uploadSingle(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Vui lòng chọn file');
        }

        const uploaded = await this.cloudinaryService.uploadFile(
            file,
            'course-documents',
        );

        return {
            fileName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            url: uploaded.secure_url,
            secureUrl: uploaded.secure_url,
            publicId: uploaded.public_id,
            resourceType: uploaded.resource_type,
        };
    }
}
