import { HttpExceptionFilter } from '@/helpers/core/http-exception.filter';
import { Public, ResponseMessage } from '@/helpers/decorator/customize';
import { Controller, Post, UploadedFile, UseFilters, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('file')
export class FileController {
  @Public()
  @Post('upload')
  @ResponseMessage('Upload Single File')
  @UseInterceptors(FileInterceptor('fileUpload'))
  @UseFilters(new HttpExceptionFilter())
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log(file.filename)
    return {
      fileName: file.filename,
    };
  }
}
