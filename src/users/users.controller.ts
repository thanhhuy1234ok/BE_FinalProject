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
import { UsersService } from './users.service';
import { CreateUserDto, ImportStudentExcelDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@/helpers/decorator/customize';
import type { IUser } from '@/helpers/types/user.interface';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Post('/bulk-student')
    createBulkStudent(@Body() createUserDto: ImportStudentExcelDto) {
        return this.usersService.importStudentsExcel(createUserDto);
    }

    @Get('/teachers')
    findTeachers(
        @Query('current') current = 1,
        @Query('pageSize') pageSize = 10,
        @Query() qs: string,
    ) {
        return this.usersService.findTeachers(
            Number(current),
            Number(pageSize),
            qs,
        );
    }
    @Get('/teachers/profile')
    getMyProfile(@User() req: IUser) {
        return this.usersService.getMyProfile(req?.id);
    }

    @Get('dashboard/summary')
    getDashboardSummary(@User() req: IUser) {
        return this.usersService.getSummary(req.id);
    }

    @Get('dashboard/today-schedules')
    getDashboardTodaySchedules(@User() req: IUser) {
        return this.usersService.getTodaySchedules(req.id);
    }

    @Get('dashboard/course-progress')
    getDashboardCourseProgress(@User() req: IUser) {
        return this.usersService.getCourseProgress(req.id);
    }

    @Get('dashboard/latest-grades')
    getDashboardLatestGrades(@User() req: IUser) {
        return this.usersService.getLatestGrades(req.id);
    }

    @Get('dashboard/attendance-overview')
    getDashboardAttendanceOverview(@User() req: IUser) {
        return this.usersService.getAttendanceOverview(req.id);
    }

    @Get('statistics')
    getStatistics() {
        return this.usersService.getStatistics();
    }

    @Get()
    findAll(
        @Query('current') currentPage: string,
        @Query('pageSize') limit: string,
        @Query() qs: string,
    ) {
        return this.usersService.findAll(+currentPage, +limit, qs);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Get(':id/teacher-teaching-overview')
    getTeacherTeachingOverview(@Param('id') id: string) {
        return this.usersService.getTeacherTeachingOverview(id);
    }

    @Get(':id/student-learning-overview')
    getStudentLearningOverview(@Param('id') id: string) {
        return this.usersService.getStudentLearningOverview(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
