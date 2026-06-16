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
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { User } from '@/helpers/decorator/customize';
import type { IUser } from '@/helpers/types/user.interface';

@Controller('schedules')
export class SchedulesController {
    constructor(private readonly schedulesService: SchedulesService) {}

    @Post()
    create(@Body() createScheduleDto: CreateScheduleDto) {
        return this.schedulesService.create(createScheduleDto);
    }

    @Get()
    findAll(
        @Query('current') currentPage = 1,
        @Query('pageSize') limit = 10,
        @Query() qs: string,
    ) {
        return this.schedulesService.findAll(+currentPage, +limit, qs);
    }
    @Get('time-table-teacher')
    getTimeTableTeacher(@User() req: IUser) {
        return this.schedulesService.getTimeTableTeacher(req.id);
    }

    @Get('time-table-student')
    getTimeTableStudent(@User() req: IUser) {
        return this.schedulesService.getTimeTableStudent(req.id);
    }

    @Get('my-timetable')
    async getMyTimeTable(
        @User() user: IUser,
        @Query('date') date?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.schedulesService.getMyTimeTable(user.id, {
            date,
            from,
            to,
        });
    }

    @Get('teacher/today')
    getTodayTeacherSchedules(@User() req: IUser) {
        return this.schedulesService.getTodayTeacherSchedules(req.id);
    }

    @Get('teacher/courses')
    getTeachingCourses(@User() req: IUser) {
        return this.schedulesService.getTeachingCourses(req.id);
    }

    @Get('check-room-available')
    checkRoomAvailable(
        @Query('roomId') roomId: number,
        @Query('lessonStart') lessonStart: number,
        @Query('lessonEnd') lessonEnd: number,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('daysOfWeek') daysOfWeek: string,
    ) {
        return this.schedulesService.checkRoomAvailable({
            roomId: Number(roomId),
            lessonStart: Number(lessonStart),
            lessonEnd: Number(lessonEnd),
            startDate,
            endDate,
            daysOfWeek: daysOfWeek.split(',').map(Number),
        });
    }

    @Get('timetable')
    getMyTimetable(
        @User() req: IUser,
        @Query('date') date?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.schedulesService.getMyTimetableTeacher(
            req.id,
            date,
            from,
            to,
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.schedulesService.findOne(+id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateScheduleDto: UpdateScheduleDto,
    ) {
        return this.schedulesService.update(+id, updateScheduleDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.schedulesService.remove(+id);
    }
}
