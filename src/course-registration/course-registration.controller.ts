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
import { User } from '@/helpers/decorator/customize';
import type { IUser } from '@/helpers/types/user.interface';

@Controller('course-registrations')
export class CourseRegistrationController {
    constructor(
        private readonly courseRegistrationService: CourseRegistrationService,
    ) {}
    // @Get('available')
    // async available(@Req() req: any, @Query('termId') termId?: string) {
    //     return this.courseRegistrationService.availableCourseOfferings(
    //         req.user.id,
    //         termId ? +termId : undefined,
    //     );
    // }

    @Get('available')
    async getAvailableForStudent(
        @Query('current') current = '1',
        @Query('pageSize') pageSize = '10',
        @Query() query: Record<string, string>,
        @User() user: IUser,
    ) {
        const qs = new URLSearchParams(query).toString();

        return this.courseRegistrationService.getAvailableForStudent(
            user.id,
            +current,
            +pageSize,
            qs,
        );
    }

    @Get('my')
    async myRegistrations(@Req() req: any, @Query('termId') termId?: string) {
        return this.courseRegistrationService.myRegistrations(
            req.user.id,
            termId ? +termId : undefined,
        );
    }

    @Post()
    async register(@Req() req: any, @Body() dto: CreateCourseRegistrationDto) {
        return this.courseRegistrationService.register(req.user.id, dto);
    }

    @Post('check-conflict')
    checkConflict(
        @User() user: IUser,
        @Body() dto: CheckCourseRegistrationConflictDto,
    ) {
        return this.courseRegistrationService.checkConflict(user.id, dto);
    }

    @Delete(':id')
    async cancel(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.courseRegistrationService.cancel(req.user.id, id);
    }
}
