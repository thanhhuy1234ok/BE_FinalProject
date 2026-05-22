import {
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
} from '@nestjs/common';
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

    @Get('teacher/by-date')
    getTeacherLessonsByDate(@User() req: IUser, @Query('date') date: string) {
        return this.lessonService.getTeacherLessonsByDate(req.id, date);
    }

    @Get('teacher/teaching-sessions')
    getTeachingSessions(
        @User() req: IUser,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        return this.lessonService.getTeachingSessions(req.id, fromDate, toDate);
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

    @Get('teacher/:lessonId/students')
    getLessonStudents(
        @User() req: IUser,
        @Param('lessonId', ParseIntPipe) lessonId: number,
    ) {
        return this.lessonService.getLessonStudents(req.id, lessonId);
    }

    @Get(':lessonId')
    getTeacherLessonDetail(
        @User() req: IUser,
        @Param('lessonId', ParseIntPipe) lessonId: number,
    ) {
        return this.lessonService.getTeacherLessonDetail(req.id, lessonId);
    }
}
