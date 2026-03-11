import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
    MulterModuleOptions,
    MulterOptionsFactory,
} from '@nestjs/platform-express';
import fs from 'fs';
import { diskStorage } from 'multer';
import path, { join } from 'path';

@Injectable()
export class MulterConfigService implements MulterOptionsFactory {
    getRootPath = () => {
        return process.cwd();
    };

    ensureExists(targetDirectory: string) {
        fs.mkdir(targetDirectory, { recursive: true }, (error) => {
            if (!error) {
                console.log(
                    'Directory successfully created, or it already exists.',
                );
                return;
            }
            switch (error.code) {
                case 'EEXIST':
                    // Error:
                    // Requested location already exists, but it's not a directory.
                    break;
                case 'ENOTDIR':
                    // Error:
                    // The parent hierarchy contains a file with the same name as the dir
                    // you're trying to create.
                    break;
                default:
                    // Some other error like permission denied.
                    console.error(error);
                    break;
            }
        });
    }

    createMulterOptions(): MulterModuleOptions {
        return {
            storage: diskStorage({
                // destination: (req: Request, file, cb) => {
                //     // Header keys are case-insensitive; Express exposes helper:
                //     const rawFolder = req.header('folder_type') ?? 'default';
                //     // ✅ sanitize folder name to prevent ../../ path traversal
                //     const safeFolder = rawFolder
                //         .toString()
                //         .trim()
                //         .replace(/[^a-zA-Z0-9_-]/g, ''); // keep only safe chars
                //     const folder = safeFolder || 'default';
                //     const relDir = `public/images/${folder}`;
                //     this.ensureExists(relDir);
                //     cb(null, join(this.getRootPath(), relDir));
                // },
                // filename: (_req: Request, file, cb) => {
                //     const extName = path
                //         .extname(file.originalname)
                //         .toLowerCase();
                //     const baseName = path
                //         .basename(file.originalname, extName)
                //         .replace(/\s+/g, '-')
                //         .replace(/[^a-zA-Z0-9_-]/g, '');
                //     const finalName = `${baseName || 'file'}-${Date.now()}${extName}`;
                //     cb(null, finalName);
                // },
            }),

            fileFilter: (_req: Request, file, cb) => {
                const allowed = new Set([
                    '.jpg',
                    '.jpeg',
                    '.png',
                    '.gif',
                    '.pdf',
                    '.doc',
                    '.docx',
                ]);

                const ext = path.extname(file.originalname).toLowerCase();
                if (!allowed.has(ext)) {
                    return cb(
                        new HttpException(
                            'Invalid file type',
                            HttpStatus.UNPROCESSABLE_ENTITY,
                        ),
                        false,
                    );
                }

                return cb(null, true);
            },

            limits: {
                fileSize: 20 * 1024 * 1024, // ✅ 20MB
            },
        };
    }
}
