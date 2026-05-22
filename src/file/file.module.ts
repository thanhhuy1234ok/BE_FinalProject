import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from './multer.config';
import { CloudinaryProvider } from '@/configs/cloudinary.provider';
import { CloudinaryService } from './file.service';

@Module({
    imports: [
        MulterModule.registerAsync({
            useClass: MulterConfigService,
        }),
    ],

    controllers: [FileController],

    providers: [CloudinaryProvider, CloudinaryService, MulterConfigService],

    exports: [CloudinaryService],
})
export class FileModule {}
