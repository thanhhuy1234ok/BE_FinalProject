import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { AdminClassService } from './admin-class.service';
import { CreateAdminClassDto } from './dto/create-admin-class.dto';
import { UpdateAdminClassDto } from './dto/update-admin-class.dto';

@Controller('admin-class')
export class AdminClassController {
  constructor(private readonly adminClassService: AdminClassService) { }

  @Get('preview')
  preview(@Query('majorId') majorId: string, @Query('yearOfAdmissionId') yearId: string) {
    return this.adminClassService.previewCode(Number(majorId), Number(yearId));
  }
  @Post()
  create(@Body() createAdminClassDto: CreateAdminClassDto) {
    return this.adminClassService.create(createAdminClassDto);
  }

  @Get()
  findAll() {
    return this.adminClassService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminClassService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAdminClassDto: UpdateAdminClassDto,
  ) {
    return this.adminClassService.update(+id, updateAdminClassDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminClassService.remove(+id);
  }


}
