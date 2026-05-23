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
import type { IUser } from '@/helpers/types/user.interface';
import { User } from '@/helpers/decorator/customize';

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

    @Get('teacher/my-courses')
    getMyTeachingCourses(@User() req: IUser, @Query('termId') termId?: string) {
        return this.courseOfferingService.getMyTeachingCourses(
            req.id,
            termId ? +termId : undefined,
        );
    }

    @Get('teacher/my-courses/:id')
    getMyTeachingCourseDetail(@User() req: IUser, @Param('id') id: string) {
        return this.courseOfferingService.getMyTeachingCourseDetail(
            req.id,
            +id,
        );
    }
}
