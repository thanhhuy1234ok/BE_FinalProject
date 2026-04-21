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
import { CourseOfferingService } from './course-offering.service';
import {
    BulkUpdateCourseOfferingStatusDto,
    CreateCourseOfferingDto,
    UpdateCourseOfferingStatusDto,
} from './dto/create-course-offering.dto';
import { UpdateCourseOfferingDto } from './dto/update-course-offering.dto';

@Controller('course-offering')
export class CourseOfferingController {
    constructor(
        private readonly courseOfferingService: CourseOfferingService,
    ) {}

    @Post()
    create(@Body() createCourseOfferingDto: CreateCourseOfferingDto) {
        return this.courseOfferingService.create(createCourseOfferingDto);
    }
    @Post('open-bulk')
    bulkOpenRegistration(@Body() dto: BulkUpdateCourseOfferingStatusDto) {
        return this.courseOfferingService.bulkOpenRegistration(dto);
    }
    @Get()
    findAll(
        @Query('current') currentPage: string,
        @Query('pageSize') limit: string,
        @Query() qs: string,
    ) {
        return this.courseOfferingService.findAll(+currentPage, +limit, qs);
    }
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.courseOfferingService.findOne(+id);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCourseOfferingStatusDto,
    ) {
        return this.courseOfferingService.updateStatus(id, dto.status);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateCourseOfferingDto: UpdateCourseOfferingDto,
    ) {
        return this.courseOfferingService.update(+id, updateCourseOfferingDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.courseOfferingService.remove(+id);
    }
}
