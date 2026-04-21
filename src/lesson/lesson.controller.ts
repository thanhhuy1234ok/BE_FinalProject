import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { ResponseMessage, User } from '@/helpers/decorator/customize';
import { QueryStudentLessonsDto } from './dto/create-lesson.dto';
import type { IUser } from '@/helpers/types/user.interface';

@Controller('lessons')
export class LessonController {
    constructor(private readonly lessonService: LessonService) {}

    @Post('generate/schedule/:scheduleId')
    generateBySchedule(@Param('scheduleId') scheduleId: string) {
        return this.lessonService.generateBySchedule(+scheduleId);
    }

    @Get('my-lessons-by-date')
    @ResponseMessage('Lấy lịch học theo ngày thành công')
    async getMyLessonsByDate(
        @User() user: IUser,
        @Query() query: QueryStudentLessonsDto,
    ) {
        return this.lessonService.getLessonsByStudentAndDate(user.id, query);
    }

    @Post('generate/course-offering/:courseOfferingId')
    generateByCourseOffering(
        @Param('courseOfferingId') courseOfferingId: string,
    ) {
        return this.lessonService.generateByCourseOffering(+courseOfferingId);
    }

    @Delete('regenerate/schedule/:scheduleId')
    regenerateBySchedule(@Param('scheduleId') scheduleId: string) {
        return this.lessonService.regenerateBySchedule(+scheduleId);
    }

    @Delete('regenerate/course-offering/:courseOfferingId')
    regenerateByCourseOffering(
        @Param('courseOfferingId') courseOfferingId: string,
    ) {
        return this.lessonService.regenerateByCourseOffering(+courseOfferingId);
    }

    @Get('course-offering/:courseOfferingId')
    findByCourseOffering(@Param('courseOfferingId') courseOfferingId: string) {
        return this.lessonService.findByCourseOffering(+courseOfferingId);
    }

    @Get('schedule/:scheduleId')
    findBySchedule(@Param('scheduleId') scheduleId: string) {
        return this.lessonService.findBySchedule(+scheduleId);
    }
}
