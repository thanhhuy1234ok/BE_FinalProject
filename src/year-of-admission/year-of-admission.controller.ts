import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { YearOfAdmissionService } from './year-of-admission.service';
import { CreateYearOfAdmissionDto } from './dto/create-year-of-admission.dto';
import { UpdateYearOfAdmissionDto } from './dto/update-year-of-admission.dto';

@Controller('year-of-admission')
export class YearOfAdmissionController {
  constructor(
    private readonly yearOfAdmissionService: YearOfAdmissionService,
  ) {}

  @Post()
  create(@Body() createYearOfAdmissionDto: CreateYearOfAdmissionDto) {
    return this.yearOfAdmissionService.create(createYearOfAdmissionDto);
  }

  @Get()
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    return this.yearOfAdmissionService.findAll(+currentPage, +limit, qs);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.yearOfAdmissionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateYearOfAdmissionDto: UpdateYearOfAdmissionDto,
  ) {
    return this.yearOfAdmissionService.update(+id, updateYearOfAdmissionDto);
  }

}
