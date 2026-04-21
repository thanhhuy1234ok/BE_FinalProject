import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    ParseIntPipe,
} from '@nestjs/common';
import { FacultyService } from './faculty.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';

@Controller('faculty')
export class FacultyController {
    constructor(private readonly facultyService: FacultyService) {}

    @Post()
    create(@Body() createFacultyDto: CreateFacultyDto) {
        return this.facultyService.create(createFacultyDto);
    }

    @Get()
    findAll(
        @Query('current') currentPage: string,
        @Query('pageSize') limit: string,
        @Query() qs: string,
    ) {
        return this.facultyService.findAll(+currentPage, +limit, qs);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.facultyService.findOne(+id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateFacultyDto: UpdateFacultyDto,
    ) {
        return this.facultyService.update(+id, updateFacultyDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.facultyService.remove(+id);
    }

    @Get(':id/stats')
    async getFacultyStats(@Param('id', ParseIntPipe) id: number) {
        return await this.facultyService.getFacultyStats(id);
    }
}
