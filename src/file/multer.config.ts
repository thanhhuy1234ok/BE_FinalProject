import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
    MulterModuleOptions,
    MulterOptionsFactory,
} from '@nestjs/platform-express';
import multer from 'multer';
import * as path from 'path';

@Injectable()
export class MulterConfigService implements MulterOptionsFactory {
    createMulterOptions(): MulterModuleOptions {
        return {
            storage: multer.memoryStorage(),

            fileFilter: (_req, file, cb) => {
                const allowed = new Set([
                    '.jpg',
                    '.jpeg',
                    '.png',
                    '.gif',
                    '.pdf',
                    '.doc',
                    '.docx',
                    '.ppt',
                    '.pptx',
                ]);

                const ext = path.extname(file.originalname).toLowerCase();

                if (!allowed.has(ext)) {
                    return cb(
                        new HttpException(
                            'File không hợp lệ. Chỉ cho phép ảnh, PDF, DOC, DOCX, PPT, PPTX',
                            HttpStatus.UNPROCESSABLE_ENTITY,
                        ),
                        false,
                    );
                }

                return cb(null, true);
            },

            limits: {
                fileSize: 20 * 1024 * 1024,
            },
        };
    }
}
