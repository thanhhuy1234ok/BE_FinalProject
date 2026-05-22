import { Inject, Injectable } from '@nestjs/common';
import { v2 as Cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import * as path from 'path';

@Injectable()
export class CloudinaryService {
    constructor(
        @Inject('CLOUDINARY')
        private readonly cloudinary: typeof Cloudinary,
    ) {}

    async uploadFile(file: Express.Multer.File, folder = 'default') {
        const ext = path.extname(file.originalname).toLowerCase();

        const baseName = path
            .basename(file.originalname, ext)
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9_-]/g, '');

        // PDF cho vào image để preview browser được
        const isPdf = ext === '.pdf';

        // DOC/PPT phải raw
        const isRawDocument = ['.doc', '.docx', '.ppt', '.pptx'].includes(ext);

        return new Promise<any>((resolve, reject) => {
            const uploadStream = this.cloudinary.uploader.upload_stream(
                {
                    folder: `school/${folder}`,

                    resource_type: isRawDocument ? 'raw' : 'image',

                    public_id: `${baseName}-${Date.now()}`,

                    use_filename: true,
                    unique_filename: false,

                    format: isPdf ? 'pdf' : undefined,
                },
                (error, result) => {
                    if (error) {
                        return reject(error);
                    }

                    resolve(result);
                },
            );

            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
    }

    async deleteFile(publicId: string, fileType?: string) {
        const isDocument =
            fileType?.includes('pdf') ||
            fileType?.includes('word') ||
            fileType?.includes('document') ||
            fileType?.includes('presentation') ||
            fileType?.includes('powerpoint');

        return this.cloudinary.uploader.destroy(publicId, {
            resource_type: isDocument ? 'raw' : 'image',
        });
    }
}
