import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from './multer.config';

@Module({
  controllers: [FileController],
  providers: [],
  imports: [MulterModule.registerAsync({ useClass: MulterConfigService })],
})
export class FileModule { }
