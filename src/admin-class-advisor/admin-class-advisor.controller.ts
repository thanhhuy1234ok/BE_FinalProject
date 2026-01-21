import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AdminClassAdvisorService } from './admin-class-advisor.service';
import { CreateAdminClassAdvisorDto } from './dto/create-admin-class-advisor.dto';
import { UpdateAdminClassAdvisorDto } from './dto/update-admin-class-advisor.dto';

@Controller('admin-class-advisor')
export class AdminClassAdvisorController {
  constructor(private readonly adminClassAdvisorService: AdminClassAdvisorService) {}

  @Post()
  create(@Body() createAdminClassAdvisorDto: CreateAdminClassAdvisorDto) {
    return this.adminClassAdvisorService.create(createAdminClassAdvisorDto);
  }

  @Get()
  findAll() {
    return this.adminClassAdvisorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminClassAdvisorService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdminClassAdvisorDto: UpdateAdminClassAdvisorDto) {
    return this.adminClassAdvisorService.update(+id, updateAdminClassAdvisorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminClassAdvisorService.remove(+id);
  }
}
