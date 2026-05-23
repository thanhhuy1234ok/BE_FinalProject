import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Req,
    Query,
    ParseIntPipe,
} from '@nestjs/common';
import { CourseRegistrationService } from './course-registration.service';
import {
    CheckCourseRegistrationConflictDto,
    CreateCourseRegistrationDto,
} from './dto/create-course-registration.dto';
import { UpdateCourseRegistrationDto } from './dto/update-course-registration.dto';
import { ResponseMessage, User } from '@/helpers/decorator/customize';
import type { IUser } from '@/helpers/types/user.interface';

@Controller('course-registrations')
export class CourseRegistrationController {
    constructor(
        private readonly courseRegistrationService: CourseRegistrationService,
    ) {}

    @Post('register')
    registerMany(
        @User() user: IUser,
        @Body() dto: CreateCourseRegistrationDto,
    ) {
        return this.courseRegistrationService.registerMany(user.id, dto);
    }

    @Get('open-offerings')
    @ResponseMessage('Lấy danh sách lớp học phần đang mở thành công')
    getOpenOfferings(@User() user: IUser) {
        return this.courseRegistrationService.getOpenOfferings(user.id);
    }

    @Post('check-conflict')
    checkConflict(
        @User() user: IUser,
        @Body() dto: CheckCourseRegistrationConflictDto,
    ) {
        return this.courseRegistrationService.checkConflict(user.id, dto);
    }

    @Get('registrations-me')
    getMyRegistrations(@User() user: IUser, @Query() query: any) {
        return this.courseRegistrationService.getMyRegistrations(
            user.id,
            query,
        );
    }
    @Get('my-classes')
    async getMyClasses(@User() req: IUser) {
        return this.courseRegistrationService.getMyClasses(req.id);
    }

    @Get('my-classes/:courseId')
    async getMyClassDetail(
        @User() req: IUser,
        @Param('courseId', ParseIntPipe) courseId: number,
    ) {
        return this.courseRegistrationService.getMyClassDetail(
            req.id,
            courseId,
        );
    }

    @Patch(':id/cancel')
    cancel(@User() user: IUser, @Param('id', ParseIntPipe) id: number) {
        return this.courseRegistrationService.cancel(user.id, id);
    }
}
